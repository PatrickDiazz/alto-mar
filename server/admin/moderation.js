import { query, pool } from "../db.js";
import { writeAuditLog } from "./audit.js";
import { staffCan } from "./auth.js";

/** @param {{ limit?: number; offset?: number; status?: string }} opts */
export async function listModerationCases(opts = {}) {
  const limit = Math.min(100, Math.max(1, opts.limit ?? 30));
  const offset = Math.max(0, opts.offset ?? 0);
  const params = [limit, offset];
  let statusClause = "";
  if (opts.status) {
    params.unshift(opts.status);
    statusClause = `where c.status = $1::moderation_case_status`;
    params[0] = opts.status;
    params[1] = limit;
    params[2] = offset;
  }

  const r = await query(
    `select
       c.id, c.reason, c.status, c.notes, c.created_at, c.resolved_at,
       c.target_user_id, c.target_boat_id, c.reporter_user_id,
       tu.name as target_user_name, tu.email as target_user_email,
       tb.name as target_boat_name,
       ru.name as reporter_name
     from moderation_cases c
     left join users tu on tu.id = c.target_user_id
     left join boats tb on tb.id = c.target_boat_id
     left join users ru on ru.id = c.reporter_user_id
     ${statusClause || ""}
     order by c.created_at desc
     limit $${statusClause ? 2 : 1} offset $${statusClause ? 3 : 2}`,
    statusClause ? [opts.status, limit, offset] : [limit, offset]
  );

  return r.rows.map((row) => ({
    id: row.id,
    reason: row.reason,
    status: row.status,
    notes: row.notes,
    createdAt: row.created_at,
    resolvedAt: row.resolved_at,
    targetUser: row.target_user_id
      ? { id: row.target_user_id, name: row.target_user_name, email: row.target_user_email }
      : null,
    targetBoat: row.target_boat_id ? { id: row.target_boat_id, name: row.target_boat_name } : null,
    reporter: row.reporter_user_id ? { id: row.reporter_user_id, name: row.reporter_name } : null,
  }));
}

/**
 * @param {{
 *   reporterUserId?: string | null;
 *   targetUserId?: string | null;
 *   targetBoatId?: string | null;
 *   reason: string;
 * }} input
 */
export async function createModerationCase(input) {
  const r = await query(
    `insert into moderation_cases (reporter_user_id, target_user_id, target_boat_id, reason)
     values ($1::uuid, $2::uuid, $3::uuid, $4)
     returning id`,
    [
      input.reporterUserId ?? null,
      input.targetUserId ?? null,
      input.targetBoatId ?? null,
      input.reason.trim(),
    ]
  );
  return r.rows[0].id;
}

/**
 * @param {string} caseId
 * @param {{ staffId: string; staffRole: string; actionType: string; reason: string; expiresAt?: string | null }} input
 */
export async function applyModerationAction(caseId, input) {
  const needsBan = input.actionType === "PERMANENT_BAN" || input.actionType === "INDEFINITE_SUSPENSION";
  if (needsBan && !staffCan(input.staffRole, "moderationBan")) {
    throw new Error("Sem permissão para esta sanção.");
  }

  const caseRow = await query(
    `select target_user_id, target_boat_id from moderation_cases where id = $1::uuid limit 1`,
    [caseId]
  );
  const c = caseRow.rows[0];
  if (!c) return null;

  const client = await pool.connect();
  try {
    await client.query("begin");
    await client.query(
      `insert into moderation_actions (case_id, staff_id, action_type, reason, expires_at)
       values ($1::uuid, $2::uuid, $3::moderation_action_type, $4, $5::timestamptz)`,
      [caseId, input.staffId, input.actionType, input.reason, input.expiresAt ?? null]
    );

    if (c.target_user_id && input.actionType !== "WARNING") {
      await client.query(
        `insert into user_suspensions (user_id, active, action_type, reason, expires_at, updated_at)
         values ($1::uuid, true, $2::moderation_action_type, $3, $4::timestamptz, now())
         on conflict (user_id) do update set
           active = true,
           action_type = excluded.action_type,
           reason = excluded.reason,
           expires_at = excluded.expires_at,
           updated_at = now()`,
        [c.target_user_id, input.actionType, input.reason, input.expiresAt ?? null]
      );
    }

    await client.query(
      `update moderation_cases set status = 'RESOLVED', resolved_at = now() where id = $1::uuid`,
      [caseId]
    );
    await client.query("commit");

    await writeAuditLog({
      actorStaffId: input.staffId,
      action: "moderation.apply",
      entityType: "moderation_case",
      entityId: caseId,
      metadata: {
        actionType: input.actionType,
        reason: input.reason,
        targetUserId: c.target_user_id,
      },
    });

    return { ok: true };
  } catch (e) {
    await client.query("rollback");
    throw e;
  } finally {
    client.release();
  }
}

