# Checklist para a Reta Final

## Projeto de Reserva de Embarcações — Alto Mar

Documento de verificação pré-publicação. Revise cada item cuidadosamente antes do lançamento. Teste extensivamente e garanta que todos os fluxos estejam funcionando perfeitamente.

**Versão do app:** v0.14.7  
**Última atualização:** Julho 2026

Documentos relacionados:

- [`BUSINESS-RULES.md`](./BUSINESS-RULES.md) — regras de negócio implementadas
- [`TEST-PLAYBOOK.md`](./TEST-PLAYBOOK.md) — regressão manual
- [`DEPLOY.md`](./DEPLOY.md) — deploy em produção
- [`SECURITY-SECRETS.md`](./SECURITY-SECRETS.md) — segredos e rotação
- [`BACKEND-API-CONTRACT.md`](./BACKEND-API-CONTRACT.md) — contrato da API
- [`ENGINEERING-RUNBOOK.md`](./ENGINEERING-RUNBOOK.md) — incidentes operacionais
- [`ANDROID.md`](./ANDROID.md) — build Capacitor Android

---

## 1. Funcionalidades críticas

Verificação essencial das funcionalidades core do MVP.

### Autenticação e contas

- [ ] **Cadastro e login funcionando:** sistema de autenticação completo com validação de emails, recuperação de senha e sessões seguras
- [ ] **OAuth Google e Facebook:** fluxo web e Android (Custom Tab/Capacitor); callbacks de produção com `API_PUBLIC_URL` correta
- [ ] **Recuperação de senha em produção:** e-mail transacional enviado (não apenas log no servidor)
- [ ] **Exclusão de conta:** `DELETE /api/me` testado; impacto em reservas e retenção financeira validado
- [ ] **Papéis corretos:** banhista (`banhista`) e locador (`locatario`) com permissões adequadas em cada endpoint

### Embarcações

- [ ] **Cadastro de embarcações:** formulário completo para proprietários (fotos, descrição, capacidade, equipamentos, localização, opcionais churrasco/jet-ski/roteiro)
- [ ] **Aprovação/reprovação pela staff:** painel admin (`admin/`) para validar embarcações antes de torná-las públicas (`review_status`, `verified`)
- [ ] **Visibilidade pública:** apenas embarcações `verified = true` e `is_active = true` aparecem na listagem
- [ ] **GPS ao vivo:** não promover como rastreamento real — implementação atual é simulada (`BoatLiveGps.tsx`)

### Busca e exploração

- [ ] **Busca/listagem de embarcações:** filtros (data, local, tipo de barco, capacidade, preço) e listagem paginada/infinite scroll
- [ ] **Disponibilidade por data:** endpoint `/api/public/boats-available-on` alinhado com calendário da UI
- [ ] **i18n:** fluxos críticos testados em português, inglês e espanhol

### Reservas

- [ ] **Fluxo completo de reserva:** seleção de datas, cálculo de preço, confirmação e geração de comprovante/ticket
- [ ] **Regras de negócio:** antecedência mínima de 2 dias; reservas `PENDING` não bloqueiam o dia; conflito no mesmo dia tratado corretamente
- [ ] **Cancelamento e reembolso:** política documentada alinhada com `docs/BUSINESS-RULES.md` e com o comportamento real da API
- [ ] **Remarcação, aceite e recusa:** fluxos do locador e do banhista testados de ponta a ponta

### Chat

- [ ] **Chat entre cliente e anunciante:** mensageria interna por reserva (apenas quando status `ACCEPTED`)
- [ ] **Filtro anti-desvio:** bloqueio de telefone, URL e contato fora da plataforma testado
- [ ] **Moderação staff:** console admin consegue visualizar e moderar conversas e denúncias

### Painéis e suporte

- [ ] **Painel do locador (`/marinheiro`):** dashboard, embarcações, agenda, reservas, receita, perfil Stripe Connect
- [ ] **Painel administrativo:** app separado em `admin/` — dashboard, tickets, revisão de barcos, moderação, chats, auditoria, staff
- [ ] **Canal de suporte ao usuário:** API de tickets (`POST /api/tickets`) com UI no app consumidor **ou** escopo explícito de lançamento sem essa funcionalidade
- [ ] **Notificações in-app:** eventos críticos (nova reserva, aceite, recusa, cancelamento) chegam a banhista e locador

---

## 2. Pagamentos e marketplace (Stripe Connect)

> O app suporta dois provedores (`PAYMENTS_PROVIDER`). O padrão em desenvolvimento é Mercado Pago; produção deve usar Stripe se for o caminho final.

### Configuração

- [ ] **Provedor de produção definido:** `PAYMENTS_PROVIDER=stripe` com todas as variáveis configuradas (`STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`)
- [ ] **Mercado Pago desativado** em produção (se Stripe for o provedor final)
- [ ] **URLs de retorno de pagamento:** rotas de sucesso/cancelamento existem e não retornam 404 (ex.: `/reservar/sucesso`)

