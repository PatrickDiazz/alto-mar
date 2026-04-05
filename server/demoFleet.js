/**
 * Geração e persistência da frota fictícia do locador demo (imagens = boatDemoImages).
 */
import { imagesForBoatType } from "./boatDemoImages.js";

/**
 * @param {number} count — mínimo recomendado: 30
 */
export function generateDemoBoats(count) {
  const n = Math.max(1, Math.floor(Number(count)) || 30);
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

  return Array.from({ length: n }, (_, i) => {
    const num = i + 1;
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
        ? `Lancha Maré ${num}`
        : tipo === "Veleiro"
          ? `Veleiro Brisa ${num}`
          : tipo === "Catamarã"
            ? `Catamarã Atlântico ${num}`
            : tipo === "Iate"
              ? `Iate Aurora ${num}`
              : tipo === "Escuna"
                ? `Escuna Encanto ${num}`
                : tipo === "Moto aquática"
                  ? `Moto aquática Splash ${num}`
                  : tipo === "Saveiro"
                    ? `Saveiro Caiçara ${num}`
                    : tipo === "Lancha inflável"
                      ? `Lancha inflável Onda ${num}`
                      : `Embarcação Demo ${num}`;

    const images = imagesForBoatType(tipo);

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

async function upsertAmenity(query, name) {
  const res = await query(
    `insert into amenities (name) values ($1)
     on conflict (name) do update set name = excluded.name
     returning id`,
    [name]
  );
  return res.rows[0].id;
}

/**
 * @param {typeof import("./db.js").query} query
 */
export async function persistBoatsForOwner(query, ownerId, boats) {
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
      await query(`insert into boat_images (boat_id, url, sort) values ($1, $2, $3)`, [
        boatId,
        b.images[i],
        i,
      ]);
    }

    for (const loc of b.embark_locations) {
      await query(`insert into embark_locations (boat_id, name) values ($1, $2)`, [boatId, loc]);
    }

    for (const a of b.amenities) {
      const amenityId = await upsertAmenity(query, a.name);
      await query(
        `insert into boat_amenities (boat_id, amenity_id, included)
         values ($1, $2, $3)
         on conflict (boat_id, amenity_id) do update set included = excluded.included`,
        [boatId, amenityId, a.included]
      );
    }
  }
}

/**
 * Garante utilizador locador demo (cria ou actualiza senha/nome/role).
 * @param {typeof import("./db.js").query} query
 */
export async function ensureDemoOwner(query, bcrypt, opts = {}) {
  const email = opts.email ?? process.env.DEMO_OWNER_EMAIL ?? "locatario@demo.com";
  const password = opts.password ?? process.env.DEMO_OWNER_PASSWORD ?? "123456";
  const name = opts.name ?? process.env.DEMO_OWNER_NAME ?? "Locador Demo";

  const hash = await bcrypt.hash(password, 10);
  const existing = await query(`select id from users where email = $1 limit 1`, [email]);
  if (existing.rows[0]) {
    await query(
      `update users set password_hash = $1, role = 'locatario', name = $2 where email = $3`,
      [hash, name, email]
    );
    return existing.rows[0].id;
  }

  const created = await query(
    `insert into users (name, email, password_hash, role)
     values ($1, $2, $3, 'locatario')
     returning id`,
    [name, email, hash]
  );
  return created.rows[0].id;
}

/** Lê env no momento da chamada (depois de dotenv.config no entrypoint). */
export function demoOwnerDefaults() {
  return {
    email: process.env.DEMO_OWNER_EMAIL || "locatario@demo.com",
    password: process.env.DEMO_OWNER_PASSWORD || "123456",
    name: process.env.DEMO_OWNER_NAME || "Locador Demo",
  };
}
