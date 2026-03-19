# Como outra pessoa testa o Alto Mar (fora da sua rede, sem passar seu IP)

O app continua rodando **no seu PC** (Node + Postgres). Quem testa só abre um **link público**; ela não vê seu IP de casa — o tráfego passa por um serviço de túnel (domínio tipo `https://xxxx.loca.lt`).

## Passo a passo

### 1. Subir o app (terminal 1)

```powershell
cd C:\Users\...\alto-mar
& "C:\Program Files\nodejs\npm.cmd" run dev:all
```

Deixe rodando. Confirme que abre em `http://localhost:8080`.

### 2. Abrir o túnel público (terminal 2)

```powershell
& "C:\Program Files\nodejs\npm.cmd" run tunnel
```

Vai aparecer uma **URL `https://....loca.lt`** (ou parecido). **É só essa URL que você manda** para quem vai testar.

- Mantenha **os dois** terminais abertos enquanto durar o teste.
- `Ctrl+C` no túnel encerra o link público.

### 3. Link de “Esqueci minha senha”

O link de redefinição usa `FRONTEND_URL` no `server/.env`. Copie a URL do túnel e coloque:

```env
FRONTEND_URL=https://xxxx.loca.lt
```

(use exatamente o que o script mostrou). Depois **reinicie** `dev:all` para a API ler de novo o `.env`.

### 4. Enviar para o tester

Mensagem exemplo:

> Abre no celular ou no PC: **https://xxxx.loca.lt**  
> Não precisa instalar nada. Pode criar conta como banhista ou usar o locatário demo se eu te passar email/senha.

---

## Observações

- **Primeira abertura** no localtunnel às vezes mostra uma página de aviso — é do serviço gratuito; a pessoa confirma e entra no app.
- O tráfego passa pelos servidores do **localtunnel**; use só para testes, não para dados muito sensíveis em produção.
- Se o túnel falhar, tente de novo em alguns minutos ou use alternativa abaixo.

## Alternativa: Cloudflare Quick Tunnel

Se tiver o [cloudflared](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/) instalado:

```powershell
cloudflared tunnel --url http://localhost:8080
```

Ele mostra uma URL `https://....trycloudflare.com`. Use essa URL no lugar do localtunnel e em `FRONTEND_URL` da mesma forma.

---

## Contas úteis para teste

| Perfil     | Email               | Senha   |
|-----------|---------------------|---------|
| Locatário | `locatario@demo.com` | `123456` |

Banhista: **Criar conta** no app.

---

## O que **não** precisa mais (só se quiser)

Testar na mesma Wi‑Fi com `http://192.168.x.x:8080` ainda funciona, mas **expõe seu IP local** na rede — para “fora de casa sem mostrar IP”, use o túnel acima.