### Stripe Connect — locadores

- [ ] **Onboarding Connect:** fluxo completo — criar conta Express → completar KYC → conta apta a receber repasses
- [ ] **Checkout Session:** pagamento com cartão testado de ponta a ponta
- [ ] **PIX no Checkout:** se `STRIPE_PIX_ENABLED`, testar pagamento PIX completo
- [ ] **Aceite bloqueado até pagamento:** reserva só pode ser aceita pelo locador após `payments.status = APPROVED` (modo Stripe)

### Webhooks e sincronização

- [ ] **Webhook em produção:** `POST /api/stripe/webhook` com assinatura válida
- [ ] **Eventos críticos testados:** `checkout.session.completed`, reembolsos, transferências, disputas
- [ ] **Fallback sem webhook:** `POST /api/stripe/sync-checkout-session` validado (localhost/Capacitor)
- [ ] **Idempotência:** eventos duplicados não processam duas vezes (`stripe_events`)

### Repasses, cancelamentos e disputas

- [ ] **Iniciar repasse:** `POST /api/owner/bookings/:id/stripe/start-payout` após conclusão do passeio
- [ ] **Fila de transferências:** cron `STRIPE_CRON_ENABLED` processa fila e penalidades
- [ ] **Política de cancelamento vs. reembolso real:** tiers (7+ dias, 6–2 dias 50%, etc.) refletidos nos estornos Stripe
- [ ] **Disputas/chargebacks:** fluxo operacional definido (quem responde, prazo, comunicação com locador)
- [ ] **Smoke test:** `npm --prefix server run stripe:smoke` executado com sucesso antes do go-live

---

## 3. Comunicação e notificações

- [ ] **E-mail transacional integrado:** provedor configurado (Resend, SendGrid, etc.)
- [ ] **E-mails testados:** cadastro, reset de senha, confirmação de reserva, cancelamento
- [ ] **Push notifications (FCM):** `google-services.json` no Android; registro de token e entrega em dispositivo real
- [ ] **Notificações de reserva:** booking events disparam push e/ou in-app conforme esperado
- [ ] **Canal de suporte acessível:** e-mail, chat ou telefone com SLA definido e equipe treinada

---

## 4. Segurança

Proteção contra vulnerabilidades e acessos não autorizados.

### Autorização e autenticação

- [ ] **Teste de autorização:** usuário comum não pode acessar/editar recursos de outros usuários (testes com diferentes tokens JWT)
- [ ] **Rotas administrativas protegidas:** app `admin/` exige JWT staff (`type: "staff"`) com matriz de permissões RBAC
- [ ] **Rotação de credenciais:** `JWT_SECRET`, `JWT_SECRET_STAFF` e senha do admin seed trocados antes do lançamento
- [ ] **Credenciais demo removidas:** página `/conta/ajuda-teste` e contas de teste bloqueadas ou removidas em produção

### Validação e proteção de API

- [ ] **Validação de entradas:** backend (Zod) e frontend contra SQL injection, XSS e dados malformados
- [ ] **Rate limiting na API:** login (10/15min) e forgot-password (5/15min) funcionando
- [ ] **Rate limit no cadastro:** proteção contra abuso de signup implementada
- [ ] **Rate limit distribuído:** em produção com múltiplas instâncias, limitador não depende só de memória local (Redis ou equivalente)
- [ ] **CORS em produção:** allowlist correta (`FRONTEND_URL`, domínio final, origens Capacitor)
- [ ] **Headers de segurança:** `helmet` ou equivalente (CSP, HSTS, etc.) configurado

### Logging e auditoria

- [ ] **Logs de erros:** sistema com níveis (error, warning, info) sem expor dados sensíveis (senhas, tokens, PII)
- [ ] **Auditoria staff:** ações de moderação e aprovação de barcos registradas no console admin
- [ ] **Teste de APIs:** documentação completa e testes manuais de todos os endpoints (códigos HTTP, schemas, casos de erro)

---

## 5. Qualidade

Testes de fluxo completo e compatibilidade.

### Fluxos end-to-end

- [ ] **Fluxo completo — Cliente:** cria conta → busca barco → faz reserva → paga → recebe confirmação → comunica com anunciante → conclui reserva
- [ ] **Fluxo completo — Proprietário:** registra → anuncia barco → aguarda aprovação staff → recebe notificação de reserva → aceita → acompanha status → recebe repasse
- [ ] **Fluxo completo — Staff:** acessa painel admin → vê embarcações pendentes → aprova/reprova com justificativa → embarcação atualizada na listagem pública

### Compatibilidade e UX

- [ ] **Android (Capacitor):** funcionalidade completa no APK release — OAuth, Stripe Checkout, push, navegação
- [ ] **iPhone / iOS:** projeto Capacitor iOS criado e testado (se TestFlight for objetivo de lançamento)
- [ ] **Internet lenta:** simular 3G/4G lentos — loading states, timeouts e feedback ao usuário
- [ ] **Telas pequenas:** UX em 320px–480px — legibilidade, botões tocáveis, navegação mobile

