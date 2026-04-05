/**
 * Actualiza fotos em `boat_images` a partir do tipo de barco (pack PNG em /public/assets).
 * Não apaga reservas nem outros dados.
 *
 * Por omissão: só barcos do utilizador DEMO_OWNER_EMAIL (locador demo).
 * Produção: define REFRESH_ALL_BOAT_IMAGES=1 para todos os barcos (sobrescreve fotos de todos os donos).
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
const refreshAll = /^1|true|yes$/i.test(String(process.env.REFRESH_ALL_BOAT_IMAGES || "").trim());

function maskDatabaseUrl(url) {
  if (!url || typeof url !== "string") return "(sem DATABASE_URL)";
  try {
    const u = new URL(url);
    return `${u.protocol}//${u.hostname}:${u.port || "(default)"}/${u.pathname.replace(/^\//, "").split("/")[0] || "…"}`;
  } catch {
    return "(DATABASE_URL inválida)";
  }
}

async function main() {
  // eslint-disable-next-line no-console
  console.log("BD:", maskDatabaseUrl(process.env.DATABASE_URL), refreshAll ? "| modo: TODOS os barcos" : `| modo: só dono ${DEMO_OWNER_EMAIL}`);

  let boats;
  if (refreshAll) {
    boats = await query(`select id, type from boats order by id`);
  } else {
    const owner = await query(`select id from users where email = $1 limit 1`, [DEMO_OWNER_EMAIL]);
    if (!owner.rows[0]) {
      // eslint-disable-next-line no-console
      console.error(`Nenhum utilizador com email ${DEMO_OWNER_EMAIL}. Corra o seed, ajuste DEMO_OWNER_EMAIL, ou use REFRESH_ALL_BOAT_IMAGES=1.`);
      process.exit(1);
    }
    const ownerId = owner.rows[0].id;
    boats = await query(`select id, type from boats where owner_user_id = $1 order by id`, [ownerId]);
  }

  if (boats.rows.length === 0) {
    // eslint-disable-next-line no-console
    console.log("Nenhum barco encontrado; nada a fazer.");
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
  console.log(
    refreshAll
      ? `Imagens actualizadas para ${boats.rows.length} barco(s) (todos os donos).`
      : `Imagens actualizadas para ${boats.rows.length} barco(s) do demo (${DEMO_OWNER_EMAIL}).`
  );
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});
