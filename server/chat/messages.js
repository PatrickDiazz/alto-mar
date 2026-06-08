import { validateMessageBody } from "./contentFilter.js";
import {
  canSendChatMessage,
  loadParticipantBooking,
  resolveChatMode,
  senderRoleForUser,
} from "./access.js";

const MAX_MESSAGES_PER_HOUR = 30;
const MIN_SEND_INTERVAL_MS = 2000;

/** @type {Map<string, number>} */
const lastSendAt = new Map();

/**
 * @param {import('../db.js').query} queryFn
 * @param {string} bookingId
 */
async function countMessages(queryFn, bookingId) {
  const r = await queryFn(
    `select count(*)::int as n from booking_messages where booking_id = $1::uuid`,
    [bookingId]
  );
  return Number(r.rows[0]?.n ?? 0);
}

/**
 * @param {import('../db.js').query} queryFn
 * @param {string} bookingId
 * @param {string} userId
 */
async function getLastReadAt(queryFn, bookingId, userId) {
  const r = await queryFn(
    `select last_read_at from booking_message_reads
     where booking_id = $1::uuid and user_id = $2::uuid`,
    [bookingId, userId]
  );
  return r.rows[0]?.last_read_at ?? null;
}

/**
 * @param {import('../db.js').query} queryFn
 * @param {string} bookingId
 * @param {string} userId
 */
export async function countUnreadForUser(queryFn, bookingId, userId) {
  const lastRead = await getLastReadAt(queryFn, bookingId, userId);
  const r = await queryFn(
    `select count(*)::int as n
     from booking_messages
     where booking_id = $1::uuid
       and sender_user_id <> $2::uuid
       and ($3::timestamptz is null or created_at > $3::timestamptz)`,
    [bookingId, userId, lastRead]
  );
  return Number(r.rows[0]?.n ?? 0);
}

/**
 * @param {import('pg').QueryResultRow} row
 * @param {{ renter_user_id: string; owner_user_id: string }} booking
 */
function mapMessageRow(row, booking) {
  return {
    id: row.id,
    senderUserId: row.sender_user_id,
    senderRole: senderRoleForUser(booking, row.sender_user_id),
    body: row.body,
    createdAt: row.created_at,
  };
}

/**
 * @param {import('../db.js').query} queryFn
 * @param {string} bookingId
 * @param {string} userId
 */
export async function getChatMeta(queryFn, bookingId, userId) {
  const booking = await loadParticipantBooking(queryFn, bookingId, userId);
  if (!booking) return { error: "not_found" };

  const messageCount = await countMessages(queryFn, bookingId);
  const mode = resolveChatMode(booking.status, messageCount);
  const unreadCount = mode === "hidden" ? 0 : await countUnreadForUser(queryFn, bookingId, userId);

  return {
    mode,
    canSend: canSendChatMessage(booking.status),
    unreadCount,
    lastMessageAt: booking.last_message_at ?? null,
    messageCount,
  };
}

/**
 * @param {import('../db.js').query} queryFn
 * @param {string} bookingId
 * @param {string} userId
 * @param {{ since?: string | null; limit?: number }} opts
 */
export async function listChatMessages(queryFn, bookingId, userId, opts = {}) {
  const booking = await loadParticipantBooking(queryFn, bookingId, userId);
  if (!booking) return { error: "not_found" };

  const messageCount = await countMessages(queryFn, bookingId);
  const mode = resolveChatMode(booking.status, messageCount);
  if (mode === "hidden") return { error: "not_available" };

  const limit = Math.min(100, Math.max(1, Number(opts.limit ?? 50)));
  const since = opts.since ? String(opts.since).trim() : null;

  const params = [bookingId];
  let sinceClause = "";
  if (since) {
    params.push(since);
    sinceClause = `and created_at > $${params.length}::timestamptz`;
  }
  params.push(limit + 1);

  const r = await queryFn(
    `select id, sender_user_id, body, created_at
     from booking_messages
     where booking_id = $1::uuid
       ${sinceClause}
     order by created_at asc
     limit $${params.length}`,
    params
  );

  const rows = r.rows;
  const hasMore = rows.length > limit;
  const slice = hasMore ? rows.slice(0, limit) : rows;

  return {
    mode,
    messages: slice.map((row) => mapMessageRow(row, booking)),
    hasMore,
  };
}

