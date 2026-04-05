import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, ".env") });
import bcrypt from "bcryptjs";
import { query } from "./db.js";

const DEMO_OWNER_EMAIL = process.env.DEMO_OWNER_EMAIL || "locatario@demo.com";
const DEMO_OWNER_PASSWORD = process.env.DEMO_OWNER_PASSWORD || "123456";
const DEMO_OWNER_NAME = process.env.DEMO_OWNER_NAME || "Locador Demo";

function hashToUnit(seed) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 2 ** 32;
}

function generateBoats() {
  const tipos = [
    "Lancha",
    "Veleiro",
    "Catamarã",
    "Iate",
    "Escuna",
    "Moto aquática",
    "Saveiro",
    "Lancha inflável",
  ];
  const regioes = ["Angra dos Reis/RJ", "Paraty/RJ", "Ilha Grande/RJ", "Mangaratiba/RJ", "Ubatuba/SP"];
  const locais = {
    "Angra dos Reis/RJ": ["Marina de Angra", "Cais de Santa Luzia", "Pier do Frade"],
    "Paraty/RJ": ["Marina de Paraty", "Cais do Porto"],
    "Ilha Grande/RJ": ["Marina de Angra", "Cais de Santa Luzia"],
    "Mangaratiba/RJ": ["Marina de Angra", "Cais de Santa Luzia"],
    "Ubatuba/SP": ["Saco da Ribeira", "Marina do Itaguá"],
  };

  // Mesmas imagens do começo do app (exterior, interior, banheiro) em public/assets
  const boatExterior = "/assets/boat-exterior.jpg";
  const boatInterior = "/assets/boat-interior.jpg";
  const boatBathroom = "/assets/boat-bathroom.jpg";
  const imageSets = [
    [boatBathroom, boatExterior, boatInterior],
    [boatExterior, boatInterior],
    [boatBathroom, boatExterior, boatInterior],
  ];

  return Array.from({ length: 30 }, (_, i) => {
    const n = i + 1;
    const tipo = tipos[i % tipos.length];
    const reg = regioes[i % regioes.length];
    const capacity =
      tipo === "Moto aquática" ? 2 : [6, 8, 10, 12, 16][i % 5];
    const sizeFeet =
      tipo === "Moto aquática" ? 12 : [22, 25, 28, 32, 36][i % 5];
    const price =
      1800 +
      (i % 9) * 350 +
      (tipo === "Iate" ? 1200 : 0) -
      (tipo === "Moto aquática" ? 900 : 0);
    const rating = Math.min(5, 4.1 + (i % 8) * 0.1);

    const name =
      tipo === "Lancha"
        ? `Lancha Maré ${n}`
        : tipo === "Veleiro"
          ? `Veleiro Brisa ${n}`
          : tipo === "Catamarã"
            ? `Catamarã Atlântico ${n}`
            : tipo === "Iate"
              ? `Iate Aurora ${n}`
              : tipo === "Escuna"
                ? `Escuna Encanto ${n}`
                : tipo === "Moto aquática"
                  ? `Moto aquática Splash ${n}`
                  : tipo === "Saveiro"
                    ? `Saveiro Caiçara ${n}`
                    : tipo === "Lancha inflável"
                      ? `Lancha inflável Onda ${n}`
                      : `Embarcação Demo ${n}`;

    const images = imageSets[i % imageSets.length];

    return {
      name,
      location_text: reg,
      price_cents: Math.round(price * 100),
      rating: Number(rating.toFixed(1)),
      size_feet: sizeFeet,
      capacity,
      type: tipo,
      description:
        "Embarcação fictícia para demonstração. Roteiro personalizado conforme o clima e a maré.",
      verified: i % 4 !== 0,
      images,
      embark_locations: locais[reg] || [],
      amenities: [
        { name: "Carvão", included: i % 2 === 0 },
        { name: "Gelo", included: true },
        { name: "Banho com água doce", included: i % 3 === 0 },
        { name: "Cooler", included: true },
        { name: "Som Bluetooth", included: i % 2 !== 0 },
        { name: "Coletes salva-vidas", included: true },
      ],
    };
  });
}

async function ensureDemoOwner() {
  const hash = await bcrypt.hash(DEMO_OWNER_PASSWORD, 10);
  const existing = await query(`select id from users where email = $1 limit 1`, [DEMO_OWNER_EMAIL]);
  if (existing.rows[0]) {
    // Garante senha e perfil locador (role: locatario) após seed antigo ou testes
    await query(
      `update users set password_hash = $1, role = 'locatario', name = $2 where email = $3`,
      [hash, DEMO_OWNER_NAME, DEMO_OWNER_EMAIL]
    );
    return existing.rows[0].id;
  }

  const created = await query(
    `insert into users (name, email, password_hash, role)
     values ($1, $2, $3, 'locatario')
     returning id`,
    [DEMO_OWNER_NAME, DEMO_OWNER_EMAIL, hash]
  );
  return created.rows[0].id;
}

async function upsertAmenity(name) {
  const res = await query(
    `insert into amenities (name) values ($1)
     on conflict (name) do update set name = excluded.name
     returning id`,
    [name]
  );
  return res.rows[0].id;
}

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
  const ownerId = await ensureDemoOwner();

  // Limpa somente barcos/relacionamentos (mantém users e outras tabelas)
  await deleteFromIfTableExists("payments");
  await deleteFromIfTableExists("bookings");
  await deleteFromIfTableExists("user_boat_favorites");
  await deleteFromIfTableExists("boat_date_locks");
  await deleteFromIfTableExists("boat_weekday_locks");
  await query(`delete from boat_images`);
  await query(`delete from boat_amenities`);
  await query(`delete from embark_locations`);
  await query(`delete from boats`);

  const boats = generateBoats();
  for (const b of boats) {
    const inserted = await query(
      `insert into boats
        (owner_user_id, name, location_text, price_cents, rating, size_feet, capacity, type, description, verified)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       returning id`,
      [
        ownerId,
        b.name,
        b.location_text,
        b.price_cents,
        b.rating,
        b.size_feet,
        b.capacity,
        b.type,
        b.description,
        b.verified,
      ]
    );
    const boatId = inserted.rows[0].id;

    for (let i = 0; i < b.images.length; i++) {
      await query(
        `insert into boat_images (boat_id, url, sort) values ($1, $2, $3)`,
        [boatId, b.images[i], i]
      );
    }

    for (const loc of b.embark_locations) {
      await query(`insert into embark_locations (boat_id, name) values ($1, $2)`, [boatId, loc]);
    }

    for (const a of b.amenities) {
      const amenityId = await upsertAmenity(a.name);
      await query(
        `insert into boat_amenities (boat_id, amenity_id, included)
         values ($1, $2, $3)
         on conflict (boat_id, amenity_id) do update set included = excluded.included`,
        [boatId, amenityId, a.included]
      );
    }
  }

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

