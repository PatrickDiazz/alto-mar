import { query, pool } from "../db.js";
import { notifyUser } from "../notifications/service.js";
import { getMacroByCode } from "./macros.js";
import { writeAuditLog } from "./audit.js";

/** @param {import('pg').QueryResultRow} row */
function mapBoatReview(row) {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    capacity: row.capacity,
    locationText: row.location_text,
    priceCents: row.price_cents,
    description: row.description,
    verified: row.verified,
    reviewStatus: row.review_status,
    reviewNotes: row.review_notes,
    reviewedAt: row.reviewed_at,
    reviewedByStaffId: row.reviewed_by_staff_id,
    tieDocumentUrl: row.tie_document_url,
    tiemDocumentUrl: row.tiem_document_url,
    videoUrl: row.video_url,
    isActive: row.is_active,
    createdAt: row.created_at,
    owner: {
      id: row.owner_user_id,
      name: row.owner_name,
      email: row.owner_email,
    },
    ownerBoatCount: Number(row.owner_boat_count ?? 0),
    images: row.images ?? [],
  };
}

/**
 * @param {{ status?: string; limit?: number; offset?: number }} opts
 */
export async function listBoatReviewQueue(opts = {}) {
  const status = opts.status ?? "PENDING_REVIEW";
  const limit = Math.min(100, Math.max(1, opts.limit ?? 30));
  const offset = Math.max(0, opts.offset ?? 0);

  const r = await query(
    `select
       b.id, b.name, b.type, b.capacity, b.location_text, b.price_cents, b.description,
       b.verified, b.review_status, b.review_notes, b.reviewed_at, b.reviewed_by_staff_id,
       b.tie_document_url, b.tiem_document_url, b.video_url,
       coalesce(b.is_active, true) as is_active, b.created_at,
       b.owner_user_id, u.name as owner_name, u.email as owner_email,
       (select count(*)::int from boats bx where bx.owner_user_id = b.owner_user_id) as owner_boat_count,
       coalesce(
         (select json_agg(bi.url order by bi.sort asc)
          from boat_images bi where bi.boat_id = b.id),
         '[]'::json
       ) as images
     from boats b
     join users u on u.id = b.owner_user_id
     where b.review_status = $1::boat_review_status
     order by b.created_at asc
     limit $2 offset $3`,
    [status, limit, offset]
  );
  return r.rows.map(mapBoatReview);
}

/** @param {string} boatId */
export async function getBoatReviewDetail(boatId) {
  const r = await query(
    `select
       b.id, b.name, b.type, b.capacity, b.location_text, b.price_cents, b.description,
       b.verified, b.review_status, b.review_notes, b.reviewed_at, b.reviewed_by_staff_id,
       b.tie_document_url, b.tiem_document_url, b.video_url,
       coalesce(b.is_active, true) as is_active, b.created_at,
       b.owner_user_id, u.name as owner_name, u.email as owner_email,
       u.rg_url as owner_rg_url, u.nautical_license_url as owner_nautical_license_url,
       (select count(*)::int from boats bx where bx.owner_user_id = b.owner_user_id) as owner_boat_count,
       coalesce(
         (select json_agg(bi.url order by bi.sort asc)
          from boat_images bi where bi.boat_id = b.id),
         '[]'::json
       ) as images
     from boats b
     join users u on u.id = b.owner_user_id
     where b.id = $1::uuid
     limit 1`,
    [boatId]
  );
  const row = r.rows[0];
  if (!row) return null;

  const history = await query(
    `select h.id, h.action, h.reason, h.macro_code, h.metadata, h.created_at,
            s.name as staff_name
     from boat_review_history h
     left join staff_users s on s.id = h.staff_id
     where h.boat_id = $1::uuid
     order by h.created_at desc
     limit 50`,
    [boatId]
  );

  return {
    ...mapBoatReview(row),
    ownerRgUrl: row.owner_rg_url,
    ownerNauticalLicenseUrl: row.owner_nautical_license_url,
    history: history.rows.map((h) => ({
      id: h.id,
      action: h.action,
      reason: h.reason,
      macroCode: h.macro_code,
      metadata: h.metadata ?? {},
      createdAt: h.created_at,
      staffName: h.staff_name,
    })),
  };
}

/**
 * @param {string} boatId
 * @param {{ staffId: string; notes?: string }} input
 */
