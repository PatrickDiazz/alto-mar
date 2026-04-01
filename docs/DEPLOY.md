# Deploy na nuvem (app 24h sem seu PC ligado)

Este guia usa **Railway** para API + Postgres e **Vercel** para o site (front). Ambos têm plano gratuito com limites; o app fica em URLs públicas `https://...`.

---

## Visão geral

1. Banco PostgreSQL na nuvem  
2. API Node (`server/`) no Railway  
3. Front (Vite) no Vercel, apontando para a URL da API  

Variáveis importantes:

| Onde | Variável | Exemplo |
|------|-----------|---------|
| Railway (API) | `DATABASE_URL` | fornecida pelo Postgres do Railway ou Neon |
| Railway (API) | `JWT_SECRET` | string longa e aleatória (não compartilhe) |
| Railway (API) | `FRONTEND_URL` | URL do Vercel, ex. `https://alto-mar.vercel.app` |
| Railway (API) | `PORT` | **não defina** — o Railway define sozinho |
| Vercel (**Build** / Production) | `VITE_API_BASE_URL` | **Recomendado:** URL pública da API na Railway, ex. `https://alto-mar-production.up.railway.app` (sem `/` no fim). O front passa a chamar a API **diretamente**; evita depender do proxy. |
| Vercel (Runtime) | `ALTO_MAR_API_ORIGIN` | Só se **não** usares `VITE_API_BASE_URL` no build: mesma URL da API, para o proxy em `api/[...path].js`. |

---

## Parte A — PostgreSQL

### Opção 1: Postgres no próprio Railway

