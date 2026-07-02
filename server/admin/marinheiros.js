import { query, pool } from "../db.js";
import { notifyUser } from "../notifications/service.js";
import { writeAuditLog } from "./audit.js";
import { mapMarinheiroRow } from "../marinheiros/index.js";

/** @param {import('pg').QueryResultRow} row */
function mapMarinheiroReview(row) {
  const base = mapMarinheiroRow(row);
  return {
    ...base,
    locadores: row.locadores ?? [],
  };
}

/**
 * @param {{ status?: string; limit?: number; offset?: number }} opts
 */
export async function listMarinheiroReviewQueue(opts = {}) {
  const status = opts.status ?? "PENDENTE";
  const limit = Math.min(100, Math.max(1, opts.limit ?? 30));
  const offset = Math.max(0, opts.offset ?? 0);

  const r = await query(
    `select m.*, u.name as user_name, u.email as user_email,
            coalesce(
              (select json_agg(json_build_object('id', lu.id, 'name', lu.name, 'email', lu.email))
               from marinheiro_locadores ml
               join users lu on lu.id = ml.locador_user_id
               where ml.marinheiro_id = m.id),
              '[]'::json
            ) as locadores
     from marinheiros m
     join users u on u.id = m.user_id
     where m.approval_status = $1::marinheiro_approval_status
     order by m.created_at asc
     limit $2 offset $3`,
    [status, limit, offset]
  );
  return r.rows.map(mapMarinheiroReview);
}

/** @param {string} marinheiroId */
export async function getMarinheiroReviewDetail(marinheiroId) {
  const r = await query(
    `select m.*, u.name as user_name, u.email as user_email,
            coalesce(
              (select json_agg(json_build_object('id', lu.id, 'name', lu.name, 'email', lu.email))
               from marinheiro_locadores ml
               join users lu on lu.id = ml.locador_user_id
               where ml.marinheiro_id = m.id),
              '[]'::json
            ) as locadores
     from marinheiros m
     join users u on u.id = m.user_id
     where m.id = $1::uuid
     limit 1`,
    [marinheiroId]
  );
  const row = r.rows[0];
  if (!row) return null;

  const history = await query(
    `select h.id, h.action, h.reason, h.metadata, h.created_at, s.name as staff_name
     from marinheiro_review_history h
     left join staff_users s on s.id = h.staff_id
     where h.marinheiro_id = $1::uuid
     order by h.created_at desc
     limit 50`,
    [marinheiroId]
  );

  return {
    marinheiro: mapMarinheiroReview(row),
    history: history.rows.map((h) => ({
      id: h.id,
      action: h.action,
      reason: h.reason,
      metadata: h.metadata,
      createdAt: h.created_at,
      staffName: h.staff_name,
    })),
  };
}

function hasExpiredDocs(row) {
  const today = new Date().toISOString().slice(0, 10);
  if (row.identity_doc_expires_at && String(row.identity_doc_expires_at).slice(0, 10) < today) return true;
  if (row.nautical_cert_expires_at && String(row.nautical_cert_expires_at).slice(0, 10) < today) return true;
  return false;
}

async function recordHistory(client, marinheiroId, staffId, action, reason, metadata = {}) {
  await client.query(
    `insert into marinheiro_review_history (marinheiro_id, staff_id, action, reason, metadata)
     values ($1, $2, $3, $4, $5::jsonb)`,
    [marinheiroId, staffId, action, reason ?? null, JSON.stringify(metadata)]
  );
}