export async function approveBoat(boatId, input) {
  const client = await pool.connect();
  try {
    await client.query("begin");
    const upd = await client.query(
      `update boats set
         verified = true,
         review_status = 'APPROVED',
         review_notes = $3,
         reviewed_at = now(),
         reviewed_by_staff_id = $2::uuid,
         is_active = true
       where id = $1::uuid
       returning owner_user_id, name`,
      [boatId, input.staffId, input.notes ?? null]
    );
    const boat = upd.rows[0];
    if (!boat) {
      await client.query("rollback");
      return null;
    }
    await client.query(
      `insert into boat_review_history (boat_id, staff_id, action, reason)
       values ($1::uuid, $2::uuid, 'approve', $3)`,
      [boatId, input.staffId, input.notes ?? null]
    );
    await client.query("commit");

    void notifyUser({
      userId: boat.owner_user_id,
      type: "BOAT_APPROVED",
      title: "Embarcação aprovada",
      body: `${boat.name} foi aprovada e já está visível na plataforma.`,
      path: "/marinheiro/embarcacoes",
      data: { boatId },
    }).catch(() => {});

    await writeAuditLog({
      actorStaffId: input.staffId,
      action: "boat.approve",
      entityType: "boat",
      entityId: boatId,
      metadata: { notes: input.notes ?? null },
    });

    return getBoatReviewDetail(boatId);
  } catch (e) {
    await client.query("rollback");
    throw e;
  } finally {
    client.release();
  }
}

/**
 * @param {string} boatId
 * @param {{ staffId: string; reason: string; macroCode?: string }} input
 */
export async function rejectBoat(boatId, input) {
  let reason = input.reason.trim();
  if (input.macroCode) {
    const macro = await getMacroByCode(input.macroCode);
    if (macro) reason = macro.body;
  }
  if (!reason) throw new Error("Justificativa obrigatória.");

  const client = await pool.connect();
  try {
    await client.query("begin");
    const upd = await client.query(
      `update boats set
         verified = false,
         review_status = 'REJECTED',
         review_notes = $3,
         reviewed_at = now(),
         reviewed_by_staff_id = $2::uuid
       where id = $1::uuid
       returning owner_user_id, name`,
      [boatId, input.staffId, reason]
    );
    const boat = upd.rows[0];
    if (!boat) {
      await client.query("rollback");
      return null;
    }
    await client.query(
      `insert into boat_review_history (boat_id, staff_id, action, reason, macro_code)
       values ($1::uuid, $2::uuid, 'reject', $3, $4)`,
      [boatId, input.staffId, reason, input.macroCode ?? null]
    );
    await client.query("commit");

    void notifyUser({
      userId: boat.owner_user_id,
      type: "BOAT_REJECTED",
      title: "Embarcação não aprovada",
      body: reason.slice(0, 200),
      path: "/marinheiro/embarcacoes",
      data: { boatId, macroCode: input.macroCode ?? null },
    }).catch(() => {});

    await writeAuditLog({
      actorStaffId: input.staffId,
      action: "boat.reject",
      entityType: "boat",
      entityId: boatId,
      metadata: { reason, macroCode: input.macroCode ?? null },
    });

    return getBoatReviewDetail(boatId);
  } catch (e) {
    await client.query("rollback");
    throw e;
  } finally {
    client.release();
  }
}

/** @param {string} boatId @param {string} staffId */
export async function markBoatUnderReview(boatId, staffId) {
  await query(
    `update boats set review_status = 'UNDER_REVIEW', reviewed_by_staff_id = $2::uuid
     where id = $1::uuid and review_status in ('PENDING_REVIEW', 'REJECTED')`,
    [boatId, staffId]
  );
  await writeAuditLog({
    actorStaffId: staffId,
    action: "boat.under_review",
    entityType: "boat",
    entityId: boatId,
  });
  return getBoatReviewDetail(boatId);
}

/** @param {string} boatId @param {{ staffId: string; reason: string }} input */
export async function suspendBoat(boatId, input) {
  await query(
    `update boats set
       review_status = 'SUSPENDED',
       verified = false,
       is_active = false,
       review_notes = $3,
       reviewed_at = now(),
       reviewed_by_staff_id = $2::uuid
     where id = $1::uuid`,
    [boatId, input.staffId, input.reason]
  );
  await query(
    `insert into boat_review_history (boat_id, staff_id, action, reason)
     values ($1::uuid, $2::uuid, 'suspend', $3)`,
    [boatId, input.staffId, input.reason]
  );
  await writeAuditLog({
    actorStaffId: input.staffId,
    action: "boat.suspend",
    entityType: "boat",
    entityId: boatId,
    metadata: { reason: input.reason },
  });
  return getBoatReviewDetail(boatId);
}
