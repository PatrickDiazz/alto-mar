import { query } from "../db.js";

export const DEFAULT_BOAT_REJECTION_MACROS = [
  {
    code: "DOC_INVALID",
    category: "boat_rejection",
    title: "Documentação inválida",
    body: "Não foi possível aprovar sua embarcação porque a documentação enviada está inválida, ilegível ou vencida.",
  },
  {
    code: "DOC_INCOMPLETE",
    category: "boat_rejection",
    title: "Documentação incompleta",
    body: "Identificamos ausência de documentos obrigatórios para conclusão da análise.",
  },
  {
    code: "PHOTOS_INADEQUATE",
    category: "boat_rejection",
    title: "Fotos inadequadas",
    body: "As fotos enviadas não atendem aos padrões mínimos exigidos pela plataforma.",
  },
  {
    code: "INFO_INCONSISTENT",
    category: "boat_rejection",
    title: "Informações inconsistentes",
    body: "Foram encontradas divergências entre os dados cadastrados e a documentação enviada.",
  },
  {
    code: "WRONG_CATEGORY",
    category: "boat_rejection",
    title: "Categoria incorreta",
    body: "A embarcação foi cadastrada em uma categoria incompatível.",
  },
  {
    code: "POLICY_VIOLATION",
    category: "boat_rejection",
    title: "Violação das políticas",
    body: "A embarcação não atende aos requisitos operacionais da Alto Mar.",
  },
  {
    code: "FRAUD_SUSPECT",
    category: "boat_rejection",
    title: "Suspeita de fraude",
    body: "Foram identificadas inconsistências que exigem validação adicional.",
  },
];

export async function ensureDefaultMacros() {
  for (const m of DEFAULT_BOAT_REJECTION_MACROS) {
    await query(
      `insert into admin_macros (code, category, title, body)
       values ($1, $2, $3, $4)
       on conflict (code) do nothing`,
      [m.code, m.category, m.title, m.body]
    );
  }
}

/** @param {{ category?: string; activeOnly?: boolean }} opts */
export async function listMacros(opts = {}) {
  const params = [];
  const parts = ["1=1"];
  if (opts.category) {
    params.push(opts.category);
    parts.push(`category = $${params.length}`);
  }
  if (opts.activeOnly !== false) {
    parts.push("active = true");
  }
  const r = await query(
    `select id, code, category, title, body, active, created_at
     from admin_macros
     where ${parts.join(" and ")}
     order by category asc, title asc`,
    params
  );
  return r.rows.map((row) => ({
    id: row.id,
    code: row.code,
    category: row.category,
    title: row.title,
    body: row.body,
    active: row.active,
    createdAt: row.created_at,
  }));
}

/** @param {{ code: string; category: string; title: string; body: string }} input */
export async function createMacro(input) {
  const r = await query(
    `insert into admin_macros (code, category, title, body)
     values ($1, $2, $3, $4)
     returning id, code, category, title, body, active, created_at`,
    [input.code, input.category, input.title, input.body]
  );
  return r.rows[0];
}

/** @param {string} id @param {{ title?: string; body?: string; active?: boolean }} patch */
export async function updateMacro(id, patch) {
  const r = await query(
    `update admin_macros
     set title = coalesce($2, title),
         body = coalesce($3, body),
         active = coalesce($4, active)
     where id = $1::uuid
     returning id, code, category, title, body, active, created_at`,
    [id, patch.title ?? null, patch.body ?? null, patch.active ?? null]
  );
  return r.rows[0] ?? null;
}

/** @param {string} code */
export async function getMacroByCode(code) {
  const r = await query(
    `select id, code, category, title, body, active from admin_macros where code = $1 limit 1`,
    [code]
  );
  return r.rows[0] ?? null;
}
