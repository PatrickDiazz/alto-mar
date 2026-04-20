# Segurança e Segredos

Práticas mínimas de segurança para engenharia no Alto Mar.

---

## 1) Segredos obrigatórios

Nunca versionar:

- `server/.env`
- chaves Stripe (`sk_*`)
- tokens de produção

Obrigatórios em backend:

- `JWT_SECRET`
- `DATABASE_URL`
- chaves de pagamento conforme provider ativo

---

## 2) Ambientes

- Use chaves **test** em desenvolvimento.
- Separe completamente credenciais de produção.
- Não reaproveite `JWT_SECRET` entre ambientes.

---

## 3) Acesso e exposição local

- Preferir API bound em `localhost` durante desenvolvimento.
- Evitar expor `3001` para rede pública sem necessidade.
- Se usar túnel, limitar ao tempo de teste e encerrar após uso.

---

## 4) Webhooks Stripe

- Validar assinatura (`Stripe-Signature`) sempre.
- Processar de forma idempotente.
- Não confiar apenas em redirect do checkout para marcar pagamento.

---

## 5) Logs e dados sensíveis

- Não logar secrets completos.
- Em logs de erro, mascarar dados sensíveis.
- Para suporte, usar IDs técnicos (`booking_id`, `payment_intent`, `refund_id`) em vez de dados pessoais.

---

## 6) Pull requests e revisão

Checklist rápido:

- sem segredos em diff;
- sem credenciais hardcoded;
- sem bypass de validação de autenticação/autorização;
- sem quebra de idempotência em pagamento/reembolso.

