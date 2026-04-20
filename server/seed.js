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

const { email: DEMO_OWNER_EMAIL, password: DEMO_OWNER_PASSWORD, name: DEMO_OWNER_NAME } =
  demoOwnerDefaults();

/** BD antiga pode não ter todas as tabelas (migrações só na API). */
async function deleteFromIfTableExists(tableSqlIdent) {
  try {
    await query(`delete from ${tableSqlIdent}`);
  } catch (e) {
    if (e && typeof e === "object" && "code" in e && e.code === "42P01") return;
    throw e;
  }
}

async function main() {
  const ownerId = await ensureDemoOwner(query, bcrypt, {
    email: DEMO_OWNER_EMAIL,
    password: DEMO_OWNER_PASSWORD,
    name: DEMO_OWNER_NAME,
  });

  // Limpa somente barcos/relacionamentos (mantém users e outras tabelas)
  await deleteFromIfTableExists("stripe_connect_ledger");
  await deleteFromIfTableExists("stripe_owner_penalties");
  await deleteFromIfTableExists("stripe_connect_refunds");
  await deleteFromIfTableExists("stripe_connect_transfers");
  await deleteFromIfTableExists("stripe_events");
  await deleteFromIfTableExists("payments");
  await deleteFromIfTableExists("bookings");
  await deleteFromIfTableExists("user_boat_favorites");
  await deleteFromIfTableExists("boat_date_locks");
  await deleteFromIfTableExists("boat_weekday_locks");
  await query(`delete from boat_images`);
  await query(`delete from boat_amenities`);
  await query(`delete from embark_locations`);
  await query(`delete from boats`);

  const boats = generateDemoBoats(30);
  await persistBoatsForOwner(query, ownerId, boats);

  // eslint-disable-next-line no-console
  console.log("Seed concluído.");
  // eslint-disable-next-line no-console
  console.log("Locador demo:", DEMO_OWNER_EMAIL, "/", DEMO_OWNER_PASSWORD);
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});
