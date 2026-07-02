/**
 * Cria reservas de teste via API (mesmo fluxo do site) com pagamento Stripe real (modo teste)
 * e comprovante (receipt_url) quando STRIPE_SECRET_KEY está configurado.
 *
 * Uso: npm run db:seed-stripe-bookings
 * Requer: API em http://127.0.0.1:3001, BD com seed demo, PAYMENTS_PROVIDER=stripe
 *
 * Variáveis opcionais:
 *   SEED_BOOKING_COUNT=15
 *   SEED_API_URL=http://127.0.0.1:3001
 */
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import bcrypt from "bcryptjs";
import { query, pool } from "./db.js";
import { ensureStripeConnectSchema } from "./stripe/schema.js";
import { demoOwnerDefaults } from "./demoFleet.js";
import { splitPlatformOwnerNet } from "./stripe/fees.js";
import { StripeFlowStatus } from "./stripe/flowStatus.js";
import { getBookingLedgerBalanceForUpdate, insertLedgerEntry } from "./stripe/ledger.js";
import {
  ensureDemoOwnerStripeConnect,
  payStripeCheckoutSessionInTestMode,
} from "./seedStripePay.js";
import { getStripe } from "./stripe/client.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, ".env") });

const API = process.env.SEED_API_URL || "http://127.0.0.1:3001";
const BOOKING_COUNT = Math.max(1, Number(process.env.SEED_BOOKING_COUNT) || 15);
const BANHISTA_EMAIL = process.env.DEMO_BANHISTA_EMAIL || "banhista.demo@alto.com";
const BANHISTA_PASSWORD = process.env.DEMO_BANHISTA_PASSWORD || "123456";
const BANHISTA_NAME = process.env.DEMO_BANHISTA_NAME || "Banhista Demo";

/** Mesma regra de ocupação do calendário (ACCEPTED/COMPLETED bloqueiam o dia). */
const SLOT_OCCUPIED = new Set(["ACCEPTED", "COMPLETED"]);

function ymdAddDays(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function dowLocal(ymd) {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d).getDay();
}

async function pickAvailableBookingDate(boatId, startOffset = 3) {
  const from = ymdAddDays(startOffset);
  const to = ymdAddDays(startOffset + 120);
  const cal = await api(`/api/boats/${boatId}/calendar?from=${from}&to=${to}`);
  const weekdayLocks = new Set(cal.weekdayLocks || []);
  const dateLocks = new Set(cal.dateLocks || []);
  const occupied = new Set(
    (cal.bookings || [])
      .filter((b) => SLOT_OCCUPIED.has(b.status))
      .map((b) => b.date)
  );

  for (let offset = startOffset; offset < startOffset + 120; offset++) {
    const date = ymdAddDays(offset);
    if (weekdayLocks.has(dowLocal(date))) continue;
    if (dateLocks.has(date)) continue;
    if (occupied.has(date)) continue;
    return date;
  }
  throw new Error(`Sem data livre para o barco ${boatId} nos próximos 120 dias.`);
}

async function api(pathname, { method = "GET", token, body } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const resp = await fetch(`${API}${pathname}`, {
    method,
    headers,
    body: body != null ? JSON.stringify(body) : undefined,
  });
  const text = await resp.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!resp.ok) {
    throw new Error(typeof data === "string" ? data : data?.message || text || resp.statusText);
  }
  return data;
}

async function ensureBanhistaUser() {
  const existing = await query(`select id from users where email = $1 limit 1`, [BANHISTA_EMAIL]);
  if (existing.rows[0]) return existing.rows[0].id;
  const hash = await bcrypt.hash(BANHISTA_PASSWORD, 10);
  const ins = await query(
    `insert into users (name, email, password_hash, role) values ($1, $2, $3, 'banhista') returning id`,
    [BANHISTA_NAME, BANHISTA_EMAIL, hash]
  );
  return ins.rows[0].id;
}

