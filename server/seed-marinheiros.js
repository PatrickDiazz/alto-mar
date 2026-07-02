/**
 * Vincula tripulação demo a todas as embarcações existentes.
 * Uso: npm --prefix server run seed:marinheiros
 */
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import bcrypt from "bcryptjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, ".env") });

import { query } from "./db.js";
import {
  applyDemoMarinheirosToAllBoats,
  demoMarinheiroLoginHint,
  DEMO_CREW_TEMPLATES,
} from "./demoMarinheiros.js";
import { demoOwnerDefaults } from "./demoFleet.js";

async function main() {
  const stats = await applyDemoMarinheirosToAllBoats(query, bcrypt);

  if (stats.boats === 0) {
    console.log("Nenhuma embarcação na base. Execute npm run db:seed primeiro.");
    process.exit(1);
  }

  const { email: ownerEmail } = demoOwnerDefaults();
  const owner = await query(`select id from users where email = $1 limit 1`, [ownerEmail]);
  const hint = owner.rows[0] ? demoMarinheiroLoginHint(owner.rows[0].id) : null;

  console.log("Tripulação demo aplicada:");
  console.log(`  Locadores: ${stats.owners}`);
  console.log(`  Embarcações vinculadas: ${stats.boats}`);
  console.log(`  Marinheiros por locador: ${stats.crewPerOwner}`);
  console.log("Profissionais:", DEMO_CREW_TEMPLATES.map((c) => `${c.name} (${c.funcao})`).join(", "));
  if (hint) {
    console.log("Login marinheiro (exemplo):", hint.email, "/", hint.password);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
