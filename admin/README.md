# Console Operacional Alto Mar

Aplicação interna de suporte, aprovação de embarcações, moderação e auditoria.

## Desenvolvimento local

```bash
# Terminal 1 — API
npm run dev:server

# Terminal 2 — console admin (porta 5174)
npm run dev:admin

# Ou ambos:
npm run dev:all:ops
```

## Primeiro acesso

Com Postgres a correr e `server/.env` configurado:

```bash
npm --prefix server run seed:staff
```

Credenciais padrão (altere em produção):

- **E-mail:** `admin@altomar.local`
- **Senha:** `Admin@AltoMar2026!`

Tokens staff usam `JWT_SECRET_STAFF` em `server/.env` (ou `JWT_SECRET` se a staff não estiver definida). Reinicie a API após alterar.

## Deploy

- Projeto Vercel **separado** apontando para `admin/` (Root Directory)
- Build: `npm run build` · Output: `dist`
- **API (obrigatório em produção)** — escolha uma:
  - **Recomendado:** `VITE_API_BASE_URL` = URL HTTPS da Railway (ex. `https://alto-mar-production.up.railway.app`, sem `/` no fim)
  - **Alternativa:** `ALTO_MAR_API_ORIGIN` (runtime) + proxy `admin/api/[...path].js` (já incluído)
- `EXTRA_CORS_ORIGINS` na Railway com a URL do admin (se usar `VITE_API_BASE_URL`)
- `JWT_SECRET_STAFF` na Railway (ou `JWT_SECRET` partilhado)
- `admin/postcss.config.js` evita herdar Tailwind da raiz do monorepo
- Não indexar (robots noindex já configurado)

## Módulos

| Fase | Funcionalidade |
|------|----------------|
| 1 | RBAC staff, tickets, aprovação embarcações, auditoria, notificações in-app |
| 2 | Dashboard métricas, tags, macros, moderação básica, denúncias chat |

API: rotas `/api/admin/*` e consumidor `/api/tickets` no mesmo backend Express.
