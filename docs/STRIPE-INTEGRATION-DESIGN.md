# Alto Mar — Desenho de integração Stripe (reserva + checkout)

Documento de referência para alinhar o fluxo de pagamento Stripe ao que já existe com Mercado Pago (`Reservar` → `POST /api/bookings` → checkout externo).

---

## 1. Fluxo actual (Mercado Pago — resumo)

1. Banhista confirma no front (`Reservar.tsx`).
2. Front chama `POST /api/bookings` (JWT) → API cria reserva em estado **PENDING** na PostgreSQL.
3. Front chama `POST /api/mercadopago/preference` com `bookingId`, valor, dados do pagador.
4. API cria **preferência** no MP; devolve `init_point` / `sandbox_init_point`.
5. Front abre essa URL (nova janela ou mesmo separador).
6. Pagamento concluído no site do Mercado Pago; `back_urls` redireccionam para `/reservar/sucesso`, `/reservar/erro`, `/reservar/pendente`.

---

## 2. Fluxo proposto — Stripe Checkout (recomendado)

Espelha o MP: redirect para página hospedada pelo Stripe (menos PCI no teu código).

1. Banhista confirma no front.
2. `POST /api/bookings` → reserva **PENDING**, resposta com `bookingId`.
3. `POST /api/stripe/checkout-session` (JWT) com `bookingId` (e validação no servidor do valor `total_cents` da reserva).
4. API chama `checkout.sessions.create` com:
   - `metadata.booking_id` e/ou `client_reference_id` = UUID da reserva;
   - `success_url` / `cancel_url` usando `FRONTEND_URL` (ex.: `/reservar/sucesso`, `/reservar/erro`);
   - linha(s) de produto ou `amount` em centavos, moeda **BRL** (conforme conta Stripe).
5. API regista ou actualiza linha em **`payments`** (provider STRIPE, id da sessão, estado CREATED).
6. Front recebe `{ url }` e redirecciona (`window.location` ou `window.open`).
7. Utilizador paga no Stripe.
8. Stripe envia **`POST /api/stripe/webhook`** com assinatura; tratas `checkout.session.completed` de forma **idempotente** e actualizas `payments.status` (ex.: SUCCEEDED).
9. Opcional: página de sucesso chama `GET /api/stripe/session-status` para UX, mas a **fonte de verdade** é o webhook (e/ou `sessions.retrieve` no servidor).

**Importante:** não confiar apenas no redirect de sucesso; o webhook (ou verificação server-side da sessão) evita estados incorrectos.

---

## 3. Endpoints da API (Node)

| Método | Rota | Autenticação | Função |
|--------|------|--------------|--------|
| POST | `/api/stripe/checkout-session` | JWT (banhista) | Valida que a reserva pertence ao utilizador, estado e montante; cria sessão Stripe; persiste `payments`. |
| POST | `/api/stripe/webhook` | Stripe (`Stripe-Signature`) | Corpo em **raw body**; valida assinatura com `STRIPE_WEBHOOK_SECRET`; processa eventos. |
| GET | `/api/stripe/session-status` (opcional) | JWT | Confirma `payment_status` da sessão para a página de sucesso. |

---

## 4. Base de dados — tabela `payments`

- Acrescentar valor **`STRIPE`** ao enum `payment_provider` (migração SQL).
- Reutilizar `booking_id`, `status`, timestamps.
- Guardar identificador da sessão Stripe (coluna dedicada ou campo genérico `external_checkout_id` se refactorizares o que hoje é `mp_preference_id`).

**Nota:** no código actual, o fluxo MP pode ainda não preencher `payments` em todos os passos; o Stripe é boa oportunidade para registar pagamento à criação da sessão e fechar no webhook.

---

## 5. Variáveis de ambiente

**Servidor (`server/.env`):**

- `STRIPE_SECRET_KEY` — `sk_test_…` / `sk_live_…`
- `STRIPE_WEBHOOK_SECRET` — `whsec_…`
- `FRONTEND_URL` — já usado para `back_urls` do MP; reutilizar para `success_url` / `cancel_url` do Stripe

**Front (opcional):**

- `VITE_STRIPE_PUBLISHABLE_KEY` — só necessário se no futuro usares Stripe.js / Payment Element no browser; com **só** Checkout redirect pode não ser preciso.

---

## 6. Front — `Reservar.tsx`

- Após `criarReserva`, ramo alternativo ao MP:
  - `POST /api/stripe/checkout-session` com `{ bookingId }`;
  - resposta `{ url }` → `window.location.href = url` ou `window.open(url)`.
- Seleção de provider: variável `PAYMENT_PROVIDER=stripe|mercadopago` ou feature flag.

---

## 7. Desenvolvimento local — webhook

- **Stripe CLI:** `stripe listen --forward-to localhost:3001/api/stripe/webhook`
- Em produção (ex.: Railway): registar URL HTTPS no Dashboard Stripe.

---

## 8. Decisões de produto

- **Estado da reserva após pagamento:** definir se continua **PENDING** até o locador aceitar, ou se há estado intermédio “pago / a confirmar”.
- **Moeda BRL:** confirmar suporte na conta Stripe (Brasil / multi-moeda).
- **PIX:** depende da oferta Stripe na tua região; podes manter MP para PIX e Stripe só cartão, ou um único provider.

---

## 9. Implementação sugerida em fases

1. Migração enum + colunas `payments` + rotas `checkout-session` + `webhook` mínimo (`checkout.session.completed`).
2. Integração em `Reservar.tsx` e `server/.env.example` + documentação deploy.
3. Página de sucesso opcional com `sessions.retrieve` para feedback imediato.

---

*Gerado como documentação do repositório Alto Mar. Mermaid / diagramas vectoriais podem ser adicionados em ferramentas externas se necessário.*
