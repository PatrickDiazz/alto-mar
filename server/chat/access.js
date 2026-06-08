/**
 * @typedef {'hidden' | 'read_write' | 'read_only'} ChatMode
 */

/**
 * @param {string} status
 * @returns {ChatMode}
 */
export function chatModeForStatus(status) {
  if (status === "ACCEPTED") return "read_write";
  return "hidden";
}

/**
 * Chat só disponível com reserva ACCEPTED (confirmada pelo locador).
 * @param {string} status
 * @param {number} [_messageCount]
 * @returns {ChatMode}
 */
export function resolveChatMode(status, _messageCount = 0) {
  if (status === "ACCEPTED") return "read_write";
  return "hidden";
}

/**
 * @param {string} status
 * @returns {boolean}
 */
export function canSendChatMessage(status) {
  return status === "ACCEPTED";
}

/**
 * @param {import('../db.js').query} queryFn
 * @param {string} bookingId
 * @param {string} userId
 */
export async function loadParticipantBooking(queryFn, bookingId, userId) {
  const r = await queryFn(
    `select
       bk.id,
       bk.status::text as status,
       bk.renter_user_id,
       bk.owner_user_id,
       bk.last_message_at,
       b.name as boat_name,
       renter.name as renter_name,
       owner.name as owner_name
     from bookings bk
     join boats b on b.id = bk.boat_id
     join users renter on renter.id = bk.renter_user_id
     join users owner on owner.id = bk.owner_user_id
     where bk.id = $1::uuid
       and (bk.renter_user_id = $2::uuid or bk.owner_user_id = $2::uuid)
     limit 1`,
    [bookingId, userId]
  );
  return r.rows[0] ?? null;
}

/**
 * @param {{ renter_user_id: string; owner_user_id: string }} booking
 * @param {string} userId
 * @returns {'banhista' | 'locatario'}
 */
export function senderRoleForUser(booking, userId) {
  if (booking.renter_user_id === userId) return "banhista";
  return "locatario";
}
