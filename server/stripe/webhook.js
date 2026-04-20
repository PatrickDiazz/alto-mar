import express from "express";
import { pool } from "../db.js";
import { getStripe } from "./client.js";
import { finalizeTransferPaidInTx } from "./payout.js";
import { applyPaidCheckoutSessionInTx } from "./applyCheckoutPaid.js";

/**
 * Regista POST /api/stripe/webhook com body raw (obrigatório para assinatura).
 * Deve ser chamado **antes** de `app.use(express.json(...))`.
 * @param {import("express").Express} app
 */
export function installStripeWebhook(app) {
  app.post("/api/stripe/webhook", express.raw({ type: "application/json" }), async (req, res) => {
    const stripe = getStripe();
    const secret = process.env.STRIPE_WEBHOOK_SECRET && String(process.env.STRIPE_WEBHOOK_SECRET).trim();
    if (!stripe || !secret) {
      return res.status(503).send("Stripe webhook não configurado.");
    }

    const sig = req.headers["stripe-signature"];
    if (!sig || typeof sig !== "string") {
      return res.status(400).send("Missing stripe-signature");
    }

    let event;
    try {
      event = stripe.webhooks.constructEvent(req.body, sig, secret);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      // eslint-disable-next-line no-console
      console.error("[stripe webhook] assinatura inválida:", msg);
      return res.status(400).send(`Webhook Error: ${msg}`);
    }

    let payloadForDb;
    try {
      payloadForDb = JSON.stringify(event);
    } catch {
      payloadForDb = JSON.stringify({ id: event.id, type: event.type });
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const ins = await client.query(
        `insert into stripe_events (id, type, payload, processed)
         values ($1, $2, $3::jsonb, false)
         on conflict (id) do nothing
         returning id`,
        [event.id, event.type, payloadForDb]
      );

      if (ins.rows.length === 0) {
        const prev = await client.query(
          `select processed from stripe_events where id = $1 for update`,
          [event.id]
        );
        if (prev.rows[0]?.processed) {
          await client.query("COMMIT");
          return res.json({ received: true, duplicate: true });
        }
      }

      switch (event.type) {
        case "checkout.session.completed":
          await handleCheckoutSessionCompleted(client, stripe, event);
          break;
        case "transfer.paid":
          await handleTransferPaid(client, event);
          break;
        case "transfer.failed":
          await handleTransferFailed(client, event);
          break;
        case "charge.refund.updated":
        case "charge.dispute.created":
        case "charge.dispute.closed":
        case "charge.refunded":
          // Reservado para fases seguintes (cancelamentos / disputas).
          break;
        default:
          break;
      }

      await client.query(`update stripe_events set processed = true where id = $1`, [event.id]);
      await client.query("COMMIT");
      return res.json({ received: true });
    } catch (e) {
      await client.query("ROLLBACK").catch(() => {});
      const msg = e instanceof Error ? e.message : String(e);
      // eslint-disable-next-line no-console
      console.error("[stripe webhook] erro:", msg);
      return res.status(500).send("Webhook handler error");
    } finally {
      client.release();
    }
  });
}

/**
 * @param {import("pg").PoolClient} client
 * @param {import("stripe").Stripe} stripe
 * @param {import("stripe").Stripe.Event} event
 */
async function handleCheckoutSessionCompleted(client, stripe, event) {
  /** @type {import("stripe").Stripe.Checkout.Session} */
  const session = event.data.object;
  await applyPaidCheckoutSessionInTx(client, stripe, session, `${event.id}:payment_in`);
}

/**
 * @param {import("pg").PoolClient} client
 * @param {import("stripe").Stripe.Event} event
 */
async function handleTransferPaid(client, event) {
  /** @type {import("stripe").Stripe.Transfer} */
  const transfer = event.data.object;
  await finalizeTransferPaidInTx(client, transfer, event.id);
}

/**
 * @param {import("pg").PoolClient} client
 * @param {import("stripe").Stripe.Event} event
 */
async function handleTransferFailed(client, event) {
  /** @type {import("stripe").Stripe.Transfer} */
  const transfer = event.data.object;
  const stripeTransferId = transfer.id;
  const failureReason = transfer.failure_message || "transfer_failed";

  await client.query(
    `update stripe_connect_transfers
     set status = 'FAILED',
         last_error = $2,
         failed_at = now(),
         updated_at = now()
     where stripe_transfer_id = $1`,
    [stripeTransferId, failureReason]
  );

  const tr = await client.query(
    `select booking_id from stripe_connect_transfers where stripe_transfer_id = $1 limit 1`,
    [stripeTransferId]
  );
  const bookingId = tr.rows[0]?.booking_id;
  if (bookingId) {
    await client.query(
      `update bookings set stripe_flow_status = $2 where id = $1::uuid`,
      [bookingId, StripeFlowStatus.TRANSFER_FAILED]
    );
  }
}