/** Fallback quando Stripe Connect/checkout não estão disponíveis (sem receipt_url real). */
async function markStripePaymentPaidFallback(bookingId, totalCents, flowStatus) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { platformFeeCents, ownerNetCents } = splitPlatformOwnerNet(Number(totalCents));
    const fakePi = `pi_demo_${bookingId.replace(/-/g, "").slice(0, 16)}`;
    const fakeCh = `ch_demo_${bookingId.replace(/-/g, "").slice(0, 16)}`;

    await client.query(
      `update bookings
       set stripe_flow_status = $2,
           platform_fee_cents = $3,
           owner_net_cents = $4,
           stripe_checkout_session_id = coalesce(stripe_checkout_session_id, $5)
       where id = $1::uuid`,
      [bookingId, flowStatus, platformFeeCents, ownerNetCents, `cs_demo_${bookingId.slice(0, 8)}`]
    );

    const up = await client.query(
      `update payments
       set provider = 'STRIPE',
           status = 'APPROVED',
           stripe_payment_intent_id = $2,
           stripe_charge_id = $3,
           amount_cents = $4,
           currency = 'brl',
           paid_at = now(),
           updated_at = now()
       where booking_id = $1::uuid`,
      [bookingId, fakePi, fakeCh, Number(totalCents)]
    );
    if (!up.rowCount) {
      await client.query(
        `insert into payments (
           booking_id, provider, status, stripe_payment_intent_id, stripe_charge_id,
           amount_cents, currency, paid_at
         ) values ($1::uuid, 'STRIPE', 'APPROVED', $2, $3, $4, 'brl', now())`,
        [bookingId, fakePi, fakeCh, Number(totalCents)]
      );
    }

    const eventId = `seed_demo_${bookingId}:payment_in`;
    const dup = await client.query(`select 1 from stripe_connect_ledger where event_id = $1`, [eventId]);
    if (!dup.rows[0]) {
      const balance = await getBookingLedgerBalanceForUpdate(client, bookingId);
      await insertLedgerEntry(client, {
        bookingId,
        entryType: "PAYMENT_IN",
        amountCents: Number(totalCents),
        runningBalanceCents: balance + Number(totalCents),
        eventId,
        description: "Pagamento de teste (seed Stripe fallback)",
        metadata: { seed: true, simulated: true },
      });
    }

    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

async function loginOrSignupBanhista() {
  try {
    const login = await api("/api/auth/login", {
      method: "POST",
      body: { email: BANHISTA_EMAIL, password: BANHISTA_PASSWORD },
    });
    return login.token;
  } catch {
    await api("/api/auth/signup", {
      method: "POST",
      body: {
        name: BANHISTA_NAME,
        email: BANHISTA_EMAIL,
        phone: "21999999999",
        password: BANHISTA_PASSWORD,
        confirmPassword: BANHISTA_PASSWORD,
        role: "banhista",
        acceptTerms: true,
        acceptPrivacy: true,
        acceptCancellation: true,
        acceptStripe: true,
      },
    });
    await query(
      `update users set email_verified_at = COALESCE(email_verified_at, now()) where email = $1`,
      [BANHISTA_EMAIL]
    );
    const login = await api("/api/auth/login", {
      method: "POST",
      body: { email: BANHISTA_EMAIL, password: BANHISTA_PASSWORD },
    });
    return login.token;
  }
}

async function payBookingLikeApp({ bookingId, totalCents, banhistaToken, banhistaUserId, useRealStripe }) {
  if (!useRealStripe) {
    await markStripePaymentPaidFallback(bookingId, totalCents, StripeFlowStatus.PAID);
    return { mode: "fallback", receiptUrl: null };
  }

  const checkout = await api("/api/stripe/checkout-session", {
    method: "POST",
    token: banhistaToken,
    body: { bookingId, returnBaseUrl: "http://localhost:8080" },
  });

  const paid = await payStripeCheckoutSessionInTestMode({
    sessionId: checkout.sessionId,
    bookingId,
    renterUserId: banhistaUserId,
    totalCents,
    renterEmail: BANHISTA_EMAIL,
  });

  return { mode: "stripe", receiptUrl: paid.receiptUrl, sessionId: paid.sessionId };
}

