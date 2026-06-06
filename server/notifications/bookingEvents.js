import { query } from "../db.js";
import { notifyUser } from "./service.js";

export const NotificationType = {
  BOOKING_CREATED: "BOOKING_CREATED",
  BOOKING_PAYMENT_RECEIVED: "BOOKING_PAYMENT_RECEIVED",
  BOOKING_ACCEPTED: "BOOKING_ACCEPTED",
  BOOKING_DECLINED: "BOOKING_DECLINED",
  BOOKING_CANCELLED_BY_RENTER: "BOOKING_CANCELLED_BY_RENTER",
  BOOKING_CANCELLED_BY_OWNER: "BOOKING_CANCELLED_BY_OWNER",
  BOOKING_RESCHEDULED: "BOOKING_RESCHEDULED",
  BOOKING_COMPLETED: "BOOKING_COMPLETED",
  BOOKING_CONFLICT_CANCELLED: "BOOKING_CONFLICT_CANCELLED",
  TRANSFER_PAID: "TRANSFER_PAID",
  TRANSFER_FAILED: "TRANSFER_FAILED",
};

/**
 * @param {string} bookingId
 */
async function loadBookingContext(bookingId) {
  const r = await query(
    `select
       bk.id,
       bk.status,
       bk.booking_date::text as booking_date,
       bk.owner_user_id,
       bk.renter_user_id,
       b.name as boat_name,
       u.name as renter_name
     from bookings bk
     join boats b on b.id = bk.boat_id
     join users u on u.id = bk.renter_user_id
     where bk.id = $1::uuid
     limit 1`,
    [bookingId]
  );
  return r.rows[0] ?? null;
}

function formatDate(ymd) {
  if (!ymd) return "";
  const [y, m, d] = String(ymd).slice(0, 10).split("-");
  if (!d) return String(ymd);
  return `${d}/${m}/${y}`;
}

function ownerPath(bookingId) {
  return `/marinheiro/reservas/${encodeURIComponent(bookingId)}`;
}

/** @param {string} bookingId */
export async function notifyBookingCreated(bookingId) {
  const ctx = await loadBookingContext(bookingId);
  if (!ctx) return;
  await notifyUser({
    userId: ctx.owner_user_id,
    type: NotificationType.BOOKING_CREATED,
    title: "Nova reserva",
    body: `${ctx.renter_name} pediu ${ctx.boat_name} para ${formatDate(ctx.booking_date)}.`,
    path: ownerPath(bookingId),
    bookingId,
  });
}

/** @param {string} bookingId */
export async function notifyBookingPaymentReceived(bookingId) {
  const ctx = await loadBookingContext(bookingId);
  if (!ctx) return;
  await notifyUser({
    userId: ctx.owner_user_id,
    type: NotificationType.BOOKING_PAYMENT_RECEIVED,
    title: "Pagamento confirmado",
    body: `Pagamento recebido para ${ctx.boat_name} (${formatDate(ctx.booking_date)}). Pode aceitar a reserva.`,
    path: ownerPath(bookingId),
    bookingId,
  });
}

/** @param {string} bookingId */
export async function notifyBookingAccepted(bookingId) {
  const ctx = await loadBookingContext(bookingId);
  if (!ctx) return;
  await notifyUser({
    userId: ctx.renter_user_id,
    type: NotificationType.BOOKING_ACCEPTED,
    title: "Reserva aceite",
    body: `O locador aceitou o passeio em ${ctx.boat_name} (${formatDate(ctx.booking_date)}).`,
    path: "/conta/reservas",
    bookingId,
  });
}

/** @param {string} bookingId */
export async function notifyBookingDeclined(bookingId) {
  const ctx = await loadBookingContext(bookingId);
  if (!ctx) return;
  await notifyUser({
    userId: ctx.renter_user_id,
    type: NotificationType.BOOKING_DECLINED,
    title: "Reserva recusada",
    body: `O locador recusou o pedido para ${ctx.boat_name} (${formatDate(ctx.booking_date)}).`,
    path: "/conta/reservas",
    bookingId,
  });
}

/** @param {string} bookingId */
export async function notifyBookingCancelledByRenter(bookingId) {
  const ctx = await loadBookingContext(bookingId);
  if (!ctx) return;
  await notifyUser({
    userId: ctx.owner_user_id,
    type: NotificationType.BOOKING_CANCELLED_BY_RENTER,
    title: "Reserva cancelada",
    body: `${ctx.renter_name} cancelou a reserva de ${ctx.boat_name} (${formatDate(ctx.booking_date)}).`,
    path: ownerPath(bookingId),
    bookingId,
  });
}

