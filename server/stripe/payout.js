import { pool, query } from "../db.js";
import { getStripe } from "./client.js";
import { getBookingLedgerBalanceForUpdate, insertLedgerEntry } from "./ledger.js";
import { StripeFlowStatus } from "./flowStatus.js";

/**
 * Locador inicia passeio: cria transferência Connect (idempotência por linha de transferência).
 * Corrige o doc: chave `stripe_transfer_${transferRowId}` (estável por tentativa de transferência).
 * @param {{ bookingId: string; ownerUserId: string }} input
 */
export async function startStripeBookingPayout(input) {
  const stripe = getStripe();
  if (!stripe) {
    const e = new Error("STRIPE_SECRET_KEY não configurado.");
    e.code = "STRIPE_DISABLED";
    throw e;
  }

  const client = await pool.connect();
  let transferRowId;
  let ownerNetCents = 0;
  let bookingOwnerStripe = null;
  let stripeChargeId = null;

  try {
    await client.query("BEGIN");

    const bk = await client.query(
      `select bk.id, bk.status, bk.owner_user_id, bk.stripe_flow_status, bk.owner_net_cents,
              u.stripe_connect_account_id
       from bookings bk
       join users u on u.id = bk.owner_user_id
       where bk.id = $1::uuid and bk.owner_user_id = $2::uuid
       for update`,
      [input.bookingId, input.ownerUserId]
    );
    const b = bk.rows[0];
    if (!b) {
      const e = new Error("Reserva não encontrada ou não autorizada.");
      e.code = "NOT_FOUND";
      throw e;
    }
    if (b.status !== "ACCEPTED") {
      const e = new Error("A reserva precisa estar aceita.");
      e.code = "INVALID_STATUS";
      throw e;
    }
    if (b.stripe_flow_status !== StripeFlowStatus.PAID) {
      const e = new Error("O cliente ainda não concluiu o pagamento Stripe desta reserva.");
      e.code = "NOT_PAID";
      throw e;
    }

    const dup = await client.query(
      `select id from stripe_connect_transfers
       where booking_id = $1::uuid and status <> 'FAILED'
       limit 1
       for update`,
      [input.bookingId]
    );
    if (dup.rows[0]) {
      const e = new Error("Transferência já iniciada ou concluída para esta reserva.");
      e.code = "DUPLICATE_TRANSFER";
      throw e;
    }

    const ownerStripe = b.stripe_connect_account_id;
    if (!ownerStripe) {
      const e = new Error("Conta Stripe Connect do locador não configurada.");
      e.code = "NO_CONNECT_ACCOUNT";
      throw e;
    }

    const pay = await client.query(
      `select stripe_charge_id, stripe_payment_intent_id, amount_cents
       from payments
       where booking_id = $1::uuid and provider = 'STRIPE' and status = 'APPROVED'
       limit 1
       for update`,
      [input.bookingId]
    );
    const p = pay.rows[0];
    if (!p?.stripe_charge_id) {
      const e = new Error("Cobrança Stripe não encontrada para esta reserva.");
      e.code = "NO_CHARGE";
      throw e;
    }

    ownerNetCents = Number(b.owner_net_cents ?? p.amount_cents);
    if (!Number.isFinite(ownerNetCents) || ownerNetCents <= 0) {
      const e = new Error("Valor líquido do locador inválido.");
      e.code = "INVALID_NET";
      throw e;
    }

    const ins = await client.query(
      `insert into stripe_connect_transfers (booking_id, owner_user_id, amount_cents, status)
       values ($1::uuid, $2::uuid, $3, 'PENDING')
       returning id`,
      [input.bookingId, input.ownerUserId, ownerNetCents]
    );
    transferRowId = ins.rows[0].id;

    await client.query(
      `update bookings
       set stripe_flow_status = $2,
           tour_started_at = coalesce(tour_started_at, now())
       where id = $1::uuid`,
      [input.bookingId, StripeFlowStatus.TRANSFER_PENDING]
    );

    await client.query("COMMIT");

    bookingOwnerStripe = ownerStripe;
    stripeChargeId = p.stripe_charge_id;
  } catch (e) {
    await client.query("ROLLBACK").catch(() => {});
    throw e;
  } finally {
    client.release();
  }

  const idempotencyKey = `stripe_transfer_${transferRowId}`;

  try {
    await query(
      `update stripe_connect_transfers set status = 'PROCESSING', updated_at = now() where id = $1::uuid`,
      [transferRowId]
    );
    await query(
      `update bookings set stripe_flow_status = $2 where id = $1::uuid`,
      [input.bookingId, StripeFlowStatus.TRANSFER_PROCESSING]
    );

    const transfer = await stripe.transfers.create(
      {
        amount: ownerNetCents,
        currency: "brl",
        destination: bookingOwnerStripe,
        source_transaction: stripeChargeId,
        transfer_group: `booking_${input.bookingId}`,
        metadata: {
          booking_id: input.bookingId,
          transfer_row_id: String(transferRowId),
          release_reason: "tour_started",
        },
      },
      { idempotencyKey }
    );

    await query(
      `update stripe_connect_transfers
       set stripe_transfer_id = $2, status = 'PROCESSING', updated_at = now()
       where id = $1::uuid`,
      [transferRowId, transfer.id]
    );

    return { transferId: transfer.id, transferRowId };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await query(
      `update stripe_connect_transfers
       set status = 'FAILED', last_error = $2, failed_at = now(), updated_at = now()
       where id = $1::uuid`,
      [transferRowId, msg]
    );
    await query(
      `update bookings set stripe_flow_status = $2 where id = $1::uuid`,
      [input.bookingId, StripeFlowStatus.TRANSFER_FAILED]
    );
    throw err;
  }
}