/**
 * @param {import('../db.js').query} queryFn
 * @param {import('../db.js').pool} pool
 * @param {string} bookingId
 * @param {string} userId
 * @param {string} body
 */
export async function sendChatMessage(queryFn, pool, bookingId, userId, body) {
  const booking = await loadParticipantBooking(queryFn, bookingId, userId);
  if (!booking) return { error: "not_found" };
  if (!canSendChatMessage(booking.status)) return { error: "read_only" };

  const validation = validateMessageBody(body);
  if (!validation.ok) {
    // eslint-disable-next-line no-console
    console.warn("[chat] blocked content", {
      bookingId,
      senderUserId: userId,
      reason: validation.reason,
    });
    return { error: "content_blocked", reason: validation.reason };
  }

  const rateKey = `${userId}:${bookingId}`;
  const now = Date.now();
  const prev = lastSendAt.get(rateKey) ?? 0;
  if (now - prev < MIN_SEND_INTERVAL_MS) {
    return { error: "rate_limit" };
  }

  const hourAgo = new Date(now - 60 * 60 * 1000).toISOString();
  const recent = await queryFn(
    `select count(*)::int as n
     from booking_messages
     where booking_id = $1::uuid
       and sender_user_id = $2::uuid
       and created_at > $3::timestamptz`,
    [bookingId, userId, hourAgo]
  );
  if (Number(recent.rows[0]?.n ?? 0) >= MAX_MESSAGES_PER_HOUR) {
    return { error: "rate_limit" };
  }

  const trimmed = String(body).trim();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const ins = await client.query(
      `insert into booking_messages (booking_id, sender_user_id, body)
       values ($1::uuid, $2::uuid, $3)
       returning id, sender_user_id, body, created_at`,
      [bookingId, userId, trimmed]
    );
    await client.query(
      `update bookings set last_message_at = now() where id = $1::uuid`,
      [bookingId]
    );
    await client.query("COMMIT");
    lastSendAt.set(rateKey, now);
    const row = ins.rows[0];
    return {
      message: mapMessageRow(row, booking),
      recipientUserId:
        userId === booking.renter_user_id ? booking.owner_user_id : booking.renter_user_id,
      previewBody: trimmed,
    };
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

/**
 * @param {import('../db.js').query} queryFn
 * @param {string} bookingId
 * @param {string} userId
 */
export async function markChatRead(queryFn, bookingId, userId) {
  const booking = await loadParticipantBooking(queryFn, bookingId, userId);
  if (!booking) return { error: "not_found" };

  const messageCount = await countMessages(queryFn, bookingId);
  const mode = resolveChatMode(booking.status, messageCount);
  if (mode === "hidden") return { error: "not_available" };

  await queryFn(
    `insert into booking_message_reads (booking_id, user_id, last_read_at)
     values ($1::uuid, $2::uuid, now())
     on conflict (booking_id, user_id)
     do update set last_read_at = now()`,
    [bookingId, userId]
  );

  return { ok: true, unreadCount: 0 };
}

/**
 * @param {import('../db.js').query} queryFn
 * @param {string} userId
 */
export async function getUnreadSummary(queryFn, userId) {
  const r = await queryFn(
    `select
       bk.id as booking_id,
       count(m.id)::int as unread_count
     from bookings bk
     join booking_messages m on m.booking_id = bk.id and m.sender_user_id <> $1::uuid
     left join booking_message_reads r
       on r.booking_id = bk.id and r.user_id = $1::uuid
     where (bk.renter_user_id = $1::uuid or bk.owner_user_id = $1::uuid)
       and bk.status::text = 'ACCEPTED'
       and (r.last_read_at is null or m.created_at > r.last_read_at)
     group by bk.id
     having count(m.id) > 0
     order by max(m.created_at) desc`,
    [userId]
  );

  const byBooking = r.rows.map((row) => ({
    bookingId: row.booking_id,
    count: Number(row.unread_count ?? 0),
  }));
  const totalUnread = byBooking.reduce((sum, x) => sum + x.count, 0);
  return { totalUnread, byBooking };
}
