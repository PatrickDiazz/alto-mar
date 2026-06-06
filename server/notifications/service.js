import { query } from "../db.js";
import { sendFcmToTokens } from "./fcm.js";

/**
 * @param {import("pg").QueryResultRow} row
 */
function mapNotificationRow(row) {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    body: row.body,
    path: row.path,
    bookingId: row.booking_id,
    data: row.data ?? {},
    readAt: row.read_at,
    createdAt: row.created_at,
  };
}

/**
 * @param {{
 *   userId: string;
 *   type: string;
 *   title: string;
 *   body: string;
 *   path?: string | null;
 *   bookingId?: string | null;
 *   data?: Record<string, unknown>;
 *   sendPush?: boolean;
 * }} input
 */
export async function notifyUser(input) {
  const {
    userId,
    type,
    title,
    body,
    path = null,
    bookingId = null,
    data = {},
    sendPush = true,
  } = input;

  const ins = await query(
    `insert into app_notifications (user_id, type, title, body, path, booking_id, data)
     values ($1::uuid, $2, $3, $4, $5, $6::uuid, $7::jsonb)
     returning id, user_id, type, title, body, path, booking_id, data, read_at, created_at`,
    [userId, type, title, body, path, bookingId, JSON.stringify(data)]
  );
  const row = ins.rows[0];

  if (sendPush) {
    const tokens = await query(
      `select token from user_push_tokens where user_id = $1::uuid order by updated_at desc limit 20`,
      [userId]
    );
    const list = tokens.rows.map((r) => r.token);
    void sendFcmToTokens(list, { title, body, path, type, bookingId }).catch((e) => {
      // eslint-disable-next-line no-console
      console.warn("[notifications] push:", e instanceof Error ? e.message : e);
    });
  }

  return mapNotificationRow(row);
}

/**
 * @param {string} userId
 * @param {string} token
 * @param {string} platform
 */
export async function registerPushToken(userId, token, platform = "android") {
  const t = String(token || "").trim();
  if (!t) return null;
  const plat = String(platform || "android").trim().slice(0, 32) || "android";
  await query(
    `insert into user_push_tokens (user_id, token, platform, updated_at)
     values ($1::uuid, $2, $3, now())
     on conflict (user_id, token) do update set platform = excluded.platform, updated_at = now()`,
    [userId, t, plat]
  );
  return { ok: true };
}

/**
 * @param {string} userId
 * @param {string} token
 */
export async function unregisterPushToken(userId, token) {
  const t = String(token || "").trim();
  if (!t) return { ok: true };
  await query(`delete from user_push_tokens where user_id = $1::uuid and token = $2`, [userId, t]);
  return { ok: true };
}

/**
 * @param {string} userId
 * @param {{ limit?: number; unreadOnly?: boolean }} opts
 */
export async function listNotifications(userId, opts = {}) {
  const limit = Math.min(50, Math.max(1, Number(opts.limit ?? 30)));
  const unreadOnly = Boolean(opts.unreadOnly);
  const rows = await query(
    `select id, type, title, body, path, booking_id, data, read_at, created_at
     from app_notifications
     where user_id = $1::uuid
       ${unreadOnly ? "and read_at is null" : ""}
     order by created_at desc
     limit $2`,
    [userId, limit]
  );
  return rows.rows.map(mapNotificationRow);
}

/** @param {string} userId */
export async function getUnreadNotificationCount(userId) {
  const r = await query(
    `select count(*)::int as n from app_notifications where user_id = $1::uuid and read_at is null`,
    [userId]
  );
  return Number(r.rows[0]?.n ?? 0);
}

/**
 * @param {string} userId
 * @param {string} notificationId
 */
export async function markNotificationRead(userId, notificationId) {
  const r = await query(
    `update app_notifications set read_at = coalesce(read_at, now())
     where id = $1::uuid and user_id = $2::uuid
     returning id, type, title, body, path, booking_id, data, read_at, created_at`,
    [notificationId, userId]
  );
  const row = r.rows[0];
  return row ? mapNotificationRow(row) : null;
}

/** @param {string} userId */
export async function markAllNotificationsRead(userId) {
  const r = await query(
    `update app_notifications set read_at = now()
     where user_id = $1::uuid and read_at is null
     returning id`,
    [userId]
  );
  return { updated: r.rowCount ?? 0 };
}
