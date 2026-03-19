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

## Documentação

| Arquivo | Conteúdo |
|---------|-----------|
| [docs/DEPLOY.md](docs/DEPLOY.md) | **Deploy na nuvem** (Railway API + Postgres, Vercel front) — app no ar sem seu PC |
| [TESTE-OUTRA-PESSOA.md](TESTE-OUTRA-PESSOA.md) | Teste rápido com túnel (`npm run tunnel`) |

## Variáveis (produção)

- **Vercel:** `VITE_API_BASE_URL` = URL HTTPS da API (sem `/` no final).  
- **Railway (API):** `DATABASE_URL`, `JWT_SECRET`, `FRONTEND_URL` = URL do site no Vercel.
