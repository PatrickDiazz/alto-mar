import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { Pool } from "pg";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, ".env") });

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  // eslint-disable-next-line no-console
  console.error("Missing DATABASE_URL in server environment.");
}

/** Códigos / mensagens comuns quando o Postgres ou o proxy fecham a ligação (nuvem, sleep, rede). */
const TRANSIENT_PG_CODES = new Set([
  "57P01", // admin_shutdown
  "57P02", // crash_shutdown
  "57P03", // cannot_connect_now
  "08003", // connection_does_not_exist
  "08006", // connection_failure
  "08001", // sqlclient_unable_to_establish_sqlconnection
  "53300", // too_many_connections
]);

function isTransientDbError(err) {
  if (!err || typeof err !== "object") return false;
  if (TRANSIENT_PG_CODES.has(err.code)) return true;
  const msg = String(err.message || "").toLowerCase();
  return (
    msg.includes("econnreset") ||
    msg.includes("econnrefused") ||
    msg.includes("etimedout") ||
    msg.includes("timeout exceeded") ||
    msg.includes("connection terminated") ||
    msg.includes("the server closed the connection") ||
    msg.includes("socket hang up") ||
    msg.includes("broken pipe") ||
    msg.includes("connection terminated unexpectedly") ||
    msg.includes("no connection to the server")
  );
}

function buildPoolConfig() {
  const cfg = {
    connectionString: DATABASE_URL,
    max: Math.min(20, Math.max(2, Number(process.env.PG_POOL_MAX || 10))),
    idleTimeoutMillis: Number(process.env.PG_IDLE_TIMEOUT_MS || 30000),
    connectionTimeoutMillis: Number(process.env.PG_CONNECTION_TIMEOUT_MS || 20000),
    /** Evita ligações “mortas” após idle (sleep do PC, Postgres a reiniciar). */
    keepAlive: true,
    keepAliveInitialDelayMillis: Number(process.env.PG_KEEPALIVE_INITIAL_MS || 10000),
  };

  /**
   * Neon / Railway / alguns proxies corporativos: falha de certificado TLS.
   * Só ative com DATABASE_SSL_REJECT_UNAUTHORIZED=0 (sabe o risco).
   */
  if (process.env.DATABASE_SSL_REJECT_UNAUTHORIZED === "0") {
    cfg.ssl = { rejectUnauthorized: false };
  }

  return cfg;
}

export const pool = new Pool(buildPoolConfig());

pool.on("error", (err) => {
  // eslint-disable-next-line no-console
  console.error("[pg] Erro inesperado num cliente do pool (idle):", err.message || err);
});

export async function query(sql, params) {
  const attempts = Math.min(8, Math.max(1, Number(process.env.PG_QUERY_RETRY_ATTEMPTS || 5)));
  let last;
  for (let i = 1; i <= attempts; i++) {
    try {
      return await pool.query(sql, params);
    } catch (e) {
      last = e;
      if (!isTransientDbError(e) || i === attempts) {
        throw e;
      }
      const delayMs = Math.min(1500, 100 * i * i);
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  throw last;
}
