# Regras de Negócio (canônicas)

Este documento centraliza as regras de produto e negócio **implementadas** no Alto Mar.  
Fonte de implementação: `server/index.js`, módulos em `server/stripe/` e `server/notifications/`, e fluxos correspondentes no frontend.

Documentos relacionados:

- [`STRIPE-INTEGRATION-DESIGN.md`](./STRIPE-INTEGRATION-DESIGN.md) — desenho técnico Stripe Connect
- [`BACKEND-API-CONTRACT.md`](./BACKEND-API-CONTRACT.md) — contratos de API
- [`TEST-PLAYBOOK.md`](./TEST-PLAYBOOK.md) — checklist de regressão

---

## Índice

1. [Papéis e acesso](#1-papéis-e-acesso)
2. [Ciclo de vida da reserva](#2-ciclo-de-vida-da-reserva)
3. [Criação de reserva](#3-criação-de-reserva)
4. [Pagamento](#4-pagamento)
5. [Aceite e recusa do locador](#5-aceite-e-recusa-do-locador)
6. [Cancelamento pelo banhista](#6-cancelamento-pelo-banhista)
7. [Cancelamento pelo locador](#7-cancelamento-pelo-locador)
8. [Remarcação](#8-remarcação)
9. [Repasse ao locador (Stripe Connect)](#9-repasse-ao-locador-stripe-connect)
10. [Conclusão do passeio](#10-conclusão-do-passeio)
11. [Avaliações](#11-avaliações)
12. [Calendário e disponibilidade](#12-calendário-e-disponibilidade)
13. [Notificações](#13-notificações)
14. [Financeiro e auditoria](#14-financeiro-e-auditoria)
15. [Comissões e taxas](#15-comissões-e-taxas)
16. [Configuração operacional](#16-configuração-operacional)

---

## 1) Papéis e acesso

| Papel | API (`role`) | Capacidades principais |
|-------|--------------|------------------------|
| **Banhista** | `banhista` | Reservar, pagar, editar/cancelar as próprias reservas, avaliar embarcação após passeio |
| **Locador** | `locatario` | Gerir embarcações, aceitar/recusar reservas, cancelar, iniciar repasse Stripe, concluir passeio |

- Endpoints autenticados exigem JWT válido e o papel correcto (`requireAuth`, `requireRole`).
- Cada utilizador só acede aos seus próprios dados de reserva (renter ou owner conforme o endpoint).

---

## 2) Ciclo de vida da reserva

### Estados (`bookings.status`)

| Status | Significado |
|--------|-------------|
| `PENDING` | Reserva criada; aguarda pagamento (Stripe) e/ou decisão do locador |
| `ACCEPTED` | Locador aceitou; passeio confirmado |
| `DECLINED` | Locador recusou |
| `CANCELLED` | Cancelada (banhista, locador ou plataforma) |
| `COMPLETED` | Passeio concluído |

### Regras gerais

- Toda reserva **nasce como `PENDING`**.
- **Pagamento aprovado não altera o status** da reserva por si só; actualiza apenas o financeiro (`payments`, `stripe_flow_status`).
- Reservas `DECLINED`, `CANCELLED` e `COMPLETED` **não podem ser editadas** pelo banhista.

---

## 3) Criação de reserva

### Antecedência mínima

- O banhista **não pode reservar hoje nem amanhã**.
- Primeira data permitida: **hoje + 2 dias corridos** (`BANHISTA_MIN_CALENDAR_LEAD_DAYS = 2`).
- Validado no servidor (`assertBanhistaBookingLead`) e replicado no calendário da UI.

### Validações obrigatórias

- **Capacidade:** `passengersAdults + passengersChildren` ≤ capacidade da embarcação.
- **Disponibilidade:** o dia só fica indisponível para **nova** reserva se existir reserva **`ACCEPTED`** ou **`COMPLETED`** no mesmo barco/data, ou bloqueio do locador (data ou dia da semana). Reservas **`PENDING`** — pagas ou não — **não bloqueiam** a diária; vários banhistas podem pedir o mesmo dia em paralelo.
- **Opcionais:**
  - Kit churrasco só se a embarcação o oferece (`bbq_offered`).
  - Moto aquática só se `jet_ski_offered`.
  - Opcionais personalizados validados contra o catálogo do barco.
- **Total:** o servidor recalcula o preço (`expectedBookingTotalCents`) e rejeita se `totalCents` enviado pelo cliente não coincidir.
- **Embarque:** local e horário validados contra as opções configuradas na embarcação (`assertBookingEmbarkChoices`).
- **Dias repetidos:** numa reserva multi-dia, cada data só pode aparecer uma vez.

### Reserva multi-dia

- Vários dias de passeio geram **uma única reserva** com **pagamento único** (total consolidado).
- Detalhes por dia ficam em `booking_days` (opcionais, roteiro e subtotal por dia).
- A data principal em `bookings.booking_date` é a do primeiro dia.

### Após criação

- A reserva fica **`PENDING`**; **não** notifica o locador neste momento.
- O locador só passa a ver e ser notificado após **pagamento `APPROVED`** (notificação `BOOKING_PAYMENT_RECEIVED`).

---

## 4) Pagamento

### Provider activo

- Definido por `PAYMENTS_PROVIDER` no servidor: `stripe` ou `mercadopago`.
- Exposto ao cliente via `GET /api/public/app-config` (`paymentsProvider`).
- Mercado Pago fica desactivado quando `PAYMENTS_PROVIDER=stripe`.

### Stripe (modo principal)

| Regra | Detalhe |
|-------|---------|
| Quando pagar | Banhista pode pagar com reserva **`PENDING`** ou **`ACCEPTED`** |
| Efeito no status | Pagamento **`APPROVED`** actualiza `payments` e `stripe_flow_status`; **não muda** `bookings.status` |
| Pré-requisito do locador | Conta **Stripe Connect** activa (`charges_enabled` + `payouts_enabled`) |
| Aceite bloqueado | Em modo Stripe, locador **só aceita** se `payments.status = APPROVED` |
| Visibilidade locador | Reserva **`PENDING`** só aparece no painel do locador com **`payments.status = APPROVED`** |
| Ocupação da diária | Pagamento aprovado + reserva **`PENDING`** **não bloqueia** o dia para outros banhistas |
| Checkout | Sessão Stripe Checkout; webhook `checkout.session.completed` é fonte de verdade |
| App nativo | Checkout abre em browser/Custom Tab; retorno sincroniza via `POST /api/stripe/sync-checkout-session` |

### Mercado Pago

- Fluxo legado: preferência MP após criar reserva; redirect externo.
- Indisponível quando Stripe está activo.

### Comissão no pagamento

- No checkout Stripe, o total cobrado ao banhista inclui o valor integral do serviço.
- A plataforma retém a comissão; o valor líquido do locador (`owner_net_cents`) é repassado mais tarde (secção 9).

---

## 5) Aceite e recusa do locador

### Aceite (`POST /api/owner/bookings/:id/accept`)

- Só em reserva **`PENDING`** pertencente ao locador, **visível** (pagamento aprovado).
- Em modo Stripe: exige pagamento **`APPROVED`** antes de aceitar.
- Não aceita se já existir reserva **`ACCEPTED`** ou **`COMPLETED`** no **mesmo barco e mesma data** (outras **`PENDING`** no mesmo dia **não impedem** o aceite).
- Ao aceitar:
  - Status passa a **`ACCEPTED`**.
  - Outras reservas **`PENDING`** do mesmo barco/data são **canceladas automaticamente** pela plataforma.
  - Se canceladas estiverem pagas (Stripe): **reembolso** + `renter_notice_code = SAME_DAY_OTHER_ACCEPTED`.
  - Banhista da reserva aceite recebe notificação; banhistas das canceladas também são notificados.

### Recusa (`POST /api/owner/bookings/:id/decline`)

- Só em reserva **`PENDING`**.
- Se reserva paga (Stripe): **reembolso integral** ao banhista.
- Status passa a **`DECLINED`**; `renter_notice_code = OWNER_DECLINED_REFUND` quando houve reembolso.

---

## 6) Cancelamento pelo banhista

Endpoint: `POST /api/renter/bookings/:id/cancel`.

| Status actual | Justificativa | Reembolso |
|---------------|---------------|-----------|
| **`PENDING`** | Opcional | Conforme pagamento (Stripe: reembolso se pago) |
| **`ACCEPTED`** | **Obrigatória** (mín. **10 caracteres**) | Política abaixo (Stripe) |

### Política de reembolso (Stripe, reserva aceita e paga)

Calculada com base nas **horas até ao início do passeio** (`booking_date` + `embark_time`, default 09:00):

| Antecedência | Reembolso ao banhista | Código de aviso |
|--------------|----------------------|-----------------|
| **≥ 7 dias** (168 h) | Total **menos taxas não reembolsáveis** (comissão plataforma + taxa gateway estimada) | `RENTER_CANCEL_FULL_FEE_DEDUCTED` |
| **≥ 2 dias e < 7 dias** (48 h – 167 h) | **50%** do valor | `RENTER_CANCEL_PARTIAL_50` |
| **< 48 h** | **Sem reembolso** | `RENTER_CANCEL_NO_REFUND_LT48H` |

- Justificativa e política aplicada ficam em `bookings.decision_note`.
- Aviso institucional exibido no painel do banhista via `renter_notice_code` + i18n.

### Reserva multi-dia / grupo

- O cliente pode cancelar um dia ou o passeio completo (grupo `booking_group_id`); cada dia é uma reserva independente para cancelamento.

---

## 7) Cancelamento pelo locador

Endpoint: `POST /api/owner/bookings/:id/cancel`.  
Só em reserva **`ACCEPTED`**. Justificativa **obrigatória** (mín. **10 caracteres**).

| Cenário (`scenario`) | Reembolso banhista | Penalidade locador |
|----------------------|-------------------|-------------------|
| **`owner`** — cancelamento pelo locador | **100%** | Multa **20%** sobre `owner_net_cents` |
| **`weather`** — condições climáticas | **100%** | **Sem** penalidade |
| **`boat_failure`** — falha na embarcação | **100%** | Multa **20%** sobre `owner_net_cents` |

- Penalidades registadas em `stripe_owner_penalties` e deduzidas no próximo repasse.
- Banhista notificado; aviso via `renter_notice_code` (`OWNER_CANCEL_REFUND`, `OWNER_CANCEL_WEATHER`, `OWNER_CANCEL_BOAT_FAILURE`).

---

## 8) Remarcação

Endpoint: `PATCH /api/renter/bookings/:id`.

- Permitida em reservas **`PENDING`** ou **`ACCEPTED`** (não concluídas/canceladas/recusadas).
- Alterar **passageiros, opcionais, embarque** — sem formulário de remarcação.
- Alterar **data** numa reserva **`ACCEPTED`** exige formulário de remarcação:

| Campo | Regra |
|-------|-------|
| Motivo | Um de: `BAD_WEATHER`, `NAVIGATION_RISK`, `OPERATIONAL_IMPEDIMENT`, `AUTHORITY_ORDER`, `SAFETY_FACTOR`, `OTHER` |
| Título | Mín. **3 caracteres** |
| Texto | Mín. **10 caracteres** |
| Anexos | Até **8** imagens (opcional) |

- Nova data respeita antecedência mínima (hoje + 2) e disponibilidade do barco.
- Locador recebe notificação **Reagendamento** (`BOOKING_RESCHEDULED`).
- Dados persistidos em `reschedule_reason`, `reschedule_title`, `reschedule_note`, `reschedule_attachments`.

---

## 9) Repasse ao locador (Stripe Connect)

Modelo: **cobrança na plataforma + transferência no evento** (separate charges and transfers).

| Regra | Detalhe |
|-------|---------|
| Quem recebe primeiro | Plataforma (pagamento do banhista) |
| Quando repassa | Locador clica **Iniciar passeio / repasse** no **dia da reserva** |
| Pré-requisitos | Reserva **`ACCEPTED`**; `stripe_flow_status = PAID` (ou `TRANSFER_FAILED` para retry); pagamento **`APPROVED`**; Connect activo |
| Processamento | Assíncrono — fila PostgreSQL + cron (`transferWorker`); confirmação via webhook **`transfer.paid`** |
| Penalidades | Deduzidas do valor transferido (`owner_net_cents` − penalidades pendentes) |
| Idempotência | Não duplica transfer se já existe `PENDING`, `PROCESSING` ou `PAID` |
| Falha | Webhook `transfer.failed`; locador pode tentar novamente; notificação `TRANSFER_FAILED` |
| Conclusão automática | Após `transfer.paid`, passeio marcado **`COMPLETED`** e banhista notificado |

---

## 10) Conclusão do passeio

Endpoint: `POST /api/owner/bookings/:id/complete`.

| Modo de pagamento | Regra |
|-------------------|-------|
| **Stripe pago** | **Não** usar conclusão manual — usar **Iniciar passeio / repasse**; conclusão ocorre após `transfer.paid` |
| **Outros** (ex.: MP, sem repasse Stripe) | Locador pode marcar **`COMPLETED`** |

### Data permitida para conclusão manual

- Só no **dia do passeio ou depois** (não antes).
- Validado por `assertOwnerCanCompleteBooking`.

---

## 11) Avaliações

- Banhista pode avaliar a embarcação após reserva **`COMPLETED`**.
- Escala: **1–5 estrelas**; comentário opcional (máx. 1000 caracteres).
- Uma avaliação por reserva; não permite repetir.
- Média actualiza `boats.rating` e `users.guest_rating` (nota do banhista como hóspede).

---

## 12) Calendário e disponibilidade

### Bloqueios do locador (por embarcação)

| Tipo | Efeito |
|------|--------|
| **Data específica** (`boat_date_locks`) | Impede reserva nesse dia |
| **Dia da semana** (`boat_weekday_locks`) | Impede reserva em todos os dias dessa semana |

### Ocupação

- Um barco só **bloqueia** a data para novas reservas com status **`ACCEPTED`** ou **`COMPLETED`**.
- Várias reservas **`PENDING`** (com pagamento aprovado) podem coexistir no **mesmo barco e mesma data**; ao aceitar uma, as restantes **`PENDING`** são canceladas (secção 5).
- Reservas multi-dia ocupam cada dia listado em `booking_days` quando **`ACCEPTED`** ou **`COMPLETED`**.

---

## 13) Notificações

### Eventos que geram notificação in-app (e push FCM quando configurado)

| Evento | Destinatário | Quando |
|--------|--------------|--------|
| Pagamento confirmado | Locador | Primeiro contacto do locador com a reserva (substitui aviso na criação) |
| Reserva aceite / recusada | Banhista | Após decisão do locador |
| Cancelamento (banhista ou locador) | Contraparte | Após cancelamento |
| Reagendamento | Locador | Banhista altera data em reserva aceite |
| Conflito mesmo dia (outra aceite) | Banhista cancelado | Locador aceita outra reserva no mesmo dia |
| Repasse concluído / falhou | Locador | Webhook Stripe transfer |
| Passeio concluído | Banhista | Após transferência ou conclusão manual |

### Leitura e badges

- Notificações não lidas incrementam contador global (sino) e badge na secção **Reservas** do painel locador.
- Ao **visitar** `/marinheiro/reservas`, ficha de reserva ou `/conta/reservas`, avisos relacionados são **marcados como lidos** (`POST /api/notifications/mark-visit`).
- Ao **clicar** numa notificação no sino, marca como lida e navega para `path`.
- Notificações já lidas aparecem visualmente mais apagadas na lista do sino.

---

## 14) Financeiro e auditoria

| Regra | Detalhe |
|-------|---------|
| Status `REFUNDED` | Apenas quando estorno é **total** |
| Estorno parcial | `payments.status` permanece **`APPROVED`**; valor em `stripe_connect_refunds` |
| Idempotência | Webhooks Stripe, checkout, repasses e reembolsos tratam eventos duplicados de forma segura |
| Ledger | Movimentos financeiros registados em `stripe_connect_ledger` |
| Webhooks | Fonte de verdade para pagamento e repasse; sync pós-redirect é fallback (dev/local) |

### Fluxo financeiro Stripe (`stripe_flow_status`)

Referência: `server/stripe/flowStatus.js`. Estados principais: `CHECKOUT_PENDING` → `PAID` → `TRANSFER_PENDING` / `TRANSFER_PROCESSING` → transferência confirmada.

---

## 15) Comissões e taxas

| Item | Valor default | Configuração |
|------|---------------|--------------|
| **Comissão plataforma** | **15%** do total | `PLATFORM_FEE_PERCENT` |
| **Taxa Stripe estimada (reembolso)** | 2,9% + R$ 0,60 | `STRIPE_CARD_FEE_PERCENT`, `STRIPE_CARD_FEE_FIXED_CENTS` |
| **Valor líquido locador** | Total − comissão plataforma | `owner_net_cents` persistido na reserva |

- Split calculado em `server/stripe/fees.js` (`splitPlatformOwnerNet`).
- Penalidade de cancelamento injustificado do locador: **20%** de `owner_net_cents`.

---

## 16) Configuração operacional

### PIX (Stripe)

- Suportado no backend quando `STRIPE_PIX_ENABLED=1` e PMC activo.
- Pode ficar **temporariamente indisponível** na UI por decisão operacional (`PIX_TEMP_UNAVAILABLE` no frontend).
- Reativação deve respeitar flags Stripe e variáveis de ambiente (`STRIPE_SKIP_PIX_PMC`, etc.).

### Variáveis de ambiente relevantes

| Variável | Efeito |
|----------|--------|
| `PAYMENTS_PROVIDER` | `stripe` ou `mercadopago` |
| `PLATFORM_FEE_PERCENT` | Comissão da plataforma (default 15) |
| `STRIPE_PIX_ENABLED` | Inclui PIX no Checkout |
| `FRONTEND_URL` | URLs de retorno Stripe Checkout e Connect onboarding |

---

## 17) Chat por reserva (banhista ↔ locador)

| Regra | Detalhe |
|-------|---------|
| Disponibilidade | **Apenas** com reserva **ACCEPTED** (confirmada pelo locador) |
| Conteúdo | Texto plano (1–2000 caracteres); **sem anexos** |
| Após fim | **COMPLETED**, **CANCELLED**, **DECLINED** ou **PENDING** → chat **indisponível** (sem botão, sem API) |
| Bloqueado | Qualquer estado que não seja `ACCEPTED` |
| Anti-desintermediação | Servidor rejeita telefones, e-mails, URLs, @handles e palavras-chave (`whatsapp`, `pix`, etc.) |
| Notificação | Cada mensagem nova → `BOOKING_MESSAGE` in-app + push FCM |
| Participantes | Apenas `renter_user_id` e `owner_user_id` da reserva |
| Rate limit | 30 mensagens/hora por utilizador e reserva; mínimo 2 s entre envios |

### API

| Método | Rota |
|--------|------|
| GET | `/api/bookings/:id/chat/meta` |
| GET | `/api/bookings/:id/chat/messages` |
| POST | `/api/bookings/:id/chat/messages` |
| POST | `/api/bookings/:id/chat/read` |
| GET | `/api/chat/unread-summary` |

Implementação: `server/chat/` · UI: **mobile** → página `/conta/reservas/:id/chat` ou `/marinheiro/reservas/:id/chat` (voltar à reserva); **desktop** → popup (`BookingChatDialog`) na ficha da reserva.

---

## Legenda de códigos de aviso ao banhista (`renter_notice_code`)

| Código | Situação |
|--------|----------|
| `SAME_DAY_OTHER_ACCEPTED` | Outra reserva aceite no mesmo dia/barco |
| `OWNER_DECLINED_REFUND` | Locador recusou; reembolso |
| `RENTER_CANCEL_FULL_FEE_DEDUCTED` | Cancelamento banhista ≥ 7 dias; taxas deduzidas |
| `RENTER_CANCEL_PARTIAL_50` | Cancelamento banhista 2–6 dias; 50% |
| `RENTER_CANCEL_NO_REFUND_LT48H` | Cancelamento banhista < 48 h; sem reembolso |
| `OWNER_CANCEL_REFUND` | Locador cancelou; reembolso integral |
| `OWNER_CANCEL_WEATHER` | Cancelamento por clima; reembolso integral |
| `OWNER_CANCEL_BOAT_FAILURE` | Falha na embarcação; reembolso integral |

Textos apresentados ao utilizador via i18n (`reservasConta.notice*`).

---

## Manutenção deste documento

- Alterações de regra de negócio devem actualizar **este ficheiro** e os testes/playbook associados.
- Implementação canónica: preferir funções centralizadas (`cancellationPolicy.js`, `fees.js`, `bookingEvents.js`) em vez de duplicar lógica nos endpoints.
