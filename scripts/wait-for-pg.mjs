/**
 * Espera a porta 5432 aceitar ligações (Postgres no Docker a arrancar).
 * Uso: node scripts/wait-for-pg.mjs
 */
import net from "node:net";

const host = process.env.PGHOST || "127.0.0.1";
const port = parseInt(process.env.PGPORT || "5432", 10);
const timeoutMs = parseInt(process.env.PG_WAIT_MS || "90000", 10);
const deadline = Date.now() + timeoutMs;

function tryOnce() {
  return new Promise((resolve, reject) => {
    const s = net.connect({ host, port }, () => {
      s.end();
      resolve();
    });
    s.setTimeout(2000);
    s.on("error", () => reject(new Error("connect")));
    s.on("timeout", () => {
      s.destroy();
      reject(new Error("timeout"));
    });
  });
}

// eslint-disable-next-line no-console
console.log(`[wait-for-pg] À espera de ${host}:${port} (máx. ${timeoutMs / 1000}s)…`);

while (Date.now() < deadline) {
  try {
    await tryOnce();
    // eslint-disable-next-line no-console
    console.log(`[wait-for-pg] Pronto.`);
    process.exit(0);
  } catch {
    await new Promise((r) => setTimeout(r, 400));
  }
}

// eslint-disable-next-line no-console
console.error(`[wait-for-pg] Timeout. Confirme: Docker Desktop ligado e "npm run db:up".`);
process.exit(1);