async function main() {
  const paymentsStripe = String(process.env.PAYMENTS_PROVIDER || "").toLowerCase() === "stripe";
  const stripeConfigured = Boolean(getStripe());

  if (!paymentsStripe) {
    // eslint-disable-next-line no-console
    console.warn("[seed] PAYMENTS_PROVIDER não é 'stripe'. Defina no server/.env.");
  }
  if (!stripeConfigured) {
    // eslint-disable-next-line no-console
    console.warn("[seed] STRIPE_SECRET_KEY ausente — pagamentos serão simulados (sem comprovante Stripe).");
  }

  await ensureStripeConnectSchema();

  try {
    await fetch(`${API}/api/health`);
  } catch {
    throw new Error(`API indisponível em ${API}. Inicie com: npm run dev:all`);
  }

  const banhistaUserId = await ensureBanhistaUser();
  const banhistaToken = await loginOrSignupBanhista();

  const { email: ownerEmail, password: ownerPassword, name: ownerName } = demoOwnerDefaults();
  const ownerLogin = await api("/api/auth/login", {
    method: "POST",
    body: { email: ownerEmail, password: ownerPassword },
  });
  const ownerToken = ownerLogin.token;

  const ownerRow = await query(`select id from users where email = $1 limit 1`, [ownerEmail]);
  const ownerUserId = ownerRow.rows[0]?.id;
  if (!ownerUserId) throw new Error("Locador demo não encontrado. Execute npm run db:seed");

  let connectReady = false;
  if (stripeConfigured) {
    const connect = await ensureDemoOwnerStripeConnect(ownerUserId, {
      email: ownerEmail,
      name: ownerName,
    });
    connectReady = connect.ready;
    if (!connectReady) {
      // eslint-disable-next-line no-console
      console.warn(
        "[seed] Stripe Connect do locador incompleto. Complete em /marinheiro (Recebimentos) ou os pagamentos usarão fallback simulado."
      );
    }
  }

  const useRealStripe = stripeConfigured && connectReady;

  const boatsList = await api("/api/boats");
  const boats = boatsList.boats || [];
  if (boats.length === 0) {
    throw new Error("Nenhum barco na base. Execute: npm run db:seed");
  }

  const created = [];
  let daySearchStart = 3;

  for (let i = 0; i < BOOKING_COUNT; i++) {
    const boat = boats[i % boats.length];
    const detail = await api(`/api/boats/${boat.id}`);
    const b = detail.boat;
    const bookingDate = await pickAvailableBookingDate(boat.id, daySearchStart);
    daySearchStart += 2;
    const embarkLocation = b.locaisEmbarque?.[0] ?? null;
    const embarkTime = b.horariosEmbarque?.[0] ?? null;
    const priceRow = await query(`select price_cents from boats where id = $1::uuid`, [boat.id]);
    const totalCents = Number(priceRow.rows[0]?.price_cents) || 180_000;
    const capacity = Math.max(1, Number(b.capacidade ?? 8));
    const passengersAdults = Math.min(2 + (i % 3), capacity);
    const passengersChildren =
      i % 5 === 0 && passengersAdults + 1 <= capacity ? 1 : 0;

    const createdBooking = await api("/api/bookings", {
      method: "POST",
      token: banhistaToken,
      body: {
        boatId: boat.id,
        bookingDate,
        passengersAdults,
        passengersChildren,
        hasKids: passengersChildren > 0,
        bbqKit: false,
        jetSki: false,
        embarkLocation,
        embarkTime,
        totalCents,
        routeIslands: [],
      },
    });

    const bookingId = createdBooking.booking.id;

    const payment = await payBookingLikeApp({
      bookingId,
      totalCents,
      banhistaToken,
      banhistaUserId,
      useRealStripe,
    });

    const acceptNow = i % 5 !== 0;
    let status = "PENDING";
    if (acceptNow) {
      await api(`/api/owner/bookings/${bookingId}/accept`, {
        method: "POST",
        token: ownerToken,
        body: { note: `Aceite automático (seed #${i + 1})` },
      });
      status = "ACCEPTED";
    }

    created.push({
      bookingId,
      boat: b.nome,
      date: bookingDate,
      totalCents,
      status,
      paymentMode: payment.mode,
      receiptUrl: payment.receiptUrl,
    });

    // eslint-disable-next-line no-console
    console.log(
      `  [${i + 1}/${BOOKING_COUNT}] ${b.nome} · ${bookingDate} · ${status} · ${payment.mode}${payment.receiptUrl ? " · comprovante OK" : ""}`
    );
  }

  const withReceipt = created.filter((r) => r.receiptUrl).length;

  // eslint-disable-next-line no-console
  console.log(`\n${created.length} reserva(s) futura(s) criada(s) (${withReceipt} com comprovante Stripe real):\n`);
  for (const row of created) {
    // eslint-disable-next-line no-console
    console.log(
      `  • ${row.boat} | ${row.date} | ${row.status} | R$ ${(row.totalCents / 100).toFixed(2)} | pagamento: ${row.paymentMode}`
    );
    if (row.receiptUrl) {
      // eslint-disable-next-line no-console
      console.log(`    comprovante: ${row.receiptUrl}`);
    }
  }
  // eslint-disable-next-line no-console
  console.log(`\nLocador: ${ownerEmail} / ${ownerPassword}`);
  // eslint-disable-next-line no-console
  console.log(`Banhista: ${BANHISTA_EMAIL} / ${BANHISTA_PASSWORD}`);
  // eslint-disable-next-line no-console
  console.log("\nAgenda: http://localhost:8080/marinheiro/agenda");
  // eslint-disable-next-line no-console
  console.log("Reservas: http://localhost:8080/marinheiro/reservas\n");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exit(1);
  });
