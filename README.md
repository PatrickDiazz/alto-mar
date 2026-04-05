# Alto Mar

App de reserva de embarcações (React + Vite + API Node + PostgreSQL).

## Desenvolvimento local

```bash
npm install
npm --prefix server install
# server/.env com DATABASE_URL, JWT_SECRET, FRONTEND_URL, PORT (opcional)
npm run dev:all
```

- Front: `http://localhost:8080` (ou porta que o Vite mostrar)  
- Seed: `npm --prefix server run seed`  
- **Só frota demo:** `npm run db:reset-demo-boats` — remove barcos do locador demo (e reservas desses barcos), recria ≥30 com fotos do pack; não mexe noutros donos.  
- **Produção:** o site mostra fotos vindas da BD (`boat_images`). Se mudares `public/assets/` e fizeste deploy do front, corre `npm run db:refresh-demo-images` com `DATABASE_URL` de produção (só barcos do locador demo — vê `docs/DEPLOY.md`).

## Documentação

| Arquivo | Conteúdo |
|---------|-----------|
| [docs/DEPLOY.md](docs/DEPLOY.md) | **Deploy na nuvem** (Railway API + Postgres, Vercel front) — app no ar sem seu PC |
| [TESTE-OUTRA-PESSOA.md](TESTE-OUTRA-PESSOA.md) | Teste rápido com túnel (`npm run tunnel`) |

## Variáveis (produção)

- **Vercel:** `VITE_API_BASE_URL` = URL HTTPS da API (sem `/` no final).  
- **Railway (API):** `DATABASE_URL`, **`JWT_SECRET`** (obrigatório — string longa e aleatória, ex. `openssl rand -hex 32`), **`FRONTEND_URL`** = URL HTTPS do site no Vercel. Sem `JWT_SECRET` a API **não arranca**.

### CORS

- Por defeito a API aceita qualquer `Origin` (útil em dev e previews). Em **produção**, define **`CORS_STRICT=1`** (ou `true`) no serviço da API e garante **`FRONTEND_URL`** +, se precisares, **`EXTRA_CORS_ORIGINS`** (domínios extra separados por vírgula). Vê `server/.env.example` e [docs/DEPLOY.md](docs/DEPLOY.md).
