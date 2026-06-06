import cron from "node-cron";
import { query } from "../db.js";
import { markOverduePenalties } from "../stripe/penalties.js";
import {
  checkTransferFailureRate,
  processTransferQueue,
  requeueStaleTransfers,
} from "../stripe/transferWorker.js";
import { fetchStripeConnectMetrics } from "../stripe/metrics.js";

const CHECKOUT_EXPIRY_MINUTES = Number(process.env.STRIPE_CHECKOUT_EXPIRY_MINUTES ?? 30);

/** @type {import("node-cron").ScheduledTask[]} */
const tasks = [];

/**
 * Cancela reservas PENDING com checkout Stripe expirado (PDF: cron 5 min).
 */
export async function expirePendingPaymentBookings() {
  const r = await query(
    `update bookings bk
     set status = 'CANCELLED',
         decided_at = coalesce(decided_at, now()),
         decision_note = coalesce(decision_note, 'Cancelamento automático: pagamento Stripe não concluído a tempo.')
     from payments p
     where p.booking_id = bk.id
       and bk.status = 'PENDING'
       and p.provider = 'STRIPE'
       and p.status = 'CREATED'
       and bk.created_at < now() - ($1::int || ' minutes')::interval
     returning bk.id`,
    [CHECKOUT_EXPIRY_MINUTES]
  );
  if (r.rowCount > 0) {
    // eslint-disable-next-line no-console
    console.info(`[stripe cron] ${r.rowCount} reserva(s) expirada(s) por falta de pagamento.`);
  }
  return r.rowCount ?? 0;
}

/** Relatório diário de cancelamentos (PDF: cron 8h). */
export async function logDailyCancellationReport() {
  const m = await fetchStripeConnectMetrics();
  // eslint-disable-next-line no-console
  console.info("[stripe cron] relatório diário:", JSON.stringify(m));
}

/** Aplica penalidades pendentes há >7 dias como OVERDUE (PDF: cron 1h). */
export async function applyOverduePenalties() {
  const n = await markOverduePenalties(undefined, 7);
  if (n > 0) {
    // eslint-disable-next-line no-console
    console.info(`[stripe cron] ${n} penalidade(s) marcada(s) como OVERDUE.`);
  }
  return n;
}

/** Processa fila + transfers stale (PDF: cron 10 min). */
export async function runTransferMaintenance() {
  const stale = await requeueStaleTransfers(30);
  if (stale > 0) {
    // eslint-disable-next-line no-console
    console.info(`[stripe cron] ${stale} transfer(s) stale re-enfileirada(s).`);
  }
  await processTransferQueue({ limit: 20 });
}

/** Alerta taxa de falha (PDF: cron horário). */
export async function runTransferFailureAlert() {
  await checkTransferFailureRate(Number(process.env.STRIPE_TRANSFER_FAILURE_ALERT ?? 5));
}

/**
 * Inicia crons Stripe Connect (PDF v7). Desactivar com STRIPE_CRON_ENABLED=0.
 */
export function startStripeCrons() {
  if (String(process.env.STRIPE_CRON_ENABLED ?? "1").trim() === "0") {
    return;
  }
  if (String(process.env.PAYMENTS_PROVIDER || "").toLowerCase() !== "stripe") {
    return;
  }

  tasks.push(
    cron.schedule("*/5 * * * *", () => {
      expirePendingPaymentBookings().catch((e) =>
        console.error("[stripe cron] expirePendingPaymentBookings:", e)
      );
    }),
    cron.schedule("0 8 * * *", () => {
      logDailyCancellationReport().catch((e) =>
        console.error("[stripe cron] logDailyCancellationReport:", e)
      );
    }),
    cron.schedule("0 * * * *", () => {
      applyOverduePenalties().catch((e) => console.error("[stripe cron] applyOverduePenalties:", e));
    }),
    cron.schedule("*/10 * * * *", () => {
      runTransferMaintenance().catch((e) => console.error("[stripe cron] runTransferMaintenance:", e));
    }),
    cron.schedule("0 * * * *", () => {
      runTransferFailureAlert().catch((e) =>
        console.error("[stripe cron] runTransferFailureAlert:", e)
      );
    })
  );

  // eslint-disable-next-line no-console
  console.info("[stripe] crons operacionais activos (PDF v7).");
}

export function stopStripeCrons() {
  for (const t of tasks) t.stop();
  tasks.length = 0;
}
