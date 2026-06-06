#!/usr/bin/env node
/**
 * Audita server/.env para go-live Stripe — nunca imprime valores completos.
 */
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const envPath = path.join(root, ".env");

if (!fs.existsSync(envPath)) {
  console.error("✗ server/.env não encontrado. Copie de .env.example");
  process.exit(1);
}

dotenv.config({ path: envPath });

const REQUIRED = [
  "PAYMENTS_PROVIDER",
  "STRIPE_SECRET_KEY",
  "STRIPE_PUBLISHABLE_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "DATABASE_URL",
  "FRONTEND_URL",
];

const RECOMMENDED = [
  "PLATFORM_FEE_PERCENT",
  "STRIPE_CARD_FEE_PERCENT",
  "STRIPE_CARD_FEE_FIXED_CENTS",
  "STRIPE_CRON_ENABLED",
  "STRIPE_CHECKOUT_EXPIRY_MINUTES",
  "STRIPE_TRANSFER_MAX_RETRIES",
];

function maskSecret(value) {
  const v = String(value || "").trim();
  if (!v) return "(vazio)";
  if (v.length <= 8) return "****";
  return `${v.slice(0, 7)}…${v.slice(-4)} (${v.length} chars)`;
}

function classifyStripeKey(value) {
  const v = String(value || "").trim();
  if (!v) return "missing";
  if (v.startsWith("sk_live_")) return "LIVE ⚠";
  if (v.startsWith("sk_test_")) return "test";
  if (v.startsWith("pk_live_")) return "LIVE ⚠";
  if (v.startsWith("pk_test_")) return "test";
  if (v.startsWith("whsec_")) return "webhook";
  return "unknown format";
}

console.log("\n=== Auditoria Stripe (.env) ===\n");

let issues = 0;

for (const key of REQUIRED) {
  const raw = process.env[key];
  const set = raw != null && String(raw).trim() !== "";
  if (!set) {
    console.log(`  ✗ ${key} — OBRIGATÓRIO, não definido`);
    issues++;
    continue;
  }
  let extra = "";
  if (key.startsWith("STRIPE_") && key.includes("KEY")) {
    extra = ` [${classifyStripeKey(raw)}] ${maskSecret(raw)}`;
  } else if (key === "STRIPE_WEBHOOK_SECRET") {
    const v = String(raw).trim();
    extra = ` ${maskSecret(raw)}`;
    if (!v.startsWith("whsec_")) {
      console.log(`  ✗ ${key}${extra} — deve começar por whsec_ (não URL do endpoint)`);
      issues++;
      continue;
    }
  } else if (key === "PAYMENTS_PROVIDER") {
    extra = ` = ${String(raw).trim()}`;
    if (String(raw).trim().toLowerCase() !== "stripe") {
      console.log(`  ⚠ ${key}${extra} — esperado "stripe"`);
      issues++;
      continue;
    }
  } else if (key === "DATABASE_URL") {
    extra = " (definido)";
  } else {
    extra = ` = ${String(raw).trim().slice(0, 60)}`;
  }
  console.log(`  ✓ ${key}${extra}`);
}

console.log("\nRecomendados:");
for (const key of RECOMMENDED) {
  const raw = process.env[key];
  const set = raw != null && String(raw).trim() !== "";
  console.log(`  ${set ? "✓" : "○"} ${key}${set ? ` = ${String(raw).trim()}` : " (default no código)"}`);
}

const sk = process.env.STRIPE_SECRET_KEY || "";
const pk = process.env.STRIPE_PUBLISHABLE_KEY || "";
const skMode = sk.startsWith("sk_live_") ? "live" : sk.startsWith("sk_test_") ? "test" : "?";
const pkMode = pk.startsWith("pk_live_") ? "live" : pk.startsWith("pk_test_") ? "test" : "?";

console.log("\nModo das chaves:");
console.log(`  Secret:      ${skMode}`);
console.log(`  Publishable: ${pkMode}`);

if (skMode !== pkMode && skMode !== "?" && pkMode !== "?") {
  console.log("  ✗ Secret e Publishable em modos diferentes (test vs live)!");
  issues++;
}

if (skMode === "live" || pkMode === "live") {
  console.log("\n  ⚠ Chaves LIVE detectadas — confirme webhook de produção no Dashboard.");
} else if (skMode === "test") {
  console.log("\n  → Modo teste OK para desenvolvimento local + Stripe CLI.");
}

console.log(`\n=== ${issues === 0 ? "Pronto para testes" : `${issues} problema(s) a corrigir`} ===\n`);
process.exit(issues > 0 ? 1 : 0);
