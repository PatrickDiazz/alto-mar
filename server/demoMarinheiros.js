/**
 * Tripulação fictícia para demonstração — vinculada a todas as embarcações de cada locador.
 */
import { ensureMarinheirosSchema } from "./marinheiros/schema.js";

const DEMO_MARINHEIRO_PASSWORD = process.env.DEMO_MARINHEIRO_PASSWORD || "123456";
const PLACEHOLDER_DOC = "/assets/boat-exterior.jpg";

/** @type {Array<{ name: string; funcao: string; funcaoCustom?: string | null; bio: string; photo: string }>} */
export const DEMO_CREW_TEMPLATES = [
  {
    name: "João Silva",
    funcao: "CAPITAO",
    bio: "Capitão AMI com 15 anos de experiência na costa verde.",
    photo: "/assets/lancha_exterior.png",
  },
  {
    name: "Carlos Santos",
    funcao: "MARINHEIRO",
    bio: "Marinheiro costeiro; apoio em embarque e operação do passeio.",
    photo: "/assets/veleiro_exterior.png",
  },
  {
    name: "Pedro Costa",
    funcao: "GUIA_NAUTICO",
    bio: "Guia náutico especializado em Ilha Grande e Angra dos Reis.",
    photo: "/assets/iate_exterior.png",
  },
  {
    name: "Ana Ribeiro",
    funcao: "MESTRE",
    bio: "Mestre amador; instrutora de veleiro e navegação costeira.",
    photo: "/assets/catamara_exterior.png",
  },
  {
    name: "Lucas Mendes",
    funcao: "CONDUTOR",
    bio: "Condutor de lancha e embarcações esportivas.",
    photo: "/assets/moto_aquatica_exterior.png",
  },
  {
    name: "Marina Oliveira",
    funcao: "TRIPULANTE",
    bio: "Tripulação de apoio, segurança e hospitalidade a bordo.",
    photo: "/assets/saveiro_exterior.png",
  },
];

function demoMarinheiroEmail(index, ownerUserId) {
  const ownerShort = String(ownerUserId).replace(/-/g, "").slice(0, 8);
  return `marinheiro.demo.${index + 1}.${ownerShort}@altomar.local`;
}

function demoMarinheiroCpf(index, ownerUserId) {
  const ownerNum = parseInt(String(ownerUserId).replace(/-/g, "").slice(0, 8), 16) % 900000000;
  const base = 100000000 + index * 111111 + ownerNum;
  return String(base).padStart(11, "0").slice(0, 11);
}

