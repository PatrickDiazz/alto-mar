# Playbook de Testes (engenharia/QA)

Checklist de regressão para mudanças em reservas e pagamentos.

---

## Pré-requisitos

- API e front em execução.
- Conta banhista e locador válidas.
- Ambiente Stripe de teste configurado (se `PAYMENTS_PROVIDER=stripe`).

---

## 1) Fluxo base de reserva

1. Criar reserva (`PENDING`).
2. Validar bloqueios de data/capacidade.
3. Editar reserva pendente.

Esperado: persistência correta, sem erros de validação indevidos.

---

## 2) Checkout Stripe

1. Criar reserva.
2. Confirmar redirecionamento imediato para Checkout Stripe.
3. Concluir pagamento.

Esperado:

- `payments.status = APPROVED`
- `stripe_flow_status` atualizado (`PAID`).

---

## 3) Aceite/recusa do locador

### Aceite

- tentar aceitar sem pagamento (modo Stripe): deve bloquear;
- aceitar com pagamento aprovado: deve permitir.

### Recusa

- recusar reserva paga: deve gerar refund e aviso ao banhista.

---

## 4) Conflito no mesmo dia

1. Criar duas reservas pagas no mesmo barco/data.
2. Aceitar uma como locador.

Esperado:

- outra reserva vira `CANCELLED`;
- reembolso criado quando aplicável;
- `renter_notice_code = SAME_DAY_OTHER_ACCEPTED`.

---

## 5) Cancelamento do banhista em `ACCEPTED`

1. Abrir reserva em curso.
2. Clicar cancelar.
3. Verificar formulário de justificativa inline.
4. Testar validação (<10 chars deve bloquear).
5. Confirmar com justificativa válida.

Esperado:

- cancelamento efetivado;
- política por prazo aplicada;
- `renter_notice_code` coerente com faixa.

---

## 6) Política de reembolso por prazo

Executar cenários de horário:

- 7+ dias: reembolso com dedução de taxas;
- 6–2 dias: reembolso de 50%;
- <48h: sem reembolso.

Conferir:

- `stripe_connect_refunds`
- `payments.status` (total vs parcial)
- `bookings.decision_note`

---

## 7) Regressão de UI

- Mensagens de aviso (`renter_notice_code`) renderizadas.
- Opção PIX conforme estado operacional.
- Estados de loading/erro sem travas de UX.

