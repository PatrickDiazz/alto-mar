# Contrato de API Backend (alto nível)

Este documento resume endpoints críticos e regras de payload/validação.

> Fonte de implementação: `server/index.js` e módulos em `server/stripe/`.

---

## 1) Autenticação

- `POST /api/auth/signup`
- `POST /api/auth/login`

Resposta principal: `token` + `user`.

---

## 2) Reservas (banhista)

### `POST /api/bookings`

Cria reserva com status `PENDING`.

Campos relevantes:

- `boatId`
- `bookingDate`
- `passengersAdults` / `passengersChildren`
- `bbqKit`, `jetSki`
- `embarkLocation`, `embarkTime`
- `totalCents`
- `routeIslands`

Validações:

- capacidade do barco;
- antecedência mínima;
- data disponível;
- consistência de `totalCents`.

### `POST /api/renter/bookings/:id/cancel`

Cancela `PENDING` ou `ACCEPTED`.

Body:

```json
{
  "reason": "texto opcional, obrigatório para ACCEPTED (min 10 chars)"
}
```

Regras:

- `PENDING`: cancela direto.
- `ACCEPTED`: exige `reason`; aplica política de reembolso Stripe por prazo.

---

## 3) Stripe

### `POST /api/stripe/checkout-session`

Body:

```json
{ "bookingId": "<uuid>" }
```

Regras:

- reserva deve pertencer ao banhista;
- permitida em `PENDING` e `ACCEPTED`;
- retorna `url` de checkout.

### `POST /api/stripe/webhook`

- endpoint com `raw body`;
- processa eventos Stripe idempotentemente.

### `POST /api/stripe/sync-checkout-session`

- usado para sincronização de pagamento no retorno de checkout em ambiente local/sem webhook confiável.

---

## 4) Reservas (locador)

### `POST /api/owner/bookings/:id/accept`

Regras:

- só aceita reserva `PENDING`;
- em modo Stripe, exige pagamento `APPROVED`;
- ao aceitar, cancela pendentes conflitantes no mesmo barco/data e reembolsa quando aplicável.

### `POST /api/owner/bookings/:id/decline`

Regras:

- muda para `DECLINED`;
- se pago em Stripe, dispara reembolso conforme regra de recusa do locador.

### `POST /api/owner/bookings/:id/stripe/start-payout`

- inicia repasse Stripe no fluxo Connect.

---

## 5) Códigos de aviso ao banhista

Persistidos em `bookings.renter_notice_code`:

- `SAME_DAY_OTHER_ACCEPTED`
- `OWNER_DECLINED_REFUND`
- `RENTER_CANCEL_FULL_FEE_DEDUCTED`
- `RENTER_CANCEL_PARTIAL_50`
- `RENTER_CANCEL_NO_REFUND_LT48H`

