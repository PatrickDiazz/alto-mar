import { randomUUID } from "node:crypto";

const JET_SKI_DEMO_IMAGES = ["/assets/moto_aquatica_exterior.png"];

/**
 * Perfil de opcionais para frota demo — variedade estável por índice.
 * @param {number} index
 * @param {string} boatType
 */
export function demoBoatOptionalsProfile(index, boatType) {
  if (boatType === "Moto aquática") {
    const bbq = index % 3 !== 0;
    return {
      bbqOffered: bbq,
      jetSkiOffered: false,
      jetSkiPriceCents: 0,
      jetSkiImageUrls: [],
      jetSkiDocumentUrl: null,
      customOptionals: [],
    };
  }

  const bucket = index % 4;
  if (bucket === 0) {
    return {
      bbqOffered: false,
      jetSkiOffered: false,
      jetSkiPriceCents: 0,
      jetSkiImageUrls: [],
      jetSkiDocumentUrl: null,
      customOptionals: [],
    };
  }
  if (bucket === 1) {
    return {
      bbqOffered: true,
      jetSkiOffered: false,
      jetSkiPriceCents: 0,
      jetSkiImageUrls: [],
      jetSkiDocumentUrl: null,
      customOptionals: [],
    };
  }
  if (bucket === 2) {
    return {
      bbqOffered: true,
      jetSkiOffered: true,
      jetSkiPriceCents: 35000,
      jetSkiImageUrls: JET_SKI_DEMO_IMAGES,
      jetSkiDocumentUrl: null,
      customOptionals: [
        {
          id: randomUUID(),
          title: "Tapete flutuante",
          description: "Tapete inflável para relaxar na água",
          priceCents: 8000,
          imageUrls: ["/assets/lancha_inflavel_exterior.png"],
        },
      ],
    };
  }
  return {
    bbqOffered: true,
    jetSkiOffered: false,
    jetSkiPriceCents: 0,
    jetSkiImageUrls: [],
    jetSkiDocumentUrl: null,
    customOptionals: [
      {
        id: randomUUID(),
        title: "Stand up paddle (SUP)",
        description: "Prancha e remo para 2 pessoas",
        priceCents: 12000,
        imageUrls: ["/assets/lancha_exterior.png"],
      },
      {
        id: randomUUID(),
        title: "Tapete flutuante",
        description: "Tapete inflável para relaxar na água",
        priceCents: 8000,
        imageUrls: ["/assets/lancha_inflavel_exterior.png"],
      },
    ],
  };
}

/**
 * Aplica perfis de opcionais em todas as embarcações do locador demo.
 * @param {typeof import("./db.js").query} query
 */
export async function applyDemoFleetOptionalsVariety(query) {
  const email = process.env.DEMO_OWNER_EMAIL || "locatario@demo.com";
  const owner = await query(`select id from users where email = $1 limit 1`, [email]);
  if (!owner.rows[0]) return;

  const boats = await query(
    `select id, type from boats where owner_user_id = $1 order by created_at asc, name asc`,
    [owner.rows[0].id]
  );

  for (let i = 0; i < boats.rows.length; i++) {
    const p = demoBoatOptionalsProfile(i, boats.rows[i].type);
    await query(
      `update boats
       set bbq_offered = $2,
           jet_ski_offered = $3,
           jet_ski_price_cents = $4,
           jet_ski_image_urls = $5,
           jet_ski_document_url = $6,
           custom_optionals = $7::jsonb
       where id = $1`,
      [
        boats.rows[i].id,
        p.bbqOffered,
        p.jetSkiOffered,
        p.jetSkiPriceCents,
        p.jetSkiImageUrls,
        p.jetSkiDocumentUrl,
        JSON.stringify(p.customOptionals),
      ]
    );
  }
}