/** @param {string} marinheiroId @param {string} staffId @param {string|null} notes */
export async function approveMarinheiro(marinheiroId, staffId, notes = null) {
  const current = await query(`select * from marinheiros where id = $1::uuid`, [marinheiroId]);
  const row = current.rows[0];
  if (!row) return null;

  if (hasExpiredDocs(row)) {
    const err = new Error("Documentos vencidos impedem a aprovação.");
    err.code = "DOCS_EXPIRED";
    throw err;
  }

  const client = await pool.connect();
  try {
    await client.query("begin");
    await client.query(
      `update marinheiros
       set approval_status = 'APROVADO', review_notes = $2, reviewed_at = now(),
           reviewed_by_staff_id = $3, suspension_reason = null, updated_at = now()
       where id = $1::uuid`,
      [marinheiroId, notes, staffId]
    );
    await recordHistory(client, marinheiroId, staffId, "APPROVED", notes);
    await client.query("commit");
  } catch (e) {
    await client.query("rollback");
    throw e;
  } finally {
    client.release();
  }

  const user = await query(`select user_id from marinheiros where id = $1`, [marinheiroId]);
  const userId = user.rows[0]?.user_id;
  if (userId) {
    void notifyUser({
      userId,
      type: "MARINHEIRO_APPROVED",
      title: "Cadastro aprovado",
      body: "Seu cadastro como marinheiro foi aprovado. Você já pode ser designado para reservas.",
      path: "/tripulante",
    });
  }

  await writeAuditLog({
    actorStaffId: staffId,
    action: "marinheiro.approve",
    entityType: "marinheiro",
    entityId: marinheiroId,
    metadata: { notes },
  });

  return getMarinheiroReviewDetail(marinheiroId);
}

/** @param {string} marinheiroId @param {string} staffId @param {string} reason */
export async function rejectMarinheiro(marinheiroId, staffId, reason) {
  const client = await pool.connect();
  try {
    await client.query("begin");
    await client.query(
      `update marinheiros
       set approval_status = 'REPROVADO', review_notes = $2, reviewed_at = now(),
           reviewed_by_staff_id = $3, updated_at = now()
       where id = $1::uuid`,
      [marinheiroId, reason, staffId]
    );
    await recordHistory(client, marinheiroId, staffId, "REJECTED", reason);
    await client.query("commit");
  } catch (e) {
    await client.query("rollback");
    throw e;
  } finally {
    client.release();
  }

  const user = await query(`select user_id from marinheiros where id = $1`, [marinheiroId]);
  const userId = user.rows[0]?.user_id;
  if (userId) {
    void notifyUser({
      userId,
      type: "MARINHEIRO_REJECTED",
      title: "Cadastro reprovado",
      body: reason || "Seu cadastro precisa de correções. Atualize os documentos e aguarde nova análise.",
      path: "/tripulante/perfil",
    });
  }

  await writeAuditLog({
    actorStaffId: staffId,
    action: "marinheiro.reject",
    entityType: "marinheiro",
    entityId: marinheiroId,
    metadata: { reason },
  });

  return getMarinheiroReviewDetail(marinheiroId);
}

/** @param {string} marinheiroId @param {string} staffId @param {string} reason */
export async function suspendMarinheiro(marinheiroId, staffId, reason) {
  const client = await pool.connect();
  try {
    await client.query("begin");
    await client.query(
      `update marinheiros
       set approval_status = 'SUSPENSO', suspension_reason = $2, review_notes = $2,
           reviewed_at = now(), reviewed_by_staff_id = $3, updated_at = now()
       where id = $1::uuid`,
      [marinheiroId, reason, staffId]
    );
    await recordHistory(client, marinheiroId, staffId, "SUSPENDED", reason);
    await client.query("commit");
  } catch (e) {
    await client.query("rollback");
    throw e;
  } finally {
    client.release();
  }

  const user = await query(`select user_id from marinheiros where id = $1`, [marinheiroId]);
  const userId = user.rows[0]?.user_id;
  if (userId) {
    void notifyUser({
      userId,
      type: "MARINHEIRO_SUSPENDED",
      title: "Atividades suspensas",
      body: reason || "Suas atividades foram suspensas temporariamente.",
      path: "/tripulante/perfil",
    });
  }

  await writeAuditLog({
    actorStaffId: staffId,
    action: "marinheiro.suspend",
    entityType: "marinheiro",
    entityId: marinheiroId,
    metadata: { reason },
  });

  return getMarinheiroReviewDetail(marinheiroId);
}