function demoBirthDate(index) {
  const year = 1975 + (index % 20);
  const month = String((index % 12) + 1).padStart(2, "0");
  const day = String((index % 25) + 1).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Cria ou actualiza a tripulação demo de um locador.
 * @returns {Promise<string[]>} ids dos marinheiros
 */
export async function ensureDemoMarinheirosForOwner(query, bcrypt, ownerUserId) {
  const ids = [];

  for (let i = 0; i < DEMO_CREW_TEMPLATES.length; i++) {
    const t = DEMO_CREW_TEMPLATES[i];
    const email = demoMarinheiroEmail(i, ownerUserId);
    const cpf = demoMarinheiroCpf(i, ownerUserId);
    const birthDate = demoBirthDate(i);
    const phone = `(21) 9${String(8000 + i).padStart(4, "0")}-${String(1000 + i * 111).slice(-4)}`;

    let userId;
    const existingUser = await query(`select id from users where email = $1 limit 1`, [email]);
    if (existingUser.rows[0]) {
      userId = existingUser.rows[0].id;
      await query(`update users set name = $1, role = 'marinheiro' where id = $2`, [t.name, userId]);
    } else {
      const hash = await bcrypt.hash(DEMO_MARINHEIRO_PASSWORD, 10);
      const created = await query(
        `insert into users (name, email, password_hash, role)
         values ($1, $2, $3, 'marinheiro')
         returning id`,
        [t.name, email, hash]
      );
      userId = created.rows[0].id;
    }

    let marinheiroId;
    const existingProfile = await query(`select id from marinheiros where user_id = $1 limit 1`, [userId]);
    if (existingProfile.rows[0]) {
      marinheiroId = existingProfile.rows[0].id;
      await query(
        `update marinheiros set
           cpf = $2,
           phone = $3,
           photo_url = $4,
           funcao = $5::marinheiro_funcao,
           funcao_custom = $6,
           identity_doc_url = $7,
           nautical_cert_url = $8,
           approval_status = 'APROVADO',
           bio = $9,
           show_on_boat_detail = true,
           suspension_reason = null,
           updated_at = now()
         where id = $1`,
        [
          marinheiroId,
          cpf,
          phone,
          t.photo,
          t.funcao,
          null,
          PLACEHOLDER_DOC,
          PLACEHOLDER_DOC,
          t.bio,
        ]
      );
    } else {
      const inserted = await query(
        `insert into marinheiros (
           user_id, cpf, birth_date, phone, photo_url, funcao, funcao_custom,
           identity_doc_url, nautical_cert_url, approval_status, bio, show_on_boat_detail
         ) values (
           $1, $2, $3::date, $4, $5, $6::marinheiro_funcao, $7,
           $8, $9, 'APROVADO', $10, true
         )
         returning id`,
        [
          userId,
          cpf,
          birthDate,
          phone,
          t.photo,
          t.funcao,
          null,
          PLACEHOLDER_DOC,
          PLACEHOLDER_DOC,
          t.bio,
        ]
      );
      marinheiroId = inserted.rows[0].id;
    }

    await query(
      `insert into marinheiro_locadores (marinheiro_id, locador_user_id)
       values ($1, $2)
       on conflict do nothing`,
      [marinheiroId, ownerUserId]
    );

    ids.push(marinheiroId);
  }

  return ids;
}

async function linkMarinheirosToOwnerBoats(query, ownerUserId, marinheiroIds) {
  const boats = await query(
    `select id from boats where owner_user_id = $1::uuid order by name asc`,
    [ownerUserId]
  );
  for (let i = 0; i < boats.rows.length; i++) {
    const boat = boats.rows[i];
    await query(`delete from boat_marinheiros where boat_id = $1::uuid`, [boat.id]);
    const marinheiroId = marinheiroIds[i % marinheiroIds.length];
    await query(
      `insert into boat_marinheiros (boat_id, marinheiro_id)
       values ($1::uuid, $2::uuid)
       on conflict do nothing`,
      [boat.id, marinheiroId]
    );
  }
  return boats.rows.length;
}

/**
 * Garante tripulação demo em todas as embarcações de todos os locadores com frota.
 * Idempotente — seguro no arranque da API e no seed.
 */
export async function applyDemoMarinheirosToAllBoats(query, bcrypt) {
  await ensureMarinheirosSchema();

  const owners = await query(`select distinct owner_user_id from boats`);
  if (!owners.rows.length) {
    return { owners: 0, boats: 0, crewPerOwner: DEMO_CREW_TEMPLATES.length };
  }

  let totalBoats = 0;
  for (const row of owners.rows) {
    const ownerUserId = row.owner_user_id;
    const marinheiroIds = await ensureDemoMarinheirosForOwner(query, bcrypt, ownerUserId);
    totalBoats += await linkMarinheirosToOwnerBoats(query, ownerUserId, marinheiroIds);
  }

  return {
    owners: owners.rows.length,
    boats: totalBoats,
    crewPerOwner: DEMO_CREW_TEMPLATES.length,
  };
}

/** Credenciais do primeiro marinheiro demo (para logs). */
export function demoMarinheiroLoginHint(ownerUserId) {
  return {
    email: demoMarinheiroEmail(0, ownerUserId),
    password: DEMO_MARINHEIRO_PASSWORD,
  };
}
