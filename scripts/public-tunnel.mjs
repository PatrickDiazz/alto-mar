/**
 * Expõe o Vite (porta 8080) na internet via localtunnel.
 * Quem acessa vê só um domínio tipo https://xxxx.loca.lt — não o seu IP residencial.
 *
 * Pré-requisito: em outro terminal, `npm run dev:all` (front + API no seu PC).
 */
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const localtunnel = require("localtunnel");

const port = Number(process.env.TUNNEL_PORT || 8080);

console.log("Abrindo túnel público na porta local", port, "...\n");

const tunnel = await localtunnel({ port });

const url = tunnel.url;

console.log(`
═══════════════════════════════════════════════════════════════════
  LINK PÚBLICO (pode compartilhar com quem for testar)
  Seu IP não aparece para essa pessoa — só este endereço.
═══════════════════════════════════════════════════════════════════

  ${url}

═══════════════════════════════════════════════════════════════════

  • Deixe ESTE processo aberto enquanto testam.
  • Em outro terminal: npm run dev:all (se ainda não estiver rodando).
  • Para "Esqueci minha senha" gerar o link certo, no server/.env use:

    FRONTEND_URL=${url}

  (depois reinicie a API / dev:all)

  • A primeira visita no localtunnel às vezes pede confirmação na página —
    é normal no plano gratuito.

  Ctrl+C aqui encerra o túnel.
`);

tunnel.on("close", () => {
  console.log("\nTúnel encerrado.");
  process.exit(0);
});

process.on("SIGINT", () => {
  tunnel.close();
});

process.on("SIGTERM", () => {
  tunnel.close();
});
