/**
 * Remove todos os barcos do locador demo (e reservas/pagamentos desses barcos)
 * e recria a frota com imagens do pack (boatDemoImages).
 *
 * Não mexe em barcos de outros utilizadores.
 *
 *   npm --prefix server run reset-demo-boats
 *
 * Opcional: DEMO_FLEET_COUNT=40 (mínimo 30 se omitido ou inválido)
 */
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, ".env") });

import bcrypt from "bcryptjs";
import { query } from "./db.js";
import {
  demoOwnerDefaults,
  ensureDemoOwner,
  generateDemoBoats,
  persistBoatsForOwner,
} from "./demoFleet.js";

async function main() {
  const { email, password, name } = demoOwnerDefaults();

  const ownerId = await ensureDemoOwner(query, bcrypt, { email, password, name });

  const existing = await query(`select id from boats where owner_user_id = $1`, [ownerId]);
  const boatIds = existing.rows.map((r) => r.id);

  if (boatIds.length > 0) {
    await query(`delete from bookings where boat_id = any($1::uuid[])`, [boatIds]);
    await query(`delete from boats where owner_user_id = $1`, [ownerId]);
    // eslint-disable-next-line no-console
    console.log(`Removidos ${boatIds.length} barco(s) do demo e reservas associadas.`);
  } else {
    // eslint-disable-next-line no-console
    console.log("Nenhum barco anterior do locador demo.");
  }

  const envCount = Number.parseInt(String(process.env.DEMO_FLEET_COUNT || "").trim(), 10);
  const count = Number.isFinite(envCount) && envCount >= 30 ? envCount : 30;
  const boats = generateDemoBoats(count);
  await persistBoatsForOwner(query, ownerId, boats);

  // eslint-disable-next-line no-console
  console.log(`Criados ${boats.length} barco(s) para ${email} (imagens do pack).`);
  // eslint-disable-next-line no-console
  console.log("Login demo:", email, "/", password);
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});