### Testes automatizados e CI

- [ ] **Testes unitários:** suite Vitest passando (política de cancelamento, filtro de chat, APIs)
- [ ] **Testes e2e mínimos:** Playwright cobrindo cadastro → busca → reserva → pagamento (modo teste Stripe)
- [ ] **CI/CD:** pipeline mínimo (lint, testes, build front + admin + smoke API) em `.github/workflows`
- [ ] **Coleção Postman/Newman:** exportada a partir de `docs/BACKEND-API-CONTRACT.md` para regressão automatizada

---

## 6. Performance

Otimização e testes de carga.

- [ ] **Testes de carga:** Newman, JMeter ou equivalente — 100+ usuários simultâneos; identificar pontos de ruptura
- [ ] **Tempo de resposta da API:** endpoints respondem em <500ms (p95), com monitoramento contínuo
- [ ] **Consultas lentas no banco:** `EXPLAIN` nas queries críticas; índices apropriados; evitar `SELECT *` desnecessário
- [ ] **Health check:** `GET /api/health` integrado em monitoramento de uptime

---

## 7. Jurídico, LGPD e operacional

Documentação legal e suporte ao usuário.

### Documentos legais

- [ ] **Termos de uso:** documento publicado em rota acessível (ex.: `/termos`) — regras da plataforma, responsabilidades, proibições
- [ ] **Política de privacidade:** rota pública (ex.: `/privacidade`) — coleta, uso, armazenamento e compartilhamento de dados (conforme LGPD)
- [ ] **Política de cancelamento:** regras claras para cancelamentos, reembolsos, penalidades e condições excepcionais — link visível no cadastro e na reserva
- [ ] **Termos de imagens de roteiro:** formalizado legalmente (aceite já exigido no cadastro de embarcação)
- [ ] **Banner de cookies / consentimento:** transparência sobre cookies e rastreamento (LGPD)

### LGPD e dados pessoais

- [ ] **Canal para exercício de direitos:** acesso, correção, exclusão, portabilidade — contato/DPO definido
- [ ] **Exclusão vs. retenção financeira:** política alinhada com obrigações fiscais e registros Stripe (não apagar o que a lei exige manter)
- [ ] **Base legal documentada** para cada tipo de dado coletado

### Operação

- [ ] **Regras de negócio validadas:** `docs/BUSINESS-RULES.md` conferido contra UX real
- [ ] **SLA de moderação:** prazo interno para aprovação/reprovação de embarcações
- [ ] **Runbook de incidentes:** `docs/ENGINEERING-RUNBOOK.md` — falha de webhook, transferência Stripe, DB down
- [ ] **Backup e restore PostgreSQL:** procedimento testado no provedor de produção

---

## 8. Publicação

Preparação final para lançamento.

### Infraestrutura

- [ ] **Configurar domínio:** DNS, SSL/TLS (HTTPS), pontuação em ferramentas de SEO
- [ ] **Ambiente de produção:** API (ex.: Railway) + Postgres + front (Vercel) + admin (Vercel separado)
- [ ] **Variáveis de ambiente:** checklist completo em `docs/DEPLOY.md` e `docs/SECURITY-SECRETS.md` — nenhum segredo commitado
- [ ] **Dois deploys Vercel:** app consumidor (`vercel.json`) e admin (`admin/vercel.json`) com `VITE_API_BASE_URL` e proxy corretos
- [ ] **Admin isolado:** `noindex`, JWT staff separado, sem exposição pública desnecessária

### Monitoramento

- [ ] **Monitoramento de erros:** Sentry, LogRocket ou equivalente — captura em tempo real com alertas
- [ ] **Uptime:** health check e alertas de indisponibilidade
- [ ] **Métricas Stripe:** endpoint de métricas do locador e alertas de falha na fila de transferências

### Mobile e lojas

- [ ] **Android:** build assinado no Android Studio → Google Play Console com screenshots e descrição
- [ ] **iOS / TestFlight:** build no Xcode → App Store Connect → TestFlight com testers (requer projeto Capacitor iOS)
- [ ] **PWA (opcional):** manifest e service worker, se quiser app instalável na web

### Release

- [ ] **SEO básico:** `robots.txt`, `og-image.png`, favicons configurados
- [ ] **Versão e changelog:** tag de release alinhada com `CHANGELOG.md`
- [ ] **Seed de demo desativado:** `server/seed.js` e dados de demonstração não expostos em produção

---

## Nota importante

> Revise cada item cuidadosamente antes da publicação. Teste extensivamente e garanta que todos os fluxos estejam funcionando perfeitamente. Itens marcados como específicos do Alto Mar refletem o estado atual do código — atualize este documento conforme o projeto evoluir.

---

*Checklist para Reta Final — Projeto de Reserva de Embarcações (Alto Mar) | Junho 2026*
