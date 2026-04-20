# Engineering Runbook — Alto Mar

Guia operacional para incidentes comuns e rotinas técnicas.

---

## 1) Health checks rápidos

- API: `GET /api/health`
- Config pública: `GET /api/public/app-config`
- Front: abrir `http://localhost:8080`

Se `npm run dev:all` falhar com porta em uso:

- identificar processo que usa `3001`;
- encerrar processo antigo ou ajustar `PORT` local.

---

## 2) Stripe em ambiente local

Checklist:

1. `PAYMENTS_PROVIDER=stripe` no `server/.env`.
2. Chaves Stripe de teste configuradas.
3. API no ar (`:3001`).
4. (Opcional) Stripe CLI para webhook:
   - `stripe listen --forward-to http://127.0.0.1:3001/api/stripe/webhook`

Sem webhook local, usar o retorno/sync do checkout implementado no app.

---

## 3) Problemas comuns

### 3.1 `FOR UPDATE cannot be applied to the nullable side of an outer join`

- Causa: `FOR UPDATE` em query com `LEFT JOIN`.
- Correção: usar `FOR UPDATE OF <tabela-base>` (ex.: `FOR UPDATE OF bk`).

### 3.2 Idempotency key da Stripe com erro de parâmetros diferentes

- Causa: mesma chave com body alterado.
- Correção: versionar a chave de idempotência quando payload muda.

### 3.3 Reserva criada mas sem abrir pagamento

- Verificar `Reservar.tsx` no ramo `paymentsProvider === "stripe"`.
- Esperado: criar reserva + criar checkout session + `window.location.assign(url)`.

---

## 4) Operação de reembolso (Stripe)

Regras implementadas estão em `docs/BUSINESS-RULES.md`.

Tabelas/colunas de auditoria:

- `payments.status`
- `stripe_connect_refunds`
- `bookings.renter_notice_code`
- `bookings.decision_note`

---

## 5) Logs e observabilidade mínima

- API: logs do terminal/serviço Railway.
- Erros webhook Stripe: procurar prefixo `[stripe webhook]`.
- Em produção, anexar `booking_id`, `payment_intent`, `refund_id` em chamados.

---

## 6) Escalonamento interno

Quando escalar para revisão:

- divergência de valores financeiros (cents);
- estorno duplicado ou ausente;
- corrida entre atualização de status da reserva e pagamento;
- inconsistência entre `payments`, `bookings` e `stripe_connect_refunds`.

