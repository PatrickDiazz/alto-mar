#!/usr/bin/env node
/**
 * Smoke test Stripe Connect v7 — módulos, BD (se disponível) e endpoints HTTP (se API a correr).
 * Uso: npm run stripe:smoke   (a partir de server/)
 */
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", ".env") });

const API_URL = (process.env.API_URL || "http://127.0.0.1:3001").replace(/\/$/, "");
const results = [];

function pass(name, detail = "") {
  results.push({ ok: true, name, detail });
  console.log(`  ✓ ${name}${detail ? ` — ${detail}` : ""}`);
}

function fail(name, detail = "") {
  results.push({ ok: false, name, detail });
  console.error(`  ✗ ${name}${detail ? ` — ${detail}` : ""}`);
}

console.log("\n=== Stripe Connect v7 — smoke test ===\n");

// 1) Imports
console.log("1) Módulos");
try {
  await import("./cancellationPolicy.js");
  pass("cancellationPolicy.js");
  await import("./transferWorker.js");
  pass("transferWorker.js");
  await import("./connectStatus.js");
  pass("connectStatus.js");
  await import("./penalties.js");
  pass("penalties.js");
  await import("./ownerCancel.js");
  pass("ownerCancel.js");
  await import("./refundWebhookHandlers.js");
  pass("refundWebhookHandlers.js");
  await import("./disputes.js");
  pass("disputes.js");
  await import("./metrics.js");
  pass("metrics.js");
  await import("../jobs/stripeCron.js");
  pass("jobs/stripeCron.js");
} catch (e) {
  fail("imports", e instanceof Error ? e.message : String(e));
}

// 2) Política de cancelamento
console.log("\n2) Política de cancelamento");
try {
  const { calculateRefundAmount, getRefundPercentage, canCancelBooking } = await import(
    "./cancellationPolicy.js"
  );
  if (getRefundPercentage(200) !== 100) throw new Error("7+ dias");
  if (getRefundPercentage(72) !== 50) throw new Error("2-6 dias");
  if (getRefundPercentage(24) !== 0) throw new Error("<48h");
  const owner = calculateRefundAmount({
    totalCents: 100_000,
    ownerNetCents: 85_000,
    hoursUntilService: 100,
    initiatedBy: "owner",
  });
  if (owner.ownerPenaltyCents !== 17_000) throw new Error("multa 20%");
  if (!canCancelBooking("ACCEPTED")) throw new Error("canCancelBooking");
  pass("regras 7/50/0 + multa 20%");
} catch (e) {
  fail("cancellationPolicy", e instanceof Error ? e.message : String(e));
}

// 3) Base de dados
console.log("\n3) Base de dados");
let dbOk = false;
try {
  const { query } = await import("../db.js");
  await query("select 1 as ok");
  pass("conexão PostgreSQL");

  const { ensureStripeConnectSchema } = await import("./schema.js");
  await ensureStripeConnectSchema();
  pass("ensureStripeConnectSchema");

  const fn = await query(`select get_refund_percentage(200::float) as p, can_cancel_booking('ACCEPTED') as c`);
  if (Number(fn.rows[0]?.p) !== 100 || fn.rows[0]?.c !== true) {
    throw new Error("funções SQL");
  }
  pass("funções SQL get_refund_percentage / can_cancel_booking");

  const tables = await query(`
    select tablename from pg_tables
    where schemaname = 'public'
      and tablename in (
        'stripe_events', 'stripe_connect_transfers', 'stripe_connect_ledger',
        'stripe_connect_refunds', 'stripe_owner_penalties', 'stripe_disputes'
      )
  `);
  if (tables.rows.length < 6) {
    throw new Error(`tabelas Stripe: ${tables.rows.length}/6`);
  }
  pass("tabelas Stripe v7", `${tables.rows.length}/6`);

  const { fetchStripeConnectMetrics } = await import("./metrics.js");
  const m = await fetchStripeConnectMetrics();
  pass("métricas", `transfers_24h_fail=${m.transfer_failures_24h}`);

  dbOk = true;
} catch (e) {
  const msg = e instanceof Error ? e.message : String(e);
  fail("PostgreSQL", msg);
  console.log("     → Inicie Docker Desktop e `npm run db:up` ou configure DATABASE_URL.");
}

// 4) HTTP (API a correr)
console.log("\n4) API HTTP");
try {
  const health = await fetch(`${API_URL}/api/health`, { signal: AbortSignal.timeout(5000) });
  if (!health.ok) throw new Error(`health ${health.status}`);
  const h = await health.json();
  if (!h.ok) throw new Error("health ok=false");
  pass("/api/health", h.db === "connected" ? "DB ligada" : "DB desligada");

  const cfg = await fetch(`${API_URL}/api/public/app-config`, { signal: AbortSignal.timeout(5000) });
  const appCfg = await cfg.json();
  pass("/api/public/app-config", `paymentsProvider=${appCfg.paymentsProvider}`);

  if (appCfg.paymentsProvider === "stripe") {
    pass("modo Stripe activo");
  } else {
    fail("PAYMENTS_PROVIDER", `actual=${appCfg.paymentsProvider} (defina stripe no .env)`);
  }
} catch (e) {
  fail("API HTTP", e instanceof Error ? e.message : String(e));
  console.log("     → Inicie a API: npm run dev:server");
}

// Resumo
const ok = results.filter((r) => r.ok).length;
const n = results.length;
console.log(`\n=== Resultado: ${ok}/${n} checks OK ===\n`);
process.exit(ok === n ? 0 : 1);
