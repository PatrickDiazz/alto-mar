import { pool, query } from "../db.js";
import { getStripe } from "./client.js";
import { splitPlatformOwnerNet } from "./fees.js";
import { StripeFlowStatus } from "./flowStatus.js";
import { applyPaidCheckoutSessionInTx } from "./applyCheckoutPaid.js";
import { ensureStripePixOnPaymentMethodConfigurations } from "./ensureStripePixPmc.js";
import { isStripePixEnabled } from "./pixEnabled.js";

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:8080";

/**
 * Sufixo da chave de idempotência do Checkout. A Stripe só reutiliza a mesma chave
 * com parâmetros idênticos — ao mudar payment_method_types, URLs, etc., incrementar.
 */
/** Incrementar se mudar de novo o corpo do `checkout.sessions.create` (idempotência Stripe). */
const CHECKOUT_SESSION_IDEMPOTENCY_VERSION = 3;

/**
 * Cria sessão Stripe Checkout para uma reserva já aceita (pagamento pós-aceite).
 * @param {{ bookingId: string; renterUserId: string }} input
 */
export async function createStripeCheckoutSessionForBooking(input) {
  const stripe = getStripe();
  if (!stripe) {
    const e = new Error("STRIPE_SECRET_KEY não configurado.");
    e.code = "STRIPE_DISABLED";
    throw e;
  }

  const r = await query(
    `select bk.id, bk.status, bk.renter_user_id, bk.owner_user_id, bk.total_cents, bk.stripe_flow_status,
            bk.stripe_checkout_session_id,
            u_owner.stripe_connect_account_id as owner_stripe_account,
            renter.email::text as renter_email
     from bookings bk
     join users u_owner on u_owner.id = bk.owner_user_id
     join users renter on renter.id = bk.renter_user_id
     where bk.id = $1::uuid
     limit 1`,
    [input.bookingId]
  );
  const b = r.rows[0];
  if (!b) {
    const e = new Error("Reserva não encontrada.");
    e.code = "NOT_FOUND";
    throw e;
  }
  if (b.renter_user_id !== input.renterUserId) {
    const e = new Error("Não autorizado.");
    e.code = "FORBIDDEN";
    throw e;
  }
  if (b.status !== "PENDING" && b.status !== "ACCEPTED") {
    const e = new Error("Só é possível pagar enquanto a reserva estiver pendente ou já aceita pelo locador.");
    e.code = "INVALID_STATUS";
    throw e;
  }
  if (!b.owner_stripe_account) {
    const e = new Error("O locador ainda não configurou o recebimento (Stripe Connect).");
    e.code = "OWNER_NOT_ONBOARDED";
    throw e;
  }

  const pay = await query(
    `select provider, status from payments where booking_id = $1::uuid limit 1`,
    [input.bookingId]
  );
  const prow = pay.rows[0];
  if (prow?.provider === "MERCADO_PAGO" && prow.status === "APPROVED") {
    const e = new Error("Esta reserva já foi paga por outro meio.");
    e.code = "ALREADY_PAID_MP";
    throw e;
  }
  if (prow?.provider === "STRIPE" && prow.status === "APPROVED") {
    const e = new Error("Esta reserva já está paga.");
    e.code = "ALREADY_PAID";
    throw e;
  }

  const totalCents = Number(b.total_cents);
  const { platformFeeCents, ownerNetCents } = splitPlatformOwnerNet(totalCents);

  const renterEmail = b.renter_email ? String(b.renter_email).trim() : "";
  const pixOn = isStripePixEnabled();

  if (
    pixOn &&
    String(process.env.STRIPE_SKIP_PIX_PMC || "").trim() !== "1"
  ) {
    await ensureStripePixOnPaymentMethodConfigurations(stripe);
    await ensureStripePixOnPaymentMethodConfigurations(stripe, {
      stripeAccount: b.owner_stripe_account,
    });
  }

  const session = await stripe.checkout.sessions.create(
    {
      mode: "payment",
      /** BRL: cartão; com STRIPE_PIX_ENABLED=1 inclui PIX e PMC (ensureStripePixPmc). */
      payment_method_types: pixOn ? ["card", "pix"] : ["card"],
      ...(pixOn
        ? {
            payment_method_options: {
              pix: {
                expires_after_seconds: 86_400,
              },
            },
          }
        : {}),
      locale: "pt-BR",
      ...(renterEmail ? { customer_email: renterEmail } : {}),
      client_reference_id: input.bookingId,
      metadata: {
        booking_id: input.bookingId,
        renter_user_id: input.renterUserId,
      },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "brl",
            unit_amount: totalCents,
            product_data: {
              name: "Reserva Alto Mar",
              description: `Reserva ${String(input.bookingId).slice(0, 8)}…`,
            },
          },
        },
      ],
      success_url: `${FRONTEND_URL}/conta/reservas?stripe=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${FRONTEND_URL}/conta/reservas?stripe=cancel`,
    },
    {
      idempotencyKey: `checkout_session_booking_${input.bookingId}_v${CHECKOUT_SESSION_IDEMPOTENCY_VERSION}`,
    }
  );

  await query(
    `update bookings
     set stripe_checkout_session_id = $2,
         stripe_flow_status = $3,
         platform_fee_cents = $4,
         owner_net_cents = $5
     where id = $1::uuid`,
    [input.bookingId, session.id, StripeFlowStatus.CHECKOUT_PENDING, platformFeeCents, ownerNetCents]
  );

  await query(
    `insert into payments (booking_id, provider, status, stripe_checkout_session_id, amount_cents, currency)
     values ($1::uuid, 'STRIPE', 'CREATED', $2, $3, 'brl')
     on conflict (booking_id) do update set
       provider = 'STRIPE',
       status = case when payments.status = 'APPROVED' then payments.status else 'CREATED' end,
       stripe_checkout_session_id = excluded.stripe_checkout_session_id,
       amount_cents = excluded.amount_cents,
       currency = excluded.currency,
       updated_at = now()`,
    [input.bookingId, session.id, totalCents]
  );

  return { url: session.url, sessionId: session.id };
}

/**
 * Após o Checkout em localhost (sem webhook), confirma o pagamento na BD usando o session_id da URL de sucesso.
 * @param {{ sessionId: string; renterUserId: string }} input
 */
export async function syncPaidCheckoutSessionFromReturn(input) {
  const stripe = getStripe();
  if (!stripe) {
    const e = new Error("STRIPE_SECRET_KEY não configurado.");
    e.code = "STRIPE_DISABLED";
    throw e;
  }

  const session = await stripe.checkout.sessions.retrieve(input.sessionId, {
    expand: ["payment_intent.latest_charge"],
  });

  if (String(session.metadata?.renter_user_id || "") !== String(input.renterUserId)) {
    const e = new Error("Não autorizado.");
    e.code = "FORBIDDEN";
    throw e;
  }

  if (session.payment_status !== "paid") {
    const e = new Error("O pagamento ainda não foi concluído nesta sessão.");
    e.code = "NOT_PAID";
    throw e;
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await applyPaidCheckoutSessionInTx(
      client,
      stripe,
      session,
      `return_sync_${session.id}:payment_in`
    );
    await client.query("COMMIT");
    return { ok: true };
  } catch (e) {
    await client.query("ROLLBACK").catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}
