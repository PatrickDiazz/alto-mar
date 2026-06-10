import { query, pool } from "../db.js";
import { notifyUser } from "../notifications/service.js";
import { getTicketTags } from "./tags.js";

/** @param {import('pg').QueryResultRow} row */
function mapTicket(row, tags = []) {
  return {
    id: row.id,
    type: row.type,
    status: row.status,
    priority: row.priority,
    subject: row.subject,
    createdByUserId: row.created_by_user_id,
    createdByName: row.created_by_name ?? null,
    createdByEmail: row.created_by_email ?? null,
    assignedStaffId: row.assigned_staff_id,
    assignedStaffName: row.assigned_staff_name ?? null,
    relatedBookingId: row.related_booking_id,
    relatedBoatId: row.related_boat_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    resolvedAt: row.resolved_at,
    closedAt: row.closed_at,
    tags,
  };
}

const TICKET_SELECT = `
  t.id, t.type, t.status, t.priority, t.subject,
  t.created_by_user_id, t.assigned_staff_id,
  t.related_booking_id, t.related_boat_id,
  t.created_at, t.updated_at, t.resolved_at, t.closed_at,
  u.name as created_by_name, u.email as created_by_email,
  s.name as assigned_staff_name
`;

const TICKET_FROM = `
  from tickets t
  join users u on u.id = t.created_by_user_id
  left join staff_users s on s.id = t.assigned_staff_id
`;

/**
 * @param {{
 *   userId: string;
 *   type: string;
 *   subject: string;
 *   body: string;
 *   priority?: string;
 *   relatedBookingId?: string | null;
 *   relatedBoatId?: string | null;
 * }} input
 */
export async function createTicket(input) {
  const client = await pool.connect();
  try {
    await client.query("begin");
    const ins = await client.query(
      `insert into tickets (type, subject, priority, created_by_user_id, related_booking_id, related_boat_id, status)
       values ($1::ticket_type, $2, coalesce($3::ticket_priority, 'MEDIUM'), $4::uuid, $5::uuid, $6::uuid, 'OPEN')
       returning id`,
      [
        input.type,
        input.subject,
        input.priority ?? "MEDIUM",
        input.userId,
        input.relatedBookingId ?? null,
        input.relatedBoatId ?? null,
      ]
    );
    const ticketId = ins.rows[0].id;
    await client.query(
      `insert into ticket_messages (ticket_id, author_user_id, body) values ($1::uuid, $2::uuid, $3)`,
      [ticketId, input.userId, input.body]
    );
    await client.query("commit");
    return getTicketById(ticketId);
  } catch (e) {
    await client.query("rollback");
    throw e;
  } finally {
    client.release();
  }
}

/** @param {string} ticketId */
export async function getTicketById(ticketId) {
  const r = await query(
    `select ${TICKET_SELECT} ${TICKET_FROM} where t.id = $1::uuid limit 1`,
    [ticketId]
  );
  const row = r.rows[0];
  if (!row) return null;
  const tags = await getTicketTags(ticketId);
  return mapTicket(row, tags);
}

/**
 * @param {{ userId?: string; status?: string; limit?: number; offset?: number }} opts
 */
export async function listTickets(opts = {}) {
  const limit = Math.min(100, Math.max(1, opts.limit ?? 30));
  const offset = Math.max(0, opts.offset ?? 0);
  const params = [];
  const parts = ["1=1"];

  if (opts.userId) {
    params.push(opts.userId);
    parts.push(`t.created_by_user_id = $${params.length}::uuid`);
  }
  if (opts.status) {
    params.push(opts.status);
    parts.push(`t.status = $${params.length}::ticket_status`);
  }

  params.push(limit, offset);
  const r = await query(
    `select ${TICKET_SELECT} ${TICKET_FROM}
     where ${parts.join(" and ")}
     order by t.updated_at desc
     limit $${params.length - 1} offset $${params.length}`,
    params
  );

  const tickets = [];
  for (const row of r.rows) {
    const tags = await getTicketTags(row.id);
    tickets.push(mapTicket(row, tags));
  }
  return tickets;
}

/** @param {string} ticketId */
export async function listTicketMessages(ticketId) {
  const r = await query(
    `select
       m.id, m.body, m.created_at,
       m.author_user_id, m.author_staff_id,
       u.name as user_name, u.email as user_email,
       s.name as staff_name, s.role as staff_role
     from ticket_messages m
     left join users u on u.id = m.author_user_id
     left join staff_users s on s.id = m.author_staff_id
     where m.ticket_id = $1::uuid
     order by m.created_at asc`,
    [ticketId]
  );
  return r.rows.map((row) => ({
    id: row.id,
    body: row.body,
    createdAt: row.created_at,
    author:
      row.author_staff_id != null
        ? { type: "staff", id: row.author_staff_id, name: row.staff_name, role: row.staff_role }
        : { type: "user", id: row.author_user_id, name: row.user_name, email: row.user_email },
  }));
}

/**
 * @param {string} ticketId
 * @param {{ staffId?: string; userId?: string; body: string }} input
 */
export async function addTicketMessage(ticketId, input) {
  await query(
    `insert into ticket_messages (ticket_id, author_user_id, author_staff_id, body)
     values ($1::uuid, $2::uuid, $3::uuid, $4)`,
    [ticketId, input.userId ?? null, input.staffId ?? null, input.body]
  );
  await query(`update tickets set updated_at = now() where id = $1::uuid`, [ticketId]);

  const ticket = await getTicketById(ticketId);
  if (ticket && input.staffId && ticket.createdByUserId) {
    void notifyUser({
      userId: ticket.createdByUserId,
      type: "TICKET_REPLY",
      title: "Resposta no seu ticket",
      body: ticket.subject,
      path: "/conta/ajuda",
      data: { ticketId },
    }).catch(() => {});
  }
  return listTicketMessages(ticketId);
}

/**
 * @param {string} ticketId
 * @param {{ status?: string; priority?: string; assignedStaffId?: string | null }} patch
 */
export async function updateTicket(ticketId, patch) {
  const resolvedAt =
    patch.status === "RESOLVED" ? new Date().toISOString() : null;
  const closedAt = patch.status === "CLOSED" ? new Date().toISOString() : null;

  await query(
    `update tickets set
       status = coalesce($2::ticket_status, status),
       priority = coalesce($3::ticket_priority, priority),
       assigned_staff_id = case when $4::text = '__skip__' then assigned_staff_id else $4::uuid end,
       updated_at = now(),
       resolved_at = case when $2::ticket_status = 'RESOLVED' then coalesce(resolved_at, now()) else resolved_at end,
       closed_at = case when $2::ticket_status = 'CLOSED' then coalesce(closed_at, now()) else closed_at end
     where id = $1::uuid`,
    [
      ticketId,
      patch.status ?? null,
      patch.priority ?? null,
      patch.assignedStaffId === undefined ? "__skip__" : patch.assignedStaffId,
    ]
  );
  void resolvedAt;
  void closedAt;
  return getTicketById(ticketId);
}

/** @param {string} userId @param {string} ticketId */
export async function userCanAccessTicket(userId, ticketId) {
  const r = await query(
    `select 1 from tickets where id = $1::uuid and created_by_user_id = $2::uuid limit 1`,
    [ticketId, userId]
  );
  return Boolean(r.rows[0]);
}