/** @param {{ limit?: number; offset?: number; status?: string }} opts */
export async function listChatReports(opts = {}) {
  const limit = Math.min(100, Math.max(1, opts.limit ?? 30));
  const offset = Math.max(0, opts.offset ?? 0);
  const params = [limit, offset];
  let where = "";
  if (opts.status) {
    params.unshift(opts.status);
    where = "where cr.status = $1";
  }

  const r = await query(
    `select
       cr.id, cr.reason, cr.status, cr.created_at, cr.resolved_at, cr.resolution_note,
       cr.booking_id, cr.message_id, cr.reporter_user_id,
       u.name as reporter_name,
       bk.status as booking_status,
       b.name as boat_name
     from chat_reports cr
     join users u on u.id = cr.reporter_user_id
     join bookings bk on bk.id = cr.booking_id
     join boats b on b.id = bk.boat_id
     ${where}
     order by cr.created_at desc
     limit $${where ? 2 : 1} offset $${where ? 3 : 2}`,
    params
  );

  return r.rows.map((row) => ({
    id: row.id,
    reason: row.reason,
    status: row.status,
    createdAt: row.created_at,
    resolvedAt: row.resolved_at,
    resolutionNote: row.resolution_note,
    bookingId: row.booking_id,
    messageId: row.message_id,
    reporter: { id: row.reporter_user_id, name: row.reporter_name },
    bookingStatus: row.booking_status,
    boatName: row.boat_name,
  }));
}

/**
 * @param {{ reporterUserId: string; bookingId: string; messageId?: string | null; reason: string }} input
 */
export async function createChatReport(input) {
  const r = await query(
    `insert into chat_reports (reporter_user_id, booking_id, message_id, reason)
     values ($1::uuid, $2::uuid, $3::uuid, $4)
     returning id`,
    [input.reporterUserId, input.bookingId, input.messageId ?? null, input.reason.trim()]
  );
  return r.rows[0].id;
}

/** @param {string} reportId @param {{ staffId: string; status: string; note?: string }} input */
export async function resolveChatReport(reportId, input) {
  await query(
    `update chat_reports set
       status = $2,
       resolution_note = $3,
       reviewed_by_staff_id = $4::uuid,
       resolved_at = case when $2 = 'OPEN' then null else now() end
     where id = $1::uuid`,
    [reportId, input.status, input.note ?? null, input.staffId]
  );
  await writeAuditLog({
    actorStaffId: input.staffId,
    action: "chat_report.resolve",
    entityType: "chat_report",
    entityId: reportId,
    metadata: { status: input.status, note: input.note ?? null },
  });
}

/** @param {string} bookingId @param {{ limit?: number }} opts */
export async function listBookingMessagesForStaff(bookingId, opts = {}) {
  const limit = Math.min(500, Math.max(1, opts.limit ?? 200));
  const r = await query(
    `select m.id, m.body, m.created_at, m.sender_user_id, u.name as sender_name
     from booking_messages m
     join users u on u.id = m.sender_user_id
     where m.booking_id = $1::uuid
     order by m.created_at asc
     limit $2`,
    [bookingId, limit]
  );
  return r.rows.map((row) => ({
    id: row.id,
    body: row.body,
    createdAt: row.created_at,
    sender: { id: row.sender_user_id, name: row.sender_name },
  }));
}

/** @param {string} q @param {{ limit?: number }} opts */
export async function searchChatMessages(q, opts = {}) {
  const term = `%${q.trim().slice(0, 100)}%`;
  const limit = Math.min(100, Math.max(1, opts.limit ?? 30));
  const r = await query(
    `select m.id, m.body, m.created_at, m.booking_id, u.name as sender_name
     from booking_messages m
     join users u on u.id = m.sender_user_id
     where m.body ilike $1
     order by m.created_at desc
     limit $2`,
    [term, limit]
  );
  return r.rows.map((row) => ({
    id: row.id,
    body: row.body,
    createdAt: row.created_at,
    bookingId: row.booking_id,
    senderName: row.sender_name,
  }));
}
