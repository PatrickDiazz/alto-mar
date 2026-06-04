/**
 * Cria reservas de teste via API (mesmo fluxo do site) e marca pagamentos Stripe
 * para popular a tela de Faturamento do locador demo.
 *
 * Uso: npm --prefix server run seed:stripe-bookings
 * Requer: API em http://127.0.0.1:3001, BD com seed demo, PAYMENTS_PROVIDER=stripe
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

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, ".env") });

const API = process.env.SEED_API_URL || "http://127.0.0.1:3001";
const BANHISTA_EMAIL = process.env.DEMO_BANHISTA_EMAIL || "banhista.demo@alto.com";
const BANHISTA_PASSWORD = process.env.DEMO_BANHISTA_PASSWORD || "123456";
const BANHISTA_NAME = process.env.DEMO_BANHISTA_NAME || "Banhista Demo";

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
  const to = ymdAddDays(startOffset + 50);
  const cal = await api(`/api/boats/${boatId}/calendar?from=${from}&to=${to}`);
  const weekdayLocks = new Set(cal.weekdayLocks || []);
  const dateLocks = new Set(cal.dateLocks || []);
  const occupied = new Set(
    (cal.bookings || [])
      .filter((b) => b.status === "PENDING" || b.status === "ACCEPTED" || b.status === "COMPLETED")
      .map((b) => b.date)
  );

  for (let offset = startOffset; offset < startOffset + 50; offset++) {
    const date = ymdAddDays(offset);
    if (weekdayLocks.has(dowLocal(date))) continue;
    if (dateLocks.has(date)) continue;
    if (occupied.has(date)) continue;
    return date;
  }
  throw new Error(`Sem data livre para o barco ${boatId} nos próximos 50 dias.`);
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

async function markStripePaymentPaid(bookingId, totalCents, flowStatus, withTransfer = false) {
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
        description: "Pagamento de teste (seed Stripe)",
        metadata: { seed: true },
      });
    }

    if (withTransfer) {
      const owner = await client.query(
        `select owner_user_id from bookings where id = $1::uuid`,
        [bookingId]
      );
      const hasTr = await client.query(
        `select 1 from stripe_connect_transfers where booking_id = $1::uuid limit 1`,
        [bookingId]
      );
      if (!hasTr.rows[0]) {
        await client.query(
          `insert into stripe_connect_transfers (
             booking_id, owner_user_id, stripe_transfer_id, amount_cents, status, paid_at
           ) values ($1::uuid, $2::uuid, $3, $4, 'PAID', now())`,
          [
            bookingId,
            owner.rows[0].owner_user_id,
            `tr_demo_${bookingId.slice(0, 12)}`,
            ownerNetCents,
          ]
        );
      }
    }

    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

async function main() {
  if (String(process.env.PAYMENTS_PROVIDER || "").toLowerCase() !== "stripe") {
    // eslint-disable-next-line no-console
    console.warn(
      "[seed] PAYMENTS_PROVIDER não é 'stripe'. Defina no server/.env para o fluxo completo."
    );
  }

  await ensureStripeConnectSchema();

  try {
    await fetch(`${API}/api/health`);
  } catch {
    throw new Error(`API indisponível em ${API}. Inicie com: npm run dev:server:stable`);
  }

  await ensureBanhistaUser();

  const { email: ownerEmail, password: ownerPassword } = demoOwnerDefaults();

  let banhistaToken;
  try {
    const login = await api("/api/auth/login", {
      method: "POST",
      body: { email: BANHISTA_EMAIL, password: BANHISTA_PASSWORD },
    });
    banhistaToken = login.token;
  } catch {
    await api("/api/auth/signup", {
      method: "POST",
      body: {
        name: BANHISTA_NAME,
        email: BANHISTA_EMAIL,
        password: BANHISTA_PASSWORD,
        role: "banhista",
      },
    });
    const login = await api("/api/auth/login", {
      method: "POST",
      body: { email: BANHISTA_EMAIL, password: BANHISTA_PASSWORD },
    });
    banhistaToken = login.token;
  }

  const ownerLogin = await api("/api/auth/login", {
    method: "POST",
    body: { email: ownerEmail, password: ownerPassword },
  });
  const ownerToken = ownerLogin.token;

  const boatsList = await api("/api/boats");
  const boats = (boatsList.boats || []).slice(0, 5);
  if (boats.length === 0) {
    throw new Error("Nenhum barco na base. Execute: npm run db:seed");
  }

  const created = [];
  let daySearchStart = 3;

  for (let i = 0; i < boats.length; i++) {
    const boat = boats[i];
    const detail = await api(`/api/boats/${boat.id}`);
    const b = detail.boat;
    const bookingDate = await pickAvailableBookingDate(boat.id, daySearchStart);
    daySearchStart += 1;
    const embarkLocation = b.locaisEmbarque?.[0] ?? null;
    const embarkTime = b.horariosEmbarque?.[0] ?? null;
    const priceRow = await query(`select price_cents from boats where id = $1::uuid`, [boat.id]);
    const totalCents = Number(priceRow.rows[0]?.price_cents) || 180_000;

    const createdBooking = await api("/api/bookings", {
      method: "POST",
      token: banhistaToken,
      body: {
        boatId: boat.id,
        bookingDate,
        passengersAdults: 2,
        passengersChildren: 0,
        hasKids: false,
        bbqKit: false,
        jetSki: false,
        embarkLocation,
        embarkTime,
        totalCents,
        routeIslands: [],
      },
    });

    const bookingId = createdBooking.booking.id;
    const flowStatus =
      i < 2 ? StripeFlowStatus.TRANSFER_PAID : StripeFlowStatus.PAID;
    await markStripePaymentPaid(bookingId, totalCents, flowStatus, i < 2);

    await api(`/api/owner/bookings/${bookingId}/accept`, {
      method: "POST",
      token: ownerToken,
      body: { note: "Aceite automático (seed teste faturamento)" },
    });

    created.push({ bookingId, boat: b.nome, date: bookingDate, totalCents, flowStatus });
  }

  // eslint-disable-next-line no-console
  console.log(`\n${created.length} reserva(s) Stripe de teste criada(s):\n`);
  for (const row of created) {
    // eslint-disable-next-line no-console
    console.log(`  • ${row.boat} | ${row.date} | R$ ${(row.totalCents / 100).toFixed(2)} | ${row.flowStatus}`);
  }
  // eslint-disable-next-line no-console
  console.log(`\nLocador: ${ownerEmail} / ${ownerPassword}`);
  // eslint-disable-next-line no-console
  console.log(`Banhista: ${BANHISTA_EMAIL} / ${BANHISTA_PASSWORD}`);
  // eslint-disable-next-line no-console
  console.log("\nAbra: http://localhost:8080/marinheiro/faturamento\n");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exit(1);
  });