/** @param {string} bookingId */
export async function notifyBookingCancelledByOwner(bookingId) {
  const ctx = await loadBookingContext(bookingId);
  if (!ctx) return;
  await notifyUser({
    userId: ctx.renter_user_id,
    type: NotificationType.BOOKING_CANCELLED_BY_OWNER,
    title: "Passeio cancelado",
    body: `O locador cancelou o passeio em ${ctx.boat_name} (${formatDate(ctx.booking_date)}).`,
    path: "/conta/reservas",
    bookingId,
  });
}

/** @param {string} bookingId */
export async function notifyBookingRescheduled(bookingId) {
  const ctx = await loadBookingContext(bookingId);
  if (!ctx) return;
  await notifyUser({
    userId: ctx.owner_user_id,
    type: NotificationType.BOOKING_RESCHEDULED,
    title: "Reagendamento",
    body: `${ctx.renter_name} pediu nova data para ${ctx.boat_name}: ${formatDate(ctx.booking_date)}.`,
    path: ownerPath(bookingId),
    bookingId,
  });
}

/** @param {string} bookingId */
export async function notifyBookingCompleted(bookingId) {
  const ctx = await loadBookingContext(bookingId);
  if (!ctx) return;
  await notifyUser({
    userId: ctx.renter_user_id,
    type: NotificationType.BOOKING_COMPLETED,
    title: "Passeio concluído",
    body: `O passeio em ${ctx.boat_name} (${formatDate(ctx.booking_date)}) foi marcado como concluído.`,
    path: "/conta/reservas",
    bookingId,
  });
}

/** @param {string} bookingId */
export async function notifyBookingConflictCancelled(bookingId) {
  const ctx = await loadBookingContext(bookingId);
  if (!ctx) return;
  await notifyUser({
    userId: ctx.renter_user_id,
    type: NotificationType.BOOKING_CONFLICT_CANCELLED,
    title: "Reserva cancelada",
    body: `Outra reserva foi aceite para ${ctx.boat_name} na mesma data. A sua foi cancelada; reembolso quando aplicável.`,
    path: "/conta/reservas",
    bookingId,
  });
}

/** @param {string} bookingId */
export async function notifyTransferPaid(bookingId) {
  const ctx = await loadBookingContext(bookingId);
  if (!ctx) return;
  await notifyUser({
    userId: ctx.owner_user_id,
    type: NotificationType.TRANSFER_PAID,
    title: "Repasse concluído",
    body: `Repasse Stripe confirmado para ${ctx.boat_name} (${formatDate(ctx.booking_date)}).`,
    path: ownerPath(bookingId),
    bookingId,
  });
}

/** @param {string} bookingId */
export async function notifyTransferFailed(bookingId) {
  const ctx = await loadBookingContext(bookingId);
  if (!ctx) return;
  await notifyUser({
    userId: ctx.owner_user_id,
    type: NotificationType.TRANSFER_FAILED,
    title: "Falha no repasse",
    body: `Não foi possível concluir o repasse de ${ctx.boat_name}. Tente novamente na ficha da reserva.`,
    path: ownerPath(bookingId),
    bookingId,
  });
}

/** Dispara notificação sem bloquear a resposta HTTP. */
export function notifyAsync(fn) {
  void fn().catch((e) => {
    // eslint-disable-next-line no-console
    console.warn("[notifications]", e instanceof Error ? e.message : e);
  });
}

/**
 * Notificações pós-webhook Stripe (fora da transacção).
 * @param {import("stripe").Stripe.Event} event
 */
export async function dispatchStripeWebhookNotifications(event) {
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const bookingId = session.metadata?.booking_id || session.client_reference_id;
    if (bookingId && session.payment_status === "paid") {
      await notifyBookingPaymentReceived(String(bookingId));
    }
    return;
  }
  if (event.type === "transfer.paid") {
    const transfer = event.data.object;
    const bookingId = transfer.metadata?.booking_id;
    if (bookingId) {
      await notifyTransferPaid(String(bookingId));
      await notifyBookingCompleted(String(bookingId));
    }
    return;
  }
  if (event.type === "transfer.failed") {
    const transfer = event.data.object;
    const stripeTransferId = transfer.id;
    const { query } = await import("../db.js");
    const tr = await query(
      `select booking_id from stripe_connect_transfers where stripe_transfer_id = $1 limit 1`,
      [stripeTransferId]
    );
    const bookingId = tr.rows[0]?.booking_id;
    if (bookingId) await notifyTransferFailed(String(bookingId));
  }
}
