import { notifyUser } from "../notifications/service.js";
import { NotificationType } from "../notifications/bookingEvents.js";
import { query } from "../db.js";

/**
 * @param {string} text
 * @param {number} max
 */
function truncate(text, max) {
  const s = String(text || "").trim();
  if (s.length <= max) return s;
  return `${s.slice(0, max - 1)}…`;
}

/**
 * @param {string} bookingId
 */
async function loadBookingContext(bookingId) {
  const r = await query(
    `select
       bk.id,
       bk.owner_user_id,
       bk.renter_user_id,
       b.name as boat_name
     from bookings bk
     join boats b on b.id = bk.boat_id
     where bk.id = $1::uuid
     limit 1`,
    [bookingId]
  );
  return r.rows[0] ?? null;
}

/**
 * @param {{ bookingId: string; senderUserId: string; previewBody: string }} input
 */
export async function notifyBookingMessage(input) {
  const { bookingId, senderUserId, previewBody } = input;
  const ctx = await loadBookingContext(bookingId);
  if (!ctx) return;

  const recipientId =
    senderUserId === ctx.renter_user_id ? ctx.owner_user_id : ctx.renter_user_id;
  const isOwnerRecipient = recipientId === ctx.owner_user_id;

  const path = isOwnerRecipient
    ? `/marinheiro/reservas/${encodeURIComponent(bookingId)}/chat`
    : `/conta/reservas/${encodeURIComponent(bookingId)}/chat`;

  await notifyUser({
    userId: recipientId,
    type: NotificationType.BOOKING_MESSAGE,
    title: "Nova mensagem sobre a reserva",
    body: truncate(previewBody, 120) || `Mensagem sobre ${ctx.boat_name}.`,
    path,
    bookingId,
    data: { senderUserId, bookingId },
    sendPush: true,
  });
}
