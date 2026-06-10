import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import bcrypt from "bcryptjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env") });

import { query } from "../db.js";
import { ensureAdminSchema } from "./schema.js";
import { ensureDefaultMacros } from "./macros.js";

const DEFAULT_ADMIN_EMAIL = process.env.ADMIN_SEED_EMAIL || "admin@altomar.local";
const DEFAULT_ADMIN_PASSWORD = process.env.ADMIN_SEED_PASSWORD || "Admin@AltoMar2026!";
const DEFAULT_ADMIN_NAME = process.env.ADMIN_SEED_NAME || "Admin Alto Mar";

async function main() {
  await ensureAdminSchema();
  await ensureDefaultMacros();

  const existing = await query(
    `select id from staff_users where email = $1::citext limit 1`,
    [DEFAULT_ADMIN_EMAIL]
  );
  if (existing.rows[0]) {
    // eslint-disable-next-line no-console
    console.log("Staff admin já existe:", DEFAULT_ADMIN_EMAIL);
    return;
  }

  const hash = await bcrypt.hash(DEFAULT_ADMIN_PASSWORD, 10);
  await query(
    `insert into staff_users (name, email, password_hash, role)
     values ($1, $2, $3, 'ADMIN'::staff_role)`,
    [DEFAULT_ADMIN_NAME, DEFAULT_ADMIN_EMAIL, hash]
  );

  // eslint-disable-next-line no-console
  console.log("Staff admin criado:");
  // eslint-disable-next-line no-console
  console.log("  Email:", DEFAULT_ADMIN_EMAIL);
  // eslint-disable-next-line no-console
  console.log("  Senha:", DEFAULT_ADMIN_PASSWORD);
  // eslint-disable-next-line no-console
  console.log("(Altere em produção via ADMIN_SEED_* ou painel admin.)");
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});
