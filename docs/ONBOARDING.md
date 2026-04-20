# Onboarding de Engenharia — Alto Mar

Guia rápido para novos desenvolvedores (frontend, backend e QA técnico).

---

## 1) Stack e visão geral

- Frontend: React + Vite (`src/`).
- Backend: Node + Express (`server/`).
- Banco: PostgreSQL.
- Pagamentos: Mercado Pago (legado) e Stripe (fluxo atual em evolução).

Documentos principais:

- `README.md`
- `docs/DEPLOY.md`
- `docs/STRIPE-INTEGRATION-DESIGN.md`
- `docs/BACKEND-API-CONTRACT.md`
- `docs/BUSINESS-RULES.md`
- `docs/ENGINEERING-RUNBOOK.md`
- `docs/TEST-PLAYBOOK.md`

---

## 2) Setup local

Na raiz do projeto:

```bash
npm install
npm --prefix server install
```

Criar `server/.env` com no mínimo:

- `DATABASE_URL`
- `JWT_SECRET`
- `FRONTEND_URL=http://localhost:8080`
- `PAYMENTS_PROVIDER` (`stripe` ou `mercadopago`)

Subir ambiente:

```bash
npm run dev:all
```

URLs esperadas:

- Front: `http://localhost:8080`
- API: `http://localhost:3001`

---

## 3) Dados de teste

- Seed geral: `npm --prefix server run seed`
- Reset frota demo: `npm run db:reset-demo-boats`

Conta demo de locador (padrão):

- Email: `locatario@demo.com`
- Senha: `123456`

Podem ser alterados via variáveis `DEMO_OWNER_*`.

---

## 4) Fluxos críticos para entender primeiro

1. Criar reserva (`POST /api/bookings`).
2. Checkout Stripe (`POST /api/stripe/checkout-session`).
3. Webhook Stripe (`POST /api/stripe/webhook`).
4. Aceite/recusa do locador (`/api/owner/bookings/:id/accept|decline`).
5. Cancelamento do banhista em reserva aceita (`/api/renter/bookings/:id/cancel`) com política de reembolso.

---

## 5) Primeira semana (checklist)

- Subir app local e fazer login como banhista/locador.
- Criar e pagar reserva no Stripe.
- Aceitar e recusar reserva como locador.
- Executar fluxo de cancelamento do banhista em `ACCEPTED`.
- Ler docs de contrato de API e regras de negócio.
- Rodar checklist de testes em `docs/TEST-PLAYBOOK.md`.

---

## 6) Convenções de trabalho

- Toda mudança de regra de negócio deve atualizar `docs/BUSINESS-RULES.md`.
- Toda mudança de payload/endpoint deve atualizar `docs/BACKEND-API-CONTRACT.md`.
- Incidentes e correções operacionais recorrentes devem ir para `docs/ENGINEERING-RUNBOOK.md`.

