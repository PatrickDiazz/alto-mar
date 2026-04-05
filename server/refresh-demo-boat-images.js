/**
 * Actualiza só as fotos em `boat_images` dos barcos do locador demo (DEMO_OWNER_EMAIL).
 * Não apaga reservas nem outros dados. Use na produção depois de deploy dos PNG em /assets.
 *
 *   npm --prefix server run refresh-demo-boat-images
 */
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, ".env") });

import { query } from "./db.js";
import { imagesForBoatType } from "./boatDemoImages.js";

const DEMO_OWNER_EMAIL = process.env.DEMO_OWNER_EMAIL || "locatario@demo.com";

async function main() {
  const owner = await query(`select id from users where email = $1 limit 1`, [DEMO_OWNER_EMAIL]);
  if (!owner.rows[0]) {
    // eslint-disable-next-line no-console
    console.error(`Nenhum utilizador com email ${DEMO_OWNER_EMAIL}. Corra o seed ou ajuste DEMO_OWNER_EMAIL.`);
    process.exit(1);
  }
  const ownerId = owner.rows[0].id;
  const boats = await query(`select id, type from boats where owner_user_id = $1 order by id`, [ownerId]);
  if (boats.rows.length === 0) {
    // eslint-disable-next-line no-console
    console.log("Nenhum barco do locador demo; nada a fazer.");
    return;
  }

  for (const row of boats.rows) {
    const urls = imagesForBoatType(row.type);
    await query(`delete from boat_images where boat_id = $1`, [row.id]);
    for (let i = 0; i < urls.length; i++) {
      await query(`insert into boat_images (boat_id, url, sort) values ($1, $2, $3)`, [
        row.id,
        urls[i],
        i,
      ]);
    }
  }

  // eslint-disable-next-line no-console
  console.log(`Imagens actualizadas para ${boats.rows.length} barco(s) do demo (${DEMO_OWNER_EMAIL}).`);
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});