1. [railway.app](https://railway.app) → login com GitHub.  
2. **New project** → **Database** → **Add PostgreSQL**.  
3. Abra o serviço Postgres → aba **Variables** ou **Connect** → copie a **`DATABASE_URL`** (formato `postgresql://...`).

### Opção 2: Neon (só banco)

1. [neon.tech](https://neon.tech) → crie um projeto → copie **Connection string** (`DATABASE_URL`).

---

## Parte B — Criar tabelas no banco de produção

Use o arquivo **`db/schema-cloud.sql`** do repositório. Ele é o schema completo **sem** `\connect` e **sem** criar outro database — serve para Neon, Railway Postgres, etc.

### B.1 — Neon

1. Entre em [console.neon.tech](https://console.neon.tech) e abra seu projeto.  
2. No menu: **SQL Editor**.  
3. Abra no seu PC o arquivo **`db/schema-cloud.sql`**, copie **todo** o conteúdo e cole no editor.  
4. Clique em **Run** (executar).  
5. Deve aparecer sucesso (sem erro vermelho).  
6. Opcional: rode no editor para conferir:
   ```sql
   SELECT table_name
   FROM information_schema.tables
   WHERE table_schema = 'public'
   ORDER BY table_name;
   ```
   Você deve ver, entre outras: `users`, `boats`, `boat_images`, `bookings`, `payments`, `password_reset_tokens`, …

### B.2 — PostgreSQL no Railway

1. No projeto Railway, clique no **serviço PostgreSQL** (não na API).  
2. Aba **Data** ou **Query** (ou use **Connect** e um cliente externo).  
3. Se houver **Query / SQL**: cole o conteúdo inteiro de **`db/schema-cloud.sql`** e execute.  
4. Se o Railway só mostrar `DATABASE_URL`: use **DBeaver**, **pgAdmin** ou `psql` no seu PC:
   - Cole a connection string como host/porta/user/senha (ou use “Import from URL”).  
   - Conecte no database padrão (`railway` ou o nome que aparecer na URL).  
   - Abra uma janela SQL, cole **`schema-cloud.sql`**, execute.

### B.3 — Erros comuns

| Erro | O que fazer |
|------|----------------|
| `syntax error at or near "\connect"` | Você colou o **`schema.sql` antigo**. Use só **`schema-cloud.sql`**. |
| `permission denied to create extension` | No Neon, extensões costumam ser liberadas; no Railway, em geral também. Tente de novo ou abra ticket no suporte. |
| `EXECUTE FUNCTION` não existe | PostgreSQL anterior ao 14. No final do `schema-cloud.sql`, troque `EXECUTE FUNCTION` por `EXECUTE PROCEDURE` na linha do `CREATE TRIGGER`. |
| `type "user_role" already exists` | O script já foi rodado antes. Pode ignorar ou usar um database novo vazio. |

### B.4 — Depois da Parte B

Só avance para a **Parte C** (API) quando o schema tiver rodado **sem erro** e as tabelas existirem.

---

## Parte C — API no Railway

1. **New project** → **Deploy from GitHub** → escolha o repositório **alto-mar**.  
2. Railway vai sugerir um serviço. Configure:
   - **Root Directory** / pasta raiz do serviço: `server`  
   - **Start Command**: `npm start`  
   - **Build Command** (se pedir): `npm install`  

   Se não houver campo “Root Directory”, use **Settings** do serviço → **Root Directory** = `server`.

3. Aba **Variables** (do serviço da API, não do Postgres):

   ```
   DATABASE_URL=<cole a URL do Postgres - pode usar Reference ao serviço Postgres no Railway>
   JWT_SECRET=<gere algo longo, ex. openssl rand -hex 32>
   FRONTEND_URL=https://SEU-APP.vercel.app
   ```

   - `MP_ACCESS_TOKEN` só se for usar Mercado Pago de verdade.  
   - **Não** defina `PORT` manualmente.

4. **Deploy**. Quando terminar, anote a URL pública da API (ex. `https://alto-mar-production-xxxx.up.railway.app`).

5. **Popular dados (seed), uma vez:**

   No seu PC (PowerShell), com `DATABASE_URL` da **produção** no ambiente:

   ```powershell
   $env:DATABASE_URL = "postgresql://..."   # URL de produção
   cd server
   npm run seed
   ```

   Ou use **Railway → serviço API → Shell** e rode `node seed.js` com as variáveis já injetadas (se o shell tiver `DATABASE_URL`).

---

## Parte D — Front no Vercel

1. [vercel.com](https://vercel.com) → **Add New** → **Project** → importe o mesmo repositório GitHub.  
2. **Framework Preset**: **Vite** (ou “Other” com build `npm run build` e pasta de saída `dist`).  
3. **Root Directory**: **vazio** ou **`.`** — tem de ser a raiz do monorepo onde está o `package.json` com o script `"build": "vite build"`. **Não** use `server` aqui (isso é só no Railway).  
4. **Build Command**: `npm run build` · **Output Directory**: `dist` (a Vercel costuma preencher sozinha para Vite).  
5. Em **Environment Variables** (para **Production**):

   ```
   VITE_API_BASE_URL = https://SUA-API.up.railway.app
   ```

   Sem barra no final. Use exatamente a URL HTTPS que o Railway mostra para o serviço da API.

6. **Deploy**.

7. Abra a URL do Vercel (ex. `https://alto-mar.vercel.app`). Teste login e listagem de barcos.

8. Volte no **Railway** → variável **`FRONTEND_URL`** = URL final do Vercel (com `https://`) → **Redeploy** a API para o CORS aceitar o front.

### D.1 — Erro “The page could not be found” / `NOT_FOUND` (Vercel)

Isso é **404 da Vercel**, não do React. Quase sempre é **configuração do projeto** ou **build que não gerou o site**.

| Verificar | O que deve estar |
|-----------|------------------|
| **Root Directory** (Settings → General) | Vazio ou `.` — **não** `server`. |
| **Build** | Último deploy com **Build** verde; abra os logs e confirme `vite build` e pasta `dist/`. |
| **Output Directory** | `dist` (só o front; não confundir com a API). |
| **Framework** | Vite, ou comando de build explícito. |
| `vercel.json` | Não force `outputDirectory` errado; o ficheiro no repo já usa só `rewrites` + função `api/`. |

Depois de corrigir, faça **Redeploy** (Deployments → … → Redeploy).

---

## Parte E — CORS e links

- A API já usa `FRONTEND_URL` e `EXTRA_CORS_ORIGINS` para CORS.  
- Depois que o domínio do Vercel estiver definido em `FRONTEND_URL`, login e chamadas `fetch` do front devem funcionar.  
- **Esqueci minha senha:** em produção você precisará de **e-mail (SMTP)** ou outro meio; hoje o link só aparece no log do servidor. Para produção, configure env de e-mail depois ou use um serviço transacional.

### E.1 — CORS em preview e produção

Se você usa domínio principal + preview do Vercel, configure no Railway:

```env
FRONTEND_URL=https://alto-mar.vercel.app
EXTRA_CORS_ORIGINS=https://alto-mar.vercel.app,https://alto-<preview>.vercel.app
```

Sem barra `/` no final. Depois faça **Redeploy** da API.

### E.2 — Erro 502 + CORS no navegador

Se no navegador aparecer “blocked by CORS” junto com `502 Bad Gateway`, normalmente **não é CORS puro**: a API está quebrando antes de responder.

Passos:

1. Railway → serviço API → **Deployments** → abrir **Logs**.  
2. Corrigir erro de schema no Neon (coluna/tabela ausente).  
3. Redeploy da API.

SQL de segurança para versões mais novas do backend:

```sql
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS rg_url text,
  ADD COLUMN IF NOT EXISTS nautical_license_url text;

ALTER TABLE boats
  ADD COLUMN IF NOT EXISTS tie_document_url text,
  ADD COLUMN IF NOT EXISTS tiem_document_url text,
  ADD COLUMN IF NOT EXISTS video_url text;
```

---

## Checklist rápido

- [ ] Postgres na nuvem com schema aplicado  
- [ ] Railway: serviço em `server/`, `npm start`, `DATABASE_URL`, `JWT_SECRET`, `FRONTEND_URL`  
- [ ] `npm run seed` contra o banco de produção (opcional mas recomendado para demo)  
- [ ] Vercel: `VITE_API_BASE_URL` = URL HTTPS da API  
- [ ] `FRONTEND_URL` no Railway = URL HTTPS do Vercel + redeploy API  

---

## Alternativas

- **Render**: um “Web Service” para a API + Postgres gerenciado; front em **Render Static** ou Vercel.  
- **Fly.io**: API em container; Postgres Fly ou Neon.  
- **Um só serviço**: alguns tutoriais colocam API + serve `dist` no Express — possível, mas este projeto hoje separa front (Vite) e API.

---

## Repositório

- Arquivo **`vercel.json`** na raiz já configura SPA (React Router) para todas as rotas irem ao `index.html`.

Se algo falhar (502, CORS, “Network error”), confira nesta ordem: `VITE_API_BASE_URL` no build do Vercel, `FRONTEND_URL` no Railway, e se a API está “Healthy” no Railway.
