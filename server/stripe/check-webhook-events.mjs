#!/usr/bin/env node
/** Verifica últimos eventos webhook recebidos (stripe_events). */
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", ".env") });

const { query } = await import("../db.js");

const rows = await query(
  `select id, type, processed, received_at
   from stripe_events
   order by received_at desc
   limit 15`
);

console.log("\nÚltimos stripe_events:\n");
if (!rows.rows.length) {
  console.log("  (nenhum evento registado)");
} else {
  for (const r of rows.rows) {
    const mark = r.processed ? "✓" : "○";
    console.log(`  ${mark} ${r.type}  processed=${r.processed}  ${r.received_at}`);
  }
}
console.log("");