/**
 * Confirma transferência paga (webhook). `ledgerEventId` inclui event.id para idempotência.
 * @param {import("pg").PoolClient} client
 * @param {import("stripe").Stripe.Transfer} transfer
 * @param {string} stripeEventId
 */
export async function finalizeTransferPaidInTx(client, transfer, stripeEventId) {
  const stripeTransferId = transfer.id;
  let tr = await client.query(
    `select * from stripe_connect_transfers where stripe_transfer_id = $1 limit 1 for update`,
    [stripeTransferId]
  );
  let row = tr.rows[0];
  const metaRow = transfer.metadata?.transfer_row_id;
  if (!row && metaRow) {
    tr = await client.query(
      `select * from stripe_connect_transfers where id = $1::uuid limit 1 for update`,
      [metaRow]
    );
    row = tr.rows[0];
  }
  if (!row) {
    // eslint-disable-next-line no-console
    console.warn("[stripe] transfer.paid sem linha local:", stripeTransferId);
    return;
  }

  const ledgerEventId = `${stripeEventId}:payout`;
  const dup = await client.query(`select 1 from stripe_connect_ledger where event_id = $1`, [ledgerEventId]);
  if (dup.rows[0]) return;

  await client.query(
    `update stripe_connect_transfers
     set status = 'PAID',
         stripe_transfer_id = coalesce(stripe_transfer_id, $2),
         paid_at = now(),
         updated_at = now()
     where id = $1::uuid`,
    [row.id, stripeTransferId]
  );

  await client.query(
    `update bookings
     set stripe_flow_status = $2,
         status = 'COMPLETED',
         tour_completed_at = coalesce(tour_completed_at, now())
     where id = $3::uuid`,
    [StripeFlowStatus.TRANSFER_PAID, row.booking_id]
  );

  const currentBalance = await getBookingLedgerBalanceForUpdate(client, row.booking_id);
  const amount = Number(row.amount_cents);
  await insertLedgerEntry(client, {
    bookingId: row.booking_id,
    entryType: "PAYOUT",
    amountCents: -amount,
    runningBalanceCents: currentBalance - amount,
    eventId: ledgerEventId,
    description: "Transferência paga ao locador (Stripe Connect)",
    metadata: { stripe_transfer_id: stripeTransferId },
  });
}
