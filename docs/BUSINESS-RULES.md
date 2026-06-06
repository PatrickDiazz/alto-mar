# Regras de Negócio (canônicas)

Este documento centraliza as regras de produto/negócio implementadas.

---

## 1) Reserva e pagamento

- Reserva nasce como `PENDING`.
- No fluxo Stripe, o banhista pode pagar em `PENDING` ou `ACCEPTED`.
- Pagamento aprovado não muda status da reserva sozinho; atualiza financeiro (`payments`, `stripe_flow_status`).
- Em modo Stripe, locador só aceita quando pagamento está `APPROVED`.

---

## 2) Aceite/recusa do locador

- Aceite (`accept`) ocorre apenas em reserva `PENDING`.
- Ao aceitar uma reserva, outras `PENDING` do mesmo barco/data são canceladas.
- Se essas reservas canceladas estiverem pagas, ocorre reembolso Stripe.
- Recusa (`decline`) de reserva paga aciona reembolso (regra de recusa do locador).

---

## 3) Cancelamento pelo banhista em reserva `ACCEPTED`

Justificativa obrigatória:

- mínimo 10 caracteres;
- armazenada em `bookings.decision_note`.

Política de reembolso (Stripe):

- **7+ dias antes**: reembolso com dedução de taxas não reembolsáveis.
- **entre 6 e 2 dias**: reembolso de 50%.
- **menos de 48h / no-show**: sem reembolso.

Aviso institucional (`renter_notice_code`) é exibido no painel do banhista.

---

## 4) Financeiro e semântica de status

- `payments.status = REFUNDED` apenas quando estorno é total.
- Em estorno parcial, cobrança permanece aprovada e o valor estornado fica auditado em `stripe_connect_refunds`.
- Eventos financeiros devem ser idempotentes.

---

## 5) Repasse ao locador (Connect)

- Plataforma recebe pagamento do banhista.
- Repasse ao locador ocorre quando o locador clica em **Iniciar passeio / repasse** (dia da reserva).
- Transferência assíncrona (fila PostgreSQL + cron); confirmação via webhook `transfer.paid`.
- Penalidades pendentes do locador são deduzidas do valor transferido.
- Conta Connect activa (`charges_enabled` + `payouts_enabled`) exigida para checkout e repasse.

---

## 6) Cancelamento pelo locador (reserva `ACCEPTED`)

Justificativa obrigatória (mínimo 10 caracteres). Cenários:

- **Cancelamento pelo locador**: reembolso 100% ao banhista; multa 20% sobre `owner_net_cents`.
- **Condições climáticas**: reembolso 100%; sem penalidade ao locador.
- **Falha na embarcação**: reembolso 100%; multa 20% sobre `owner_net_cents`.

---

## 7) PIX

- Pode ficar temporariamente indisponível por decisão operacional no front.
- Reativação deve respeitar configuração de Stripe e flags da aplicação.

