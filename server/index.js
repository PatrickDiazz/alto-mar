import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "node:crypto";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, ".env") });
import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { MercadoPagoConfig, Preference } from "mercadopago";
import { query } from "./db.js";
import { requireAuth, requireRole, signToken } from "./auth.js";

const PORT = process.env.PORT ? Number(process.env.PORT) : 3001;
const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN;
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:8080";
const DATABASE_URL = process.env.DATABASE_URL;

if (!MP_ACCESS_TOKEN) {
  // Opcional em dev; só necessário para criar preferências Mercado Pago.
  // eslint-disable-next-line no-console
  console.warn(
    "[alto-mar] MP_ACCESS_TOKEN não definido — checkout MP desativado. Para testar pagamentos, defina em server/.env."
  );
}
if (!DATABASE_URL) {
  // eslint-disable-next-line no-console
  console.error("Missing DATABASE_URL in server environment.");
}

const mp = new MercadoPagoConfig({ accessToken: MP_ACCESS_TOKEN || "" });
const preferenceClient = new Preference(mp);

async function ensureFavoritesTable() {
  await query(`
    create table if not exists user_boat_favorites (
      user_id uuid not null references users(id) on delete cascade,
      boat_id uuid not null references boats(id) on delete cascade,
      created_at timestamptz not null default now(),
      primary key (user_id, boat_id)
    )
  `);
  await query(`
    create index if not exists idx_user_boat_favorites_user
      on user_boat_favorites(user_id, created_at desc)
  `);
}

async function ensureBoatsRouteIslandsColumn() {
  await query(`alter table boats add column if not exists route_islands text[] not null default '{}'::text[]`);
}

async function ensureBoatsRouteIslandImagesColumn() {
  await query(
    `alter table boats add column if not exists route_island_images jsonb not null default '{}'::jsonb`
  );
}

async function ensureUserProfileColumns() {
  await query(`alter table users add column if not exists rg_url text null`);
  await query(`alter table users add column if not exists nautical_license_url text null`);
}

async function ensureBoatDocumentAndMediaColumns() {
  await query(`alter table boats add column if not exists tie_document_url text null`);
  await query(`alter table boats add column if not exists tiem_document_url text null`);
  await query(`alter table boats add column if not exists video_url text null`);
}

async function ensureBookingsRouteIslandsColumn() {
  await query(
    `alter table bookings add column if not exists route_islands text[] not null default '{}'::text[]`
  );
}

async function ensureBookingStatusCompleted() {
  try {
    await query(`alter type booking_status add value 'COMPLETED'`);
  } catch (e) {
    const code = e && typeof e === "object" && "code" in e ? String(e.code) : "";
    const m = e instanceof Error ? e.message : String(e);
    // PG EN: already exists | PT: já existe | código duplicate_object
    if (code === "42710" || /already exists|duplicate|já existe/i.test(m)) return;
    throw e;
  }
}

async function ensureSeedAmenities() {
  const defaults = [
    "Banho com água doce",
    "Carvão",
    "Coletes salva-vidas",
    "Cooler",
    "Gelo",
    "Som Bluetooth",
    "Kit churrasco",
  ];
  for (const name of defaults) {
    await query(`insert into amenities (name) values ($1) on conflict (name) do nothing`, [name]);
  }
}

async function ensureBookingDateColumn() {
  await query(`alter table bookings add column if not exists booking_date date`);
  await query(
    `update bookings set booking_date = coalesce(booking_date, (created_at at time zone 'UTC')::date) where booking_date is null`
  );
  await query(`update bookings set booking_date = current_date where booking_date is null`);
  await query(`alter table bookings alter column booking_date set not null`);
}

async function ensureBoatCalendarTables() {
  await query(`
    create table if not exists boat_date_locks (
      boat_id uuid not null references boats(id) on delete cascade,
      locked_date date not null,
      primary key (boat_id, locked_date)
    )
  `);
  await query(`
    create table if not exists boat_weekday_locks (
      boat_id uuid not null references boats(id) on delete cascade,
      weekday smallint not null check (weekday >= 0 and weekday <= 6),
      primary key (boat_id, weekday)
    )
  `);
  await query(`create index if not exists idx_bookings_boat_date on bookings(boat_id, booking_date)`);
}

async function ensureBookingRatingsTable() {
  await query(`
    alter table users add column if not exists guest_rating numeric(2,1) not null default 0.0
      check (guest_rating >= 0 and guest_rating <= 5)
  `);
  await query(`
    create table if not exists booking_ratings (
      booking_id uuid primary key references bookings(id) on delete cascade,
      boat_stars smallint null check (boat_stars is null or (boat_stars >= 1 and boat_stars <= 5)),
      boat_comment text null,
      boat_rated_at timestamptz null,
      renter_stars smallint null check (renter_stars is null or (renter_stars >= 1 and renter_stars <= 5)),
      renter_comment text null,
      renter_rated_at timestamptz null
    )
  `);
}

async function ensureBoatEmbarkSlotsAndBookingEmbarkColumns() {
  await query(`
    create table if not exists boat_embark_slots (
      boat_id uuid not null references boats(id) on delete cascade,
      slot_time time not null,
      sort_order smallint not null default 0,
      primary key (boat_id, slot_time)
    )
  `);
  await query(
    `create index if not exists idx_boat_embark_slots_boat on boat_embark_slots(boat_id, sort_order)`
  );
  await query(`alter table bookings add column if not exists embark_time time null`);
  await query(`alter table bookings alter column embark_location drop not null`);
}

async function ensureBookingsRescheduleColumns() {
  await query(`alter table bookings add column if not exists reschedule_reason text null`);
  await query(`alter table bookings add column if not exists reschedule_title text null`);
  await query(`alter table bookings add column if not exists reschedule_note text null`);
  await query(
    `alter table bookings add column if not exists reschedule_attachments text[] not null default '{}'::text[]`
  );
}

async function ensureJetSkiBoatAndBookingColumns() {
  await query(`alter table boats add column if not exists jet_ski_offered boolean not null default false`);
  await query(
    `alter table boats add column if not exists jet_ski_price_cents integer not null default 0`
  );
  await query(
    `alter table boats add column if not exists jet_ski_image_urls text[] not null default '{}'::text[]`
  );
  await query(`alter table boats add column if not exists jet_ski_document_url text null`);
  await query(
    `alter table bookings add column if not exists jet_ski_selected boolean not null default false`
  );
}

/** Preço fixo do kit churrasco (R$ 250) em centavos — alinhado ao frontend. */
const KIT_CHURRASCO_CENTS = 250 * 100;

function expectedBookingTotalCents(row) {
  const boatPrice = Number(row.price_cents ?? 0);
  let t = boatPrice;
  if (row.bbq_kit) t += KIT_CHURRASCO_CENTS;
  if (row.jet_ski_selected) {
    if (!row.jet_ski_offered || Number(row.jet_ski_price_cents ?? 0) <= 0) {
      const e = new Error("Moto aquática não disponível para esta embarcação.");
      e.code = "JET_SKI_INVALID";
      throw e;
    }
    t += Number(row.jet_ski_price_cents);
  }
  return Math.round(t);
}

/**
 * @param {string} boatId
 */
async function recalcBoatRating(boatId) {
  const r = await query(
    `select coalesce(round(avg(br.boat_stars)::numeric, 1), 0)::numeric(2,1) as avg_stars
     from booking_ratings br
     join bookings bk on bk.id = br.booking_id
     where bk.boat_id = $1::uuid and br.boat_stars is not null`,
    [boatId]
  );
  const avg = r.rows[0]?.avg_stars ?? 0;
  await query(`update boats set rating = $1 where id = $2::uuid`, [avg, boatId]);
}

/**
 * @param {string} renterUserId
 */
async function recalcGuestRating(renterUserId) {
  const r = await query(
    `select coalesce(round(avg(br.renter_stars)::numeric, 1), 0)::numeric(2,1) as avg_stars
     from booking_ratings br
     join bookings bk on bk.id = br.booking_id
     where bk.renter_user_id = $1::uuid and br.renter_stars is not null`,
    [renterUserId]
  );
  const avg = r.rows[0]?.avg_stars ?? 0;
  await query(`update users set guest_rating = $1 where id = $2::uuid`, [avg, renterUserId]);
}

/**
 * @param {string} boatId
 * @param {string} bookingDateStr YYYY-MM-DD
 * @param {string | null | undefined} excludeBookingId
 */
async function assertBookingSlotAvailable(boatId, bookingDateStr, excludeBookingId) {
  const dl = await query(
    `select 1 from boat_date_locks where boat_id = $1 and locked_date = $2::date limit 1`,
    [boatId, bookingDateStr]
  );
  if (dl.rows[0]) {
    const e = new Error("Este dia está bloqueado pelo armador.");
    e.code = "DATE_LOCKED";
    throw e;
  }
  const wd = await query(
    `select 1 from boat_weekday_locks where boat_id = $1 and weekday = extract(dow from $2::date)::smallint limit 1`,
    [boatId, bookingDateStr]
  );
  if (wd.rows[0]) {
    const e = new Error("Este dia da semana está bloqueado pelo armador.");
    e.code = "WEEKDAY_LOCKED";
    throw e;
  }
  const params = [boatId, bookingDateStr];
  let sql = `select id from bookings where boat_id = $1 and booking_date = $2::date
    and status in ('ACCEPTED','COMPLETED')`;
  if (excludeBookingId) {
    sql += ` and id <> $3::uuid`;
    params.push(excludeBookingId);
  }
  sql += ` limit 1`;
  const cf = await query(sql, params);
  if (cf.rows[0]) {
    const e = new Error("Já existe passeio confirmado neste dia para este barco.");
    e.code = "DATE_OCCUPIED";
    throw e;
  }
}

/**
 * @param {unknown} input
 * @returns {string | null} HH:MM or null
 */
function normalizeEmbarkTimeHHMM(input) {
  const s = String(input ?? "").trim();
  const m = s.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  if (!Number.isFinite(h) || !Number.isFinite(min) || h < 0 || h > 23 || min < 0 || min > 59) return null;
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

/**
 * @param {unknown} raw
 * @returns {string[]}
 */
function parseLocaisEmbarqueBody(raw) {
  if (!Array.isArray(raw)) return [];
  const out = [];
  const seen = new Set();
  for (const x of raw) {
    const t = String(x ?? "").trim();
    if (t.length === 0 || t.length > 200) continue;
    const key = t.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t);
    if (out.length >= 50) break;
  }
  return out;
}

/**
 * @param {unknown} raw
 * @returns {string[]}
 */
function parseHorariosEmbarqueBody(raw) {
  if (!Array.isArray(raw)) return [];
  const out = [];
  const seen = new Set();
  for (const x of raw) {
    const n = normalizeEmbarkTimeHHMM(x);
    if (!n || seen.has(n)) continue;
    seen.add(n);
    out.push(n);
    if (out.length >= 50) break;
  }
  out.sort((a, b) => a.localeCompare(b));
  return out;
}

/**
 * @param {string} boatId
 * @param {string[]} names
 */
async function replaceBoatEmbarkLocations(boatId, names) {
  await query(`delete from embark_locations where boat_id = $1::uuid`, [boatId]);
  for (let i = 0; i < names.length; i++) {
    await query(`insert into embark_locations (boat_id, name) values ($1::uuid, $2) on conflict (boat_id, name) do nothing`, [
      boatId,
      names[i],
    ]);
  }
}

/**
 * @param {string} boatId
 * @param {string[]} timesHHMM
 */
async function replaceBoatEmbarkSlots(boatId, timesHHMM) {
  await query(`delete from boat_embark_slots where boat_id = $1::uuid`, [boatId]);
  for (let i = 0; i < timesHHMM.length; i++) {
    await query(
      `insert into boat_embark_slots (boat_id, slot_time, sort_order) values ($1::uuid, $2::time, $3)`,
      [boatId, timesHHMM[i], i]
    );
  }
}

/**
 * @param {string} boatId
 */
async function loadBoatEmbarkConfig(boatId) {
  const [locs, slots] = await Promise.all([
    query(`select name from embark_locations where boat_id = $1::uuid order by name asc`, [boatId]),
    query(
      `select to_char(slot_time, 'HH24:MI') as t from boat_embark_slots where boat_id = $1::uuid order by sort_order asc, slot_time asc`,
      [boatId]
    ),
  ]);
  return {
    locationNames: locs.rows.map((r) => r.name),
    timeSlots: slots.rows.map((r) => r.t),
  };
}

/**
 * @param {string} boatId
 * @param {string | null} embarkLocation
 * @param {string | null} embarkTimeHHMM
 */
async function assertBookingEmbarkChoices(boatId, embarkLocation, embarkTimeHHMM) {
  const { locationNames, timeSlots } = await loadBoatEmbarkConfig(boatId);
  let loc = embarkLocation != null ? String(embarkLocation).trim() : "";
  loc = loc === "" ? null : loc;
  let time =
    embarkTimeHHMM != null && String(embarkTimeHHMM).trim() !== ""
      ? normalizeEmbarkTimeHHMM(embarkTimeHHMM)
      : null;
  if (embarkTimeHHMM != null && String(embarkTimeHHMM).trim() !== "" && !time) {
    const err = new Error("Horário de embarque inválido.");
    err.code = "EMBARK_TIME_FORMAT";
    throw err;
  }

  if (locationNames.length > 0) {
    if (!loc || !locationNames.includes(loc)) {
      const err = new Error("Escolha um local de embarque entre os oferecidos pelo locador.");
      err.code = "EMBARK_LOCATION_INVALID";
      throw err;
    }
  } else if (loc != null) {
    const err = new Error("Este barco não define locais de embarque; o local fica a combinar.");
    err.code = "EMBARK_LOCATION_UNEXPECTED";
    throw err;
  } else {
    loc = null;
  }

  if (timeSlots.length > 0) {
    if (!time || !timeSlots.includes(time)) {
      const err = new Error("Escolha um horário de embarque entre os oferecidos pelo locador.");
      err.code = "EMBARK_TIME_INVALID";
      throw err;
    }
  } else if (time != null) {
    const err = new Error("Este barco não define horários de embarque; o horário fica a combinar.");
    err.code = "EMBARK_TIME_UNEXPECTED";
    throw err;
  } else {
    time = null;
  }

  return { embarkLocation: loc, embarkTimeHHMM: time };
}

const app = express();
/** Base64 de várias fotos no registo/edição de barco ultrapassa o default (~100kb). */
const JSON_BODY_LIMIT =
  process.env.JSON_BODY_LIMIT && String(process.env.JSON_BODY_LIMIT).trim()
    ? String(process.env.JSON_BODY_LIMIT).trim()
    : "32mb";
app.use(express.json({ limit: JSON_BODY_LIMIT }));
const extraCors = (process.env.EXTRA_CORS_ORIGINS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const allowedOrigins = [
  FRONTEND_URL,
  "http://localhost:8080",
  "http://localhost:8081",
  "http://127.0.0.1:8080",
  "http://127.0.0.1:8081",
  ...extraCors,
].filter(Boolean);

function corsAllowed(origin) {
  if (!origin) return true;
  if (allowedOrigins.includes(origin)) return true;
  try {
    const host = new URL(origin).hostname;
    if (host.endsWith(".vercel.app")) return true;
  } catch {
    /* ignore */
  }
  return false;
}

const corsStrict = process.env.CORS_STRICT === "1" || process.env.CORS_STRICT === "true";

app.use(
  cors(
    corsStrict
      ? {
          origin: (origin, cb) => (corsAllowed(origin) ? cb(null, true) : cb(null, false)),
          credentials: true,
        }
      : {
          origin: true,
          credentials: true,
        }
  )
);

app.get("/", (_req, res) => {
  res.type("text/plain").status(200).send("API Alto Mar. Use o app em http://localhost:8080");
});

app.get("/api/health", async (_req, res) => {
  try {
    await query("select 1 as ok");
    return res.json({ ok: true, db: "connected" });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "db error";
    const code =
      e && typeof e === "object" && "code" in e && e.code != null
        ? String(e.code)
        : undefined;
    return res.status(500).json({
      ok: false,
      db: "disconnected",
      error: msg,
      ...(code ? { pgCode: code } : {}),
    });
  }
});

// --- Amenities catalog ---
app.get("/api/amenities", async (_req, res) => {
  try {
    const rows = await query(`select id, name from amenities order by name asc`);
    return res.json({ amenities: rows.rows });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro ao listar itens.";
    return res.status(503).send(msg);
  }
});

// --- Auth ---
const signupSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email().max(200),
  password: z.string().min(6).max(200),
  role: z.enum(["banhista", "locatario"]),
});

app.post("/api/auth/signup", async (req, res) => {
  try {
    const body = signupSchema.parse(req.body);
    const hash = await bcrypt.hash(body.password, 10);

    const created = await query(
      `insert into users (name, email, password_hash, role)
       values ($1, $2, $3, $4)
       returning id, name, email, role, created_at`,
      [body.name, body.email, hash, body.role]
    );

    const user = created.rows[0];
    const token = signToken(user);
    return res.json({ token, user });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro ao criar conta.";
    // Unique violation (email)
    if (msg.includes("duplicate key value")) {
      return res.status(409).send("Email já cadastrado.");
    }
    return res.status(400).send(msg);
  }
});

const loginSchema = z.object({
  email: z.string().email().max(200),
  password: z.string().min(1).max(200),
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const body = loginSchema.parse(req.body);
    const result = await query(
      `select id, name, email, role, password_hash from users where email = $1 limit 1`,
      [body.email]
    );
    const row = result.rows[0];
    if (!row) return res.status(401).send("Email ou senha inválidos.");
    const ok = await bcrypt.compare(body.password, row.password_hash);
    if (!ok) return res.status(401).send("Email ou senha inválidos.");
    const user = { id: row.id, name: row.name, email: row.email, role: row.role };
    const token = signToken(user);
    return res.json({ token, user });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro no login.";
    return res.status(400).send(msg);
  }
});

function sha256Hex(value) {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

const forgotPasswordSchema = z.object({
  email: z.string().email().max(200),
});

const resetPasswordSchema = z.object({
  token: z.string().min(32).max(200),
  password: z.string().min(6).max(200),
});

/** Sempre responde igual (não revela se o email existe). */
app.post("/api/auth/forgot-password", async (req, res) => {
  try {
    const body = forgotPasswordSchema.parse(req.body);
    const result = await query(`select id from users where email = $1 limit 1`, [body.email]);
    const row = result.rows[0];
    if (row) {
      const rawToken = crypto.randomBytes(32).toString("hex");
      const tokenHash = sha256Hex(rawToken);
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
      await query(`delete from password_reset_tokens where user_id = $1`, [row.id]);
      await query(
        `insert into password_reset_tokens (token_hash, user_id, expires_at) values ($1, $2, $3)`,
        [tokenHash, row.id, expiresAt.toISOString()]
      );
      const base = FRONTEND_URL.replace(/\/$/, "");
      const link = `${base}/redefinir-senha?token=${encodeURIComponent(rawToken)}`;
      // eslint-disable-next-line no-console
      console.log("\n[Alto Mar] Recuperação de senha — copie o link (válido 1h):\n", link, "\n");
    }
    return res.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro.";
    if (msg.includes("password_reset_tokens")) {
      return res.status(500).send(
        "Tabela password_reset_tokens ausente. Execute db/password_reset_tokens.sql no PostgreSQL."
      );
    }
    return res.status(400).send(msg);
  }
});

app.get("/api/auth/reset-token-check", async (req, res) => {
  const token = typeof req.query.token === "string" ? req.query.token : "";
  if (token.length < 32) return res.status(400).json({ valid: false });
  const tokenHash = sha256Hex(token);
  const result = await query(
    `select 1 from password_reset_tokens where token_hash = $1 and expires_at > now() limit 1`,
    [tokenHash]
  );
  return res.json({ valid: Boolean(result.rows[0]) });
});

app.post("/api/auth/reset-password", async (req, res) => {
  try {
    const body = resetPasswordSchema.parse(req.body);
    const tokenHash = sha256Hex(body.token);
    const found = await query(
      `select user_id from password_reset_tokens where token_hash = $1 and expires_at > now() limit 1`,
      [tokenHash]
    );
    const row = found.rows[0];
    if (!row) return res.status(400).send("Link inválido ou expirado. Solicite outro em Esqueci minha senha.");

    const newHash = await bcrypt.hash(body.password, 10);
    await query(`update users set password_hash = $1 where id = $2`, [newHash, row.user_id]);
    await query(`delete from password_reset_tokens where user_id = $1`, [row.user_id]);

    return res.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro ao redefinir senha.";
    return res.status(400).send(msg);
  }
});

app.get("/api/me", requireAuth, async (req, res) => {
  const userId = req.user.sub;
  const result = await query(
    `select id, name, email, role, rg_url, nautical_license_url, created_at, guest_rating from users where id = $1`,
    [userId]
  );
  const row = result.rows[0];
  if (!row) return res.status(404).send("Usuário não encontrado.");
  return res.json({ user: row });
});

const ownerProfileDocsSchema = z.object({
  rgUrl: z.string().url().or(z.string().startsWith("data:")).optional().nullable(),
  nauticalLicenseUrl: z.string().url().or(z.string().startsWith("data:")).optional().nullable(),
});

app.patch("/api/owner/profile-docs", requireAuth, requireRole("locatario"), async (req, res) => {
  try {
    const body = ownerProfileDocsSchema.parse(req.body || {});
    const updated = await query(
      `update users
       set rg_url = $2,
           nautical_license_url = $3
       where id = $1
       returning id, name, email, role, rg_url, nautical_license_url, created_at`,
      [req.user.sub, body.rgUrl ?? null, body.nauticalLicenseUrl ?? null]
    );
    return res.json({ user: updated.rows[0] });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro ao atualizar documentos.";
    return res.status(400).send(msg);
  }
});

app.delete("/api/me", requireAuth, async (req, res) => {
  const userId = req.user.sub;
  try {
    await query("begin");
    // Remove vínculos que referenciam usuário diretamente
    await query(`delete from user_boat_favorites where user_id = $1`, [userId]);
    await query(`delete from password_reset_tokens where user_id = $1`, [userId]);
    // Remove reservas onde o usuário participa (renter/owner)
    await query(`delete from bookings where renter_user_id = $1 or owner_user_id = $1`, [userId]);
    // Remove usuário (boats do owner caem por cascade)
    const deleted = await query(`delete from users where id = $1 returning id`, [userId]);
    await query("commit");
    if (!deleted.rows[0]) return res.status(404).send("Usuário não encontrado.");
    return res.json({ ok: true });
  } catch (e) {
    await query("rollback").catch(() => {});
    const msg = e instanceof Error ? e.message : "Erro ao excluir conta.";
    return res.status(400).send(msg);
  }
});

// --- Boats (public) ---
function formatBoatPreco(priceCents) {
  const n = Number(priceCents);
  const reais = Number.isFinite(n) ? n / 100 : 0;
  return `R$ ${reais.toLocaleString("pt-BR")}`;
}

function formatBoatNota(rating) {
  const n = Number(rating);
  const v = Number.isFinite(n) ? n : 0;
  return v.toFixed(1).replace(".", ",");
}

function normalizeRouteIslands(v) {
  return Array.isArray(v) ? v : [];
}

/**
 * Aceita:
 * - URL absoluta (http/https)
 * - data URL (uploads em base64)
 * - caminho relativo da app (ex.: /assets/boat-exterior.jpg)
 */
const assetOrUrlSchema = z.string().refine((value) => {
  if (typeof value !== "string") return false;
  const v = value.trim();
  if (!v) return false;
  if (v.startsWith("data:")) return true;
  if (v.startsWith("/")) return true;
  try {
    const u = new URL(v);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}, "Invalid url");

/** Vários `amenities=` na query ou `amenity=` único (retrocompatível). */
function parseAmenitiesQuery(req) {
  const out = [];
  const raw = req.query.amenities;
  if (Array.isArray(raw)) {
    for (const x of raw) {
      const s = String(x).trim();
      if (s) out.push(s);
    }
  } else if (typeof raw === "string" && raw.trim()) {
    for (const part of raw.split(",")) {
      const s = part.trim();
      if (s) out.push(s);
    }
  }
  const single = typeof req.query.amenity === "string" ? req.query.amenity.trim() : "";
  if (out.length === 0 && single) out.push(single);
  return out;
}

app.get("/api/boats", async (req, res) => {
  try {
    const amenityNames = parseAmenitiesQuery(req);
    const params = [];
    let whereSql = "";
    if (amenityNames.length > 0) {
      const parts = [];
      for (const name of amenityNames) {
        params.push(name);
        parts.push(`exists (
        select 1 from boat_amenities ba
        join amenities a on a.id = ba.amenity_id
        where ba.boat_id = b.id and ba.included = true and a.name = $${params.length}
      )`);
      }
      whereSql = `where ${parts.join(" and ")}`;
    }

    const boats = await query(
      `select
         b.id,
         b.name,
         b.location_text,
         b.price_cents,
         b.rating,
         b.size_feet,
         b.capacity,
         b.type,
         b.description,
         b.verified,
         coalesce(b.route_islands, '{}'::text[]) as route_islands,
         coalesce(b.route_island_images, '{}'::jsonb) as route_island_images,
         coalesce(b.jet_ski_offered, false) as jet_ski_offered,
         coalesce(b.jet_ski_price_cents, 0) as jet_ski_price_cents,
         coalesce(b.jet_ski_image_urls, '{}'::text[]) as jet_ski_image_urls,
         b.jet_ski_document_url
       from boats b
       ${whereSql}
       order by b.created_at desc`,
      params
    );

    const boatIds = boats.rows.map((b) => b.id);
    const images =
      boatIds.length === 0
        ? { rows: [] }
        : await query(
            `select boat_id, url, sort
             from boat_images
             where boat_id = any($1::uuid[])
             order by boat_id, sort asc`,
            [boatIds]
          );

    const locations =
      boatIds.length === 0
        ? { rows: [] }
        : await query(
            `select boat_id, name
             from embark_locations
             where boat_id = any($1::uuid[])
             order by boat_id, name asc`,
            [boatIds]
          );

    const embarkSlots =
      boatIds.length === 0
        ? { rows: [] }
        : await query(
            `select boat_id, to_char(slot_time, 'HH24:MI') as t, sort_order
             from boat_embark_slots
             where boat_id = any($1::uuid[])
             order by boat_id, sort_order asc, slot_time asc`,
            [boatIds]
          );

    const amenityRows =
      boatIds.length === 0
        ? { rows: [] }
        : await query(
            `select ba.boat_id, a.name, ba.included
             from boat_amenities ba
             join amenities a on a.id = ba.amenity_id
             where ba.boat_id = any($1::uuid[])
             order by ba.boat_id, a.name asc`,
            [boatIds]
          );

    const byBoat = (rows, key) =>
      rows.reduce((acc, r) => {
        (acc[r.boat_id] ||= []).push(r[key]);
        return acc;
      }, {});
    const imagesByBoat = images.rows.reduce((acc, r) => {
      (acc[r.boat_id] ||= []).push(r.url);
      return acc;
    }, {});
    const locationsByBoat = byBoat(locations.rows, "name");
    const slotsByBoat = embarkSlots.rows.reduce((acc, r) => {
      (acc[r.boat_id] ||= []).push(r.t);
      return acc;
    }, {});
    const amenitiesByBoat = amenityRows.rows.reduce((acc, r) => {
      (acc[r.boat_id] ||= []).push({ nome: r.name, incluido: r.included });
      return acc;
    }, {});

    const payload = boats.rows.map((b) => ({
      id: b.id,
      nome: b.name,
      distancia: b.location_text,
      preco: formatBoatPreco(b.price_cents),
      nota: formatBoatNota(b.rating),
      imagens: imagesByBoat[b.id] || [],
      descricao: b.description ?? "",
      verificado: Boolean(b.verified),
      tamanho: `${b.size_feet ?? 0} pés`,
      capacidade: b.capacity ?? 0,
      tipo: b.type,
      amenidades: amenitiesByBoat[b.id] || [],
      locaisEmbarque: locationsByBoat[b.id] || [],
      horariosEmbarque: slotsByBoat[b.id] || [],
      routeIslands: normalizeRouteIslands(b.route_islands),
      routeIslandImages:
        b.route_island_images && typeof b.route_island_images === "object"
          ? b.route_island_images
          : {},
      jetSkiOffered: Boolean(b.jet_ski_offered),
      jetSkiPriceCents: Number(b.jet_ski_price_cents ?? 0),
      jetSkiImageUrls: Array.isArray(b.jet_ski_image_urls) ? b.jet_ski_image_urls : [],
      jetSkiDocumentUrl: b.jet_ski_document_url ?? null,
    }));

    return res.json({ boats: payload });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    // eslint-disable-next-line no-console
    console.error("[GET /api/boats]", msg);
    return res.status(503).json({ ok: false });
  }
});

app.get("/api/boats/:id", async (req, res) => {
  const boatId = req.params.id;
  try {
    const boat = await query(
      `select
         b.id,
         b.owner_user_id,
         b.name,
         b.location_text,
         b.price_cents,
         b.rating,
         b.size_feet,
         b.capacity,
         b.type,
         b.description,
         b.verified,
         coalesce(b.route_islands, '{}'::text[]) as route_islands,
         coalesce(b.route_island_images, '{}'::jsonb) as route_island_images,
         coalesce(b.jet_ski_offered, false) as jet_ski_offered,
         coalesce(b.jet_ski_price_cents, 0) as jet_ski_price_cents,
         coalesce(b.jet_ski_image_urls, '{}'::text[]) as jet_ski_image_urls,
         b.jet_ski_document_url
       from boats b
       where b.id = $1
       limit 1`,
      [boatId]
    );
    const b = boat.rows[0];
    if (!b) return res.status(404).send("Barco não encontrado.");

    const [images, locations, slots, amenities] = await Promise.all([
      query(`select url, sort from boat_images where boat_id = $1 order by sort asc`, [boatId]),
      query(`select name from embark_locations where boat_id = $1 order by name asc`, [boatId]),
      query(
        `select to_char(slot_time, 'HH24:MI') as t from boat_embark_slots where boat_id = $1 order by sort_order asc, slot_time asc`,
        [boatId]
      ),
      query(
        `select a.name, ba.included
         from boat_amenities ba
         join amenities a on a.id = ba.amenity_id
         where ba.boat_id = $1
         order by a.name asc`,
        [boatId]
      ),
    ]);

    return res.json({
      boat: {
        id: b.id,
        ownerUserId: b.owner_user_id,
        nome: b.name,
        distancia: b.location_text,
        preco: formatBoatPreco(b.price_cents),
        nota: formatBoatNota(b.rating),
        imagens: images.rows.map((r) => r.url),
        descricao: b.description ?? "",
        verificado: Boolean(b.verified),
        tamanho: `${b.size_feet ?? 0} pés`,
        capacidade: b.capacity ?? 0,
        tipo: b.type,
        amenidades: amenities.rows.map((r) => ({ nome: r.name, incluido: r.included })),
        locaisEmbarque: locations.rows.map((r) => r.name),
        horariosEmbarque: slots.rows.map((r) => r.t),
        routeIslands: normalizeRouteIslands(b.route_islands),
        routeIslandImages:
          b.route_island_images && typeof b.route_island_images === "object" ? b.route_island_images : {},
        jetSkiOffered: Boolean(b.jet_ski_offered),
        jetSkiPriceCents: Number(b.jet_ski_price_cents ?? 0),
        jetSkiImageUrls: Array.isArray(b.jet_ski_image_urls) ? b.jet_ski_image_urls : [],
        jetSkiDocumentUrl: b.jet_ski_document_url ?? null,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    // eslint-disable-next-line no-console
    console.error("[GET /api/boats/:id]", boatId, msg);
    return res.status(503).json({ ok: false });
  }
});

app.get("/api/boats/:id/calendar", async (req, res) => {
  const boatId = req.params.id;
  const from = req.query.from;
  const to = req.query.to;
  if (!from || !to || typeof from !== "string" || typeof to !== "string") {
    return res.status(400).send("Informe from e to (YYYY-MM-DD).");
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
    return res.status(400).send("Datas inválidas.");
  }
  try {
    const ex = await query(`select id from boats where id = $1 limit 1`, [boatId]);
    if (!ex.rows[0]) return res.status(404).send("Barco não encontrado.");

    const [dateLocks, weekdayLocks, bookingRows] = await Promise.all([
      query(
        `select locked_date::text as d from boat_date_locks where boat_id = $1 order by locked_date`,
        [boatId]
      ),
      query(`select weekday from boat_weekday_locks where boat_id = $1 order by weekday`, [boatId]),
      query(
        `select bk.id, bk.booking_date::text as d, bk.status
         from bookings bk
         where bk.boat_id = $1
           and bk.booking_date >= $2::date
           and bk.booking_date <= $3::date
           and bk.status not in ('DECLINED','CANCELLED')`,
        [boatId, from, to]
      ),
    ]);

    return res.json({
      dateLocks: dateLocks.rows.map((r) => r.d),
      weekdayLocks: weekdayLocks.rows.map((r) => Number(r.weekday)),
      bookings: bookingRows.rows.map((r) => ({ id: r.id, date: r.d, status: r.status })),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    // eslint-disable-next-line no-console
    console.error("[GET /api/boats/:id/calendar]", boatId, msg);
    return res.status(503).send(msg);
  }
});

// --- Favorites (por usuário logado) ---
app.get("/api/favorites", requireAuth, async (req, res) => {
  try {
    const rows = await query(
      `select
         f.boat_id,
         b.name,
         b.location_text,
         b.price_cents
       from user_boat_favorites f
       join boats b on b.id = f.boat_id
       where f.user_id = $1
       order by f.created_at desc`,
      [req.user.sub]
    );
    return res.json({
      boatIds: rows.rows.map((r) => r.boat_id),
      boats: rows.rows.map((r) => ({
        id: r.boat_id,
        nome: r.name,
        distancia: r.location_text,
        preco: formatBoatPreco(r.price_cents),
      })),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro ao carregar favoritos.";
    if (msg.includes("user_boat_favorites")) {
      return res
        .status(500)
        .send("Tabela user_boat_favorites ausente. Rode o schema atualizado no PostgreSQL.");
    }
    return res.status(400).send(msg);
  }
});

app.post("/api/favorites/:boatId", requireAuth, async (req, res) => {
  try {
    const boatId = req.params.boatId;
    const exists = await query(`select id from boats where id = $1 limit 1`, [boatId]);
    if (!exists.rows[0]) return res.status(404).send("Barco não encontrado.");

    await query(
      `insert into user_boat_favorites (user_id, boat_id)
       values ($1, $2)
       on conflict (user_id, boat_id) do nothing`,
      [req.user.sub, boatId]
    );
    return res.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro ao favoritar barco.";
    return res.status(400).send(msg);
  }
});

app.delete("/api/favorites/:boatId", requireAuth, async (req, res) => {
  try {
    const boatId = req.params.boatId;
    await query(`delete from user_boat_favorites where user_id = $1 and boat_id = $2`, [
      req.user.sub,
      boatId,
    ]);
    return res.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro ao remover favorito.";
    return res.status(400).send(msg);
  }
});

// --- Owner boats (perfil locador; role API: locatario) ---
app.get("/api/owner/boats", requireAuth, requireRole("locatario"), async (req, res) => {
  try {
    const boats = await query(
      `select
         b.id,
         b.name,
         b.location_text,
         b.price_cents,
         b.rating,
         b.size_feet,
         b.capacity,
         b.type,
         b.description,
         b.verified,
         b.tie_document_url,
         b.tiem_document_url,
         b.video_url,
         b.route_islands,
         coalesce(b.route_island_images, '{}'::jsonb) as route_island_images,
         coalesce(b.jet_ski_offered, false) as jet_ski_offered,
         coalesce(b.jet_ski_price_cents, 0) as jet_ski_price_cents,
         coalesce(b.jet_ski_image_urls, '{}'::text[]) as jet_ski_image_urls,
         b.jet_ski_document_url
       from boats b
       where b.owner_user_id = $1
       order by b.created_at desc`,
      [req.user.sub]
    );

    const boatIds = boats.rows.map((b) => b.id);
    const images =
      boatIds.length === 0
        ? { rows: [] }
        : await query(
            `select boat_id, url, sort
             from boat_images
             where boat_id = any($1::uuid[])
             order by boat_id, sort asc`,
            [boatIds]
          );

    const amenityRows =
      boatIds.length === 0
        ? { rows: [] }
        : await query(
            `select ba.boat_id, a.id as amenity_id, a.name, ba.included
             from boat_amenities ba
             join amenities a on a.id = ba.amenity_id
             where ba.boat_id = any($1::uuid[])
             order by ba.boat_id, a.name asc`,
            [boatIds]
          );
    const amenitiesByBoat = amenityRows.rows.reduce((acc, r) => {
      (acc[r.boat_id] ||= []).push({
        id: r.amenity_id,
        nome: r.name,
        incluido: r.included,
      });
      return acc;
    }, {});

    const ownerEmbarkLocs =
      boatIds.length === 0
        ? { rows: [] }
        : await query(
            `select boat_id, name from embark_locations where boat_id = any($1::uuid[]) order by boat_id, name asc`,
            [boatIds]
          );
    const ownerEmbarkSlots =
      boatIds.length === 0
        ? { rows: [] }
        : await query(
            `select boat_id, to_char(slot_time, 'HH24:MI') as t, sort_order
             from boat_embark_slots where boat_id = any($1::uuid[])
             order by boat_id, sort_order asc, slot_time asc`,
            [boatIds]
          );
    const locsByOwnerBoat = ownerEmbarkLocs.rows.reduce((acc, r) => {
      (acc[r.boat_id] ||= []).push(r.name);
      return acc;
    }, {});
    const slotsByOwnerBoat = ownerEmbarkSlots.rows.reduce((acc, r) => {
      (acc[r.boat_id] ||= []).push(r.t);
      return acc;
    }, {});

    return res.json({
      boats: boats.rows.map((b) => ({
        id: b.id,
        nome: b.name,
        distancia: b.location_text,
        precoCents: b.price_cents,
        preco: `R$ ${(b.price_cents / 100).toLocaleString("pt-BR")}`,
        nota: Number(b.rating).toFixed(1).replace(".", ","),
        rating: Number(b.rating),
        tamanhoPes: b.size_feet,
        tamanho: `${b.size_feet} pés`,
        capacidade: b.capacity,
        tipo: b.type,
        descricao: b.description,
        verificado: b.verified,
        tieDocumentUrl: b.tie_document_url,
        tiemDocumentUrl: b.tiem_document_url,
        videoUrl: b.video_url,
        routeIslands: Array.isArray(b.route_islands) ? b.route_islands : [],
        routeIslandImages:
          b.route_island_images && typeof b.route_island_images === "object" ? b.route_island_images : {},
        imagens: images.rows.filter((i) => i.boat_id === b.id).map((i) => i.url),
        amenidades: amenitiesByBoat[b.id] || [],
        locaisEmbarque: locsByOwnerBoat[b.id] || [],
        horariosEmbarque: slotsByOwnerBoat[b.id] || [],
        jetSkiOffered: Boolean(b.jet_ski_offered),
        jetSkiPriceCents: Number(b.jet_ski_price_cents ?? 0),
        jetSkiImageUrls: Array.isArray(b.jet_ski_image_urls) ? b.jet_ski_image_urls : [],
        jetSkiDocumentUrl: b.jet_ski_document_url ?? null,
      })),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro ao carregar suas embarcações.";
    // eslint-disable-next-line no-console
    console.error("[GET /api/owner/boats]", msg);
    return res.status(503).send(msg);
  }
});

const ownerUpdateBoatSchema = z.object({
  nome: z.string().min(2).max(120),
  distancia: z.string().min(2).max(200),
  precoCents: z.number().int().min(0).max(500000000),
  tamanhoPes: z.number().int().min(1).max(300),
  capacidade: z.number().int().min(1).max(500),
  tipo: z.string().min(2).max(80),
  descricao: z.string().min(5).max(4000),
  routeIslands: z.array(z.string().min(2).max(120)).max(20).optional(),
  routeIslandImages: z.record(z.string(), z.array(z.string())).optional(),
  verificado: z.boolean(),
  tieDocumentUrl: assetOrUrlSchema.optional().nullable(),
  tiemDocumentUrl: assetOrUrlSchema.optional().nullable(),
  videoUrl: z.string().url().optional().nullable(),
  imagens: z.array(assetOrUrlSchema).max(20).optional(),
  locaisEmbarque: z.array(z.string().min(1).max(200)).max(50).optional(),
  horariosEmbarque: z.array(z.string().min(1).max(5)).max(50).optional(),
  jetSkiOffered: z.boolean(),
  jetSkiPriceCents: z.number().int().min(0).max(500000000).optional(),
  jetSkiImageUrls: z.array(assetOrUrlSchema).max(12).optional(),
  jetSkiDocumentUrl: z.union([assetOrUrlSchema, z.null()]).optional(),
});

app.patch("/api/owner/boats/:id", requireAuth, requireRole("locatario"), async (req, res) => {
  try {
    const boatId = req.params.id;
    const body = ownerUpdateBoatSchema.parse(req.body || {});

    const jetOffered = body.jetSkiOffered === true;
    const jetImgs = Array.isArray(body.jetSkiImageUrls) ? body.jetSkiImageUrls : [];
    const jetDoc = body.jetSkiDocumentUrl != null ? String(body.jetSkiDocumentUrl).trim() : "";
    if (jetOffered) {
      const pc = Number(body.jetSkiPriceCents ?? 0);
      if (!Number.isFinite(pc) || pc < 100) {
        return res.status(400).send("Defina o preço da moto aquática (mínimo R$ 1,00).");
      }
      if (jetImgs.length < 1) {
        return res.status(400).send("Envie pelo menos uma foto da moto aquática.");
      }
      if (!jetDoc) {
        return res.status(400).send("Envie a documentação da moto aquática (ficheiro ou URL).");
      }
    }

    const riJson = body.routeIslandImages != null ? JSON.stringify(body.routeIslandImages) : "{}";

    const jetSkiPriceFinal = jetOffered ? Number(body.jetSkiPriceCents ?? 0) : 0;
    const jetSkiImagesFinal = jetOffered ? jetImgs : [];
    const jetSkiDocFinal = jetOffered ? jetDoc : null;

    const updated = await query(
      `update boats
       set name = $3,
           location_text = $4,
           price_cents = $5,
           size_feet = $6,
           capacity = $7,
           type = $8,
           description = $9,
           verified = $10,
           tie_document_url = $11,
           tiem_document_url = $12,
           video_url = $13,
           route_islands = $14,
           route_island_images = $15::jsonb,
           jet_ski_offered = $16,
           jet_ski_price_cents = $17,
           jet_ski_image_urls = $18,
           jet_ski_document_url = $19
       where id = $1 and owner_user_id = $2
       returning id, name, location_text, price_cents, rating, size_feet, capacity, type, description, verified, tie_document_url, tiem_document_url, video_url, route_islands, route_island_images, jet_ski_offered, jet_ski_price_cents, jet_ski_image_urls, jet_ski_document_url`,
      [
        boatId,
        req.user.sub,
        body.nome,
        body.distancia,
        body.precoCents,
        body.tamanhoPes,
        body.capacidade,
        body.tipo,
        body.descricao,
        body.verificado,
        body.tieDocumentUrl ?? null,
        body.tiemDocumentUrl ?? null,
        body.videoUrl ?? null,
        body.routeIslands ?? [],
        riJson,
        jetOffered,
        jetSkiPriceFinal,
        jetSkiImagesFinal,
        jetSkiDocFinal,
      ]
    );

    const b = updated.rows[0];
    if (!b) return res.status(404).send("Barco não encontrado para este locador.");

    if (body.imagens) {
      await query(`delete from boat_images where boat_id = $1`, [boatId]);
      for (let i = 0; i < body.imagens.length; i++) {
        await query(`insert into boat_images (boat_id, url, sort) values ($1, $2, $3)`, [
          boatId,
          body.imagens[i],
          i,
        ]);
      }
    }

    if (body.locaisEmbarque !== undefined) {
      await replaceBoatEmbarkLocations(boatId, parseLocaisEmbarqueBody(body.locaisEmbarque));
    }
    if (body.horariosEmbarque !== undefined) {
      await replaceBoatEmbarkSlots(boatId, parseHorariosEmbarqueBody(body.horariosEmbarque));
    }

    const imgs = await query(`select url from boat_images where boat_id = $1 order by sort asc`, [boatId]);
    const [embLocRows, embSlotRows] = await Promise.all([
      query(`select name from embark_locations where boat_id = $1 order by name asc`, [boatId]),
      query(
        `select to_char(slot_time, 'HH24:MI') as t from boat_embark_slots where boat_id = $1 order by sort_order asc, slot_time asc`,
        [boatId]
      ),
    ]);

    return res.json({
      boat: {
        id: b.id,
        nome: b.name,
        distancia: b.location_text,
        precoCents: b.price_cents,
        preco: `R$ ${(b.price_cents / 100).toLocaleString("pt-BR")}`,
        nota: Number(b.rating).toFixed(1).replace(".", ","),
        rating: Number(b.rating),
        tamanhoPes: b.size_feet,
        tamanho: `${b.size_feet} pés`,
        capacidade: b.capacity,
        tipo: b.type,
        descricao: b.description,
        verificado: b.verified,
        tieDocumentUrl: b.tie_document_url,
        tiemDocumentUrl: b.tiem_document_url,
        videoUrl: b.video_url,
        routeIslands: Array.isArray(b.route_islands) ? b.route_islands : [],
        routeIslandImages:
          b.route_island_images && typeof b.route_island_images === "object" ? b.route_island_images : {},
        imagens: imgs.rows.map((r) => r.url),
        locaisEmbarque: embLocRows.rows.map((r) => r.name),
        horariosEmbarque: embSlotRows.rows.map((r) => r.t),
        jetSkiOffered: Boolean(b.jet_ski_offered),
        jetSkiPriceCents: Number(b.jet_ski_price_cents ?? 0),
        jetSkiImageUrls: Array.isArray(b.jet_ski_image_urls) ? b.jet_ski_image_urls : [],
        jetSkiDocumentUrl: b.jet_ski_document_url ?? null,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro ao atualizar barco.";
    return res.status(400).send(msg);
  }
});

const ownerCreateBoatSchema = z.object({
  nome: z.string().min(2).max(120),
  distancia: z.string().min(2).max(200),
  precoCents: z.number().int().min(0).max(500000000),
  tamanhoPes: z.number().int().min(1).max(300),
  capacidade: z.number().int().min(1).max(500),
  tipo: z.string().min(2).max(80),
  descricao: z.string().min(5).max(4000),
  routeIslands: z.array(z.string().min(2).max(120)).max(20).optional(),
  routeIslandImages: z.record(z.string(), z.array(z.string())).optional(),
  tieDocumentUrl: assetOrUrlSchema.optional().nullable(),
  tiemDocumentUrl: assetOrUrlSchema.optional().nullable(),
  videoUrl: z.string().url().optional().nullable(),
  imagens: z.array(assetOrUrlSchema).max(20).default([]),
  locaisEmbarque: z.array(z.string().min(1).max(200)).max(50).optional(),
  horariosEmbarque: z.array(z.string().min(1).max(5)).max(50).optional(),
  jetSkiOffered: z.boolean().default(false),
  jetSkiPriceCents: z.number().int().min(0).max(500000000).optional(),
  jetSkiImageUrls: z.array(assetOrUrlSchema).max(12).optional(),
  jetSkiDocumentUrl: z.union([assetOrUrlSchema, z.null()]).optional(),
});

app.post("/api/owner/boats", requireAuth, requireRole("locatario"), async (req, res) => {
  try {
    const body = ownerCreateBoatSchema.parse(req.body || {});
    const jetOffered = body.jetSkiOffered === true;
    const jetImgs = Array.isArray(body.jetSkiImageUrls) ? body.jetSkiImageUrls : [];
    const jetDoc = body.jetSkiDocumentUrl != null ? String(body.jetSkiDocumentUrl).trim() : "";
    if (jetOffered) {
      const pc = Number(body.jetSkiPriceCents ?? 0);
      if (!Number.isFinite(pc) || pc < 100) {
        return res.status(400).send("Defina o preço da moto aquática (mínimo R$ 1,00).");
      }
      if (jetImgs.length < 1) {
        return res.status(400).send("Envie pelo menos uma foto da moto aquática.");
      }
      if (!jetDoc) {
        return res.status(400).send("Envie a documentação da moto aquática (ficheiro ou URL).");
      }
    }
    const jetSkiPriceFinal = jetOffered ? Number(body.jetSkiPriceCents ?? 0) : 0;
    const jetSkiImagesFinal = jetOffered ? jetImgs : [];
    const jetSkiDocFinal = jetOffered ? jetDoc : null;

    const riJson = body.routeIslandImages != null ? JSON.stringify(body.routeIslandImages) : "{}";
    const created = await query(
      `insert into boats
        (owner_user_id, name, location_text, price_cents, rating, size_feet, capacity, type, description, verified, tie_document_url, tiem_document_url, video_url, route_islands, route_island_images,
         jet_ski_offered, jet_ski_price_cents, jet_ski_image_urls, jet_ski_document_url)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15::jsonb,$16,$17,$18,$19)
       returning id, name, location_text, price_cents, rating, size_feet, capacity, type, description, verified, tie_document_url, tiem_document_url, video_url, route_islands, route_island_images`,
      [
        req.user.sub,
        body.nome,
        body.distancia,
        body.precoCents,
        0,
        body.tamanhoPes,
        body.capacidade,
        body.tipo,
        body.descricao,
        false,
        body.tieDocumentUrl ?? null,
        body.tiemDocumentUrl ?? null,
        body.videoUrl ?? null,
        body.routeIslands ?? [],
        riJson,
        jetOffered,
        jetSkiPriceFinal,
        jetSkiImagesFinal,
        jetSkiDocFinal,
      ]
    );
    const b = created.rows[0];
    for (let i = 0; i < body.imagens.length; i++) {
      await query(`insert into boat_images (boat_id, url, sort) values ($1, $2, $3)`, [b.id, body.imagens[i], i]);
    }
    await replaceBoatEmbarkLocations(b.id, parseLocaisEmbarqueBody(body.locaisEmbarque));
    await replaceBoatEmbarkSlots(b.id, parseHorariosEmbarqueBody(body.horariosEmbarque));
    return res.json({ boat: b });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro ao registrar embarcação.";
    return res.status(400).send(msg);
  }
});

app.delete("/api/owner/boats/:id", requireAuth, requireRole("locatario"), async (req, res) => {
  try {
    const boatId = req.params.id;
    const own = await query(`select id from boats where id = $1 and owner_user_id = $2`, [boatId, req.user.sub]);
    if (!own.rows[0]) return res.status(404).send("Barco não encontrado para este locador.");

    const bc = await query(`select count(*)::int as c from bookings where boat_id = $1`, [boatId]);
    if ((bc.rows[0]?.c ?? 0) > 0) {
      return res
        .status(409)
        .send(
          "Não é possível excluir: existem reservas associadas a esta embarcação. Conclua ou cancele as reservas antes."
        );
    }

    await query(`delete from boats where id = $1 and owner_user_id = $2`, [boatId, req.user.sub]);
    return res.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro ao excluir embarcação.";
    return res.status(400).send(msg);
  }
});

const postOwnerAmenitySchema = z.object({
  name: z.string().min(2).max(120),
});

app.post("/api/owner/amenities", requireAuth, requireRole("locatario"), async (req, res) => {
  try {
    const body = postOwnerAmenitySchema.parse(req.body || {});
    const name = body.name.trim();
    const ins = await query(
      `insert into amenities (name) values ($1) on conflict (name) do nothing returning id, name`,
      [name]
    );
    if (ins.rows[0]) return res.json(ins.rows[0]);
    const ex = await query(`select id, name from amenities where name = $1 limit 1`, [name]);
    return res.json(ex.rows[0]);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro ao criar item.";
    return res.status(400).send(msg);
  }
});

const putBoatAmenitiesSchema = z.object({
  pairs: z.array(z.object({ amenityId: z.string().uuid(), included: z.boolean() })),
});

app.put("/api/owner/boats/:id/amenities", requireAuth, requireRole("locatario"), async (req, res) => {
  try {
    const boatId = req.params.id;
    const body = putBoatAmenitiesSchema.parse(req.body || {});
    const own = await query(`select id from boats where id = $1 and owner_user_id = $2`, [boatId, req.user.sub]);
    if (!own.rows[0]) return res.status(404).send("Barco não encontrado.");

    await query(`delete from boat_amenities where boat_id = $1`, [boatId]);
    for (const p of body.pairs) {
      await query(`insert into boat_amenities (boat_id, amenity_id, included) values ($1, $2, $3)`, [
        boatId,
        p.amenityId,
        p.included,
      ]);
    }
    return res.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro ao salvar inclusões.";
    return res.status(400).send(msg);
  }
});

const putCalendarLocksSchema = z.object({
  dateLocks: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  weekdayLocks: z.array(z.number().int().min(0).max(6)),
});

app.put("/api/owner/boats/:id/calendar-locks", requireAuth, requireRole("locatario"), async (req, res) => {
  try {
    const boatId = req.params.id;
    const body = putCalendarLocksSchema.parse(req.body || {});
    const own = await query(`select id from boats where id = $1 and owner_user_id = $2`, [boatId, req.user.sub]);
    if (!own.rows[0]) return res.status(404).send("Barco não encontrado.");

    await query(`delete from boat_date_locks where boat_id = $1`, [boatId]);
    await query(`delete from boat_weekday_locks where boat_id = $1`, [boatId]);
    const seenD = new Set();
    for (const d of body.dateLocks) {
      if (seenD.has(d)) continue;
      seenD.add(d);
      await query(`insert into boat_date_locks (boat_id, locked_date) values ($1, $2::date)`, [boatId, d]);
    }
    const seenW = new Set();
    for (const w of body.weekdayLocks) {
      if (seenW.has(w)) continue;
      seenW.add(w);
      await query(`insert into boat_weekday_locks (boat_id, weekday) values ($1, $2)`, [boatId, w]);
    }
    return res.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro ao salvar travas.";
    return res.status(400).send(msg);
  }
});

// --- Bookings ---
/** Banhista: não reserva no mesmo dia nem no dia seguinte (primeira data = hoje + 2). */
const BANHISTA_MIN_CALENDAR_LEAD_DAYS = 2;

function calendarDaysFromTodayLocal(yyyyMmDd) {
  const parts = String(yyyyMmDd)
    .split("-")
    .map((x) => parseInt(x, 10));
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) return NaN;
  const [y, m, d] = parts;
  const target = new Date(y, m - 1, d);
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((target.getTime() - start.getTime()) / 86400000);
}

function assertBanhistaBookingLead(bookingDateStr) {
  const diff = calendarDaysFromTodayLocal(bookingDateStr);
  if (!Number.isFinite(diff) || diff < BANHISTA_MIN_CALENDAR_LEAD_DAYS) {
    const err = new Error(
      "Escolha uma data pelo menos dois dias após hoje (hoje e amanhã não estão disponíveis)."
    );
    err.code = "BOOKING_MIN_LEAD";
    throw err;
  }
}

const createBookingSchema = z.object({
  boatId: z.string().uuid(),
  bookingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  passengersAdults: z.number().int().min(1),
  passengersChildren: z.number().int().min(0),
  hasKids: z.boolean(),
  bbqKit: z.boolean(),
  jetSki: z.boolean().optional().default(false),
  embarkLocation: z.union([z.string().max(200), z.null()]).optional(),
  embarkTime: z.union([z.string().max(5), z.null()]).optional(),
  totalCents: z.number().int().min(0),
  routeIslands: z.array(z.string().min(1).max(200)).max(30).optional().default([]),
});

app.post("/api/bookings", requireAuth, requireRole("banhista"), async (req, res) => {
  try {
    const body = createBookingSchema.parse(req.body);

    const boat = await query(
      `select id, owner_user_id, capacity, price_cents, jet_ski_offered, jet_ski_price_cents from boats where id = $1`,
      [body.boatId]
    );
    const b = boat.rows[0];
    if (!b) return res.status(404).send("Barco não encontrado.");
    if (body.passengersAdults + body.passengersChildren > Number(b.capacity ?? 0)) {
      return res.status(400).send("Número de passageiros acima da capacidade do barco.");
    }

    assertBanhistaBookingLead(body.bookingDate);
    await assertBookingSlotAvailable(body.boatId, body.bookingDate, null);

    let embLoc = null;
    if (body.embarkLocation !== undefined && body.embarkLocation !== null) {
      const t = String(body.embarkLocation).trim();
      embLoc = t === "" ? null : t;
    }
    let embTimeNorm = null;
    if (body.embarkTime !== undefined && body.embarkTime !== null) {
      const t = String(body.embarkTime).trim();
      if (t !== "") {
        embTimeNorm = normalizeEmbarkTimeHHMM(t);
        if (!embTimeNorm) return res.status(400).send("Horário de embarque inválido.");
      }
    }

    let locFinal;
    let timeFinal;
    try {
      const r = await assertBookingEmbarkChoices(body.boatId, embLoc, embTimeNorm);
      locFinal = r.embarkLocation;
      timeFinal = r.embarkTimeHHMM;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Dados de embarque inválidos.";
      return res.status(400).send(msg);
    }

    if (body.jetSki && !b.jet_ski_offered) {
      return res.status(400).send("Esta embarcação não oferece moto aquática.");
    }

    let expectedTotal;
    try {
      expectedTotal = expectedBookingTotalCents({
        price_cents: b.price_cents,
        bbq_kit: body.bbqKit,
        jet_ski_selected: body.jetSki,
        jet_ski_offered: b.jet_ski_offered,
        jet_ski_price_cents: b.jet_ski_price_cents,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Total inválido.";
      return res.status(400).send(msg);
    }
    if (body.totalCents !== expectedTotal) {
      return res.status(400).send("Total da reserva inconsistente. Atualize a página e tente novamente.");
    }

    const created = await query(
      `insert into bookings
        (boat_id, renter_user_id, owner_user_id, status,
         passengers_adults, passengers_children, has_kids, bbq_kit, jet_ski_selected,
         embark_location, embark_time, total_cents, route_islands, booking_date)
       values ($1,$2,$3,'PENDING',$4,$5,$6,$7,$8,$9,$10::time,$11,$12,$13)
       returning id, status, created_at`,
      [
        body.boatId,
        req.user.sub,
        b.owner_user_id,
        body.passengersAdults,
        body.passengersChildren,
        body.hasKids,
        body.bbqKit,
        body.jetSki,
        locFinal,
        timeFinal,
        body.totalCents,
        body.routeIslands ?? [],
        body.bookingDate,
      ]
    );

    const booking = created.rows[0];
    return res.json({
      booking: {
        id: booking.id,
        status: booking.status,
        createdAt: booking.created_at,
        ownerUserId: b.owner_user_id,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro ao criar reserva.";
    if (e && typeof e === "object" && "code" in e && e.code === "DATE_LOCKED") {
      return res.status(400).send(msg);
    }
    if (e && typeof e === "object" && "code" in e && e.code === "WEEKDAY_LOCKED") {
      return res.status(400).send(msg);
    }
    if (e && typeof e === "object" && "code" in e && e.code === "DATE_OCCUPIED") {
      return res.status(400).send(msg);
    }
    if (e && typeof e === "object" && "code" in e && e.code === "BOOKING_MIN_LEAD") {
      return res.status(400).send(msg);
    }
    return res.status(400).send(msg);
  }
});

const rescheduleReasonEnum = z.enum([
  "BAD_WEATHER",
  "NAVIGATION_RISK",
  "OPERATIONAL_IMPEDIMENT",
  "AUTHORITY_ORDER",
  "SAFETY_FACTOR",
  "OTHER",
]);

const renterUpdateBookingSchema = z.object({
  passengersAdults: z.number().int().min(1).optional(),
  passengersChildren: z.number().int().min(0).optional(),
  hasKids: z.boolean().optional(),
  bbqKit: z.boolean().optional(),
  jetSki: z.boolean().optional(),
  embarkLocation: z.union([z.string().max(200), z.null()]).optional(),
  embarkTime: z.union([z.string().max(5), z.null()]).optional(),
  totalCents: z.number().int().min(0).optional(),
  routeIslands: z.array(z.string().min(1).max(200)).max(30).optional(),
  bookingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  rescheduleReason: rescheduleReasonEnum.optional(),
  rescheduleTitle: z.string().max(200).optional(),
  rescheduleNote: z.string().max(4000).optional(),
  rescheduleAttachments: z.array(assetOrUrlSchema).max(8).optional(),
});

app.get("/api/renter/bookings", requireAuth, requireRole("banhista"), async (req, res) => {
  try {
    const rows = await query(
      `select
         bk.id,
         bk.status,
         bk.created_at,
         bk.decided_at,
         bk.decision_note,
         bk.passengers_adults,
         bk.passengers_children,
         bk.has_kids,
         bk.bbq_kit,
         bk.jet_ski_selected,
         bk.embark_location,
         to_char(bk.embark_time, 'HH24:MI') as embark_time,
         bk.total_cents,
         bk.booking_date::text as booking_date,
         coalesce(bk.route_islands, '{}'::text[]) as route_islands,
         b.id as boat_id,
         b.name as boat_name,
         b.location_text as boat_location,
         b.capacity as boat_capacity,
         coalesce(b.jet_ski_offered, false) as jet_ski_offered,
         coalesce(b.jet_ski_price_cents, 0) as jet_ski_price_cents,
         br.boat_stars,
         br.boat_comment,
         br.boat_rated_at,
         coalesce(
           (select array_agg(el.name order by el.name) from embark_locations el where el.boat_id = bk.boat_id),
           '{}'::text[]
         ) as embark_loc_options,
         coalesce(
           (select array_agg(to_char(bes.slot_time, 'HH24:MI') order by bes.sort_order, bes.slot_time)
            from boat_embark_slots bes where bes.boat_id = bk.boat_id),
           '{}'::text[]
         ) as embark_time_options,
         bk.reschedule_reason,
         bk.reschedule_title,
         bk.reschedule_note,
         coalesce(bk.reschedule_attachments, '{}'::text[]) as reschedule_attachments
       from bookings bk
       join boats b on b.id = bk.boat_id
       left join booking_ratings br on br.booking_id = bk.id
       where bk.renter_user_id = $1
       order by bk.created_at desc`,
      [req.user.sub]
    );

    return res.json({
      bookings: rows.rows.map((r) => ({
        id: r.id,
        status: r.status,
        createdAt: r.created_at,
        decidedAt: r.decided_at,
        decisionNote: r.decision_note,
        passengersAdults: r.passengers_adults,
        passengersChildren: r.passengers_children,
        hasKids: r.has_kids,
        bbqKit: r.bbq_kit,
        jetSki: r.jet_ski_selected,
        embarkLocation: r.embark_location,
        embarkTime: r.embark_time,
        embarkLocationOptions: Array.isArray(r.embark_loc_options) ? r.embark_loc_options : [],
        embarkTimeOptions: Array.isArray(r.embark_time_options) ? r.embark_time_options : [],
        totalCents: r.total_cents,
        bookingDate: r.booking_date,
        routeIslands: Array.isArray(r.route_islands) ? r.route_islands : [],
        boat: {
          id: r.boat_id,
          nome: r.boat_name,
          distancia: r.boat_location,
          capacidade: r.boat_capacity,
          jetSkiOffered: Boolean(r.jet_ski_offered),
          jetSkiPriceCents: Number(r.jet_ski_price_cents ?? 0),
        },
        rescheduleReason: r.reschedule_reason ?? null,
        rescheduleTitle: r.reschedule_title ?? null,
        rescheduleNote: r.reschedule_note ?? null,
        rescheduleAttachments: Array.isArray(r.reschedule_attachments) ? r.reschedule_attachments : [],
        ratingBoat:
          r.boat_stars != null
            ? {
                stars: r.boat_stars,
                comment: r.boat_comment,
                ratedAt: r.boat_rated_at,
              }
            : null,
      })),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro ao carregar reservas.";
    return res.status(503).send(msg);
  }
});

app.patch("/api/renter/bookings/:id", requireAuth, requireRole("banhista"), async (req, res) => {
  try {
    const bookingId = req.params.id;
    const body = renterUpdateBookingSchema.parse(req.body || {});
    const cur = await query(
      `select bk.status, bk.boat_id, bk.passengers_adults, bk.passengers_children, bk.booking_date::text as bd,
              bk.embark_location, to_char(bk.embark_time, 'HH24:MI') as embark_time,
              bk.bbq_kit, bk.jet_ski_selected,
              b.price_cents, coalesce(b.jet_ski_offered, false) as jet_ski_offered,
              coalesce(b.jet_ski_price_cents, 0) as jet_ski_price_cents
       from bookings bk
       join boats b on b.id = bk.boat_id
       where bk.id = $1 and bk.renter_user_id = $2 limit 1`,
      [bookingId, req.user.sub]
    );
    const st = cur.rows[0]?.status;
    if (!st) return res.status(404).send("Reserva não encontrada.");
    if (st === "DECLINED" || st === "CANCELLED" || st === "COMPLETED") {
      return res.status(400).send("Esta reserva não pode ser alterada.");
    }

    const boatId = cur.rows[0].boat_id;
    const capRow = await query(`select capacity from boats where id = $1`, [boatId]);
    const cap = Number(capRow.rows[0]?.capacity ?? 0);
    const adults = body.passengersAdults ?? cur.rows[0].passengers_adults;
    const children = body.passengersChildren ?? cur.rows[0].passengers_children;
    if (adults + children > cap) {
      return res.status(400).send("Número de passageiros acima da capacidade do barco.");
    }

    const currentBd = cur.rows[0].bd;
    const dateChanging = body.bookingDate !== undefined && body.bookingDate !== currentBd;

    if (body.bookingDate && body.bookingDate !== currentBd) {
      assertBanhistaBookingLead(body.bookingDate);
      await assertBookingSlotAvailable(boatId, body.bookingDate, bookingId);
    }

    /** @type {{ reason: string, title: string, note: string, attachments: string[] } | null} */
    let reschedulePayload = null;
    if (dateChanging && st === "ACCEPTED") {
      const pr = rescheduleReasonEnum.safeParse(body.rescheduleReason);
      if (!pr.success) {
        return res
          .status(400)
          .send("Para remarcar, selecione um dos motivos permitidos (mau tempo, segurança, etc.).");
      }
      const title = String(body.rescheduleTitle ?? "").trim();
      const note = String(body.rescheduleNote ?? "").trim();
      if (title.length < 3) {
        return res.status(400).send("Informe um título para a justificativa (mínimo 3 caracteres).");
      }
      if (note.length < 10) {
        return res.status(400).send("Informe o texto da justificativa (mínimo 10 caracteres).");
      }
      const attachments = Array.isArray(body.rescheduleAttachments) ? body.rescheduleAttachments : [];
      for (let i = 0; i < attachments.length; i++) {
        const ok = assetOrUrlSchema.safeParse(attachments[i]);
        if (!ok.success) {
          return res.status(400).send("Um ou mais anexos de imagem são inválidos.");
        }
      }
      reschedulePayload = { reason: pr.data, title, note, attachments };
    }

    let nextLoc = cur.rows[0].embark_location ?? null;
    let nextTime = cur.rows[0].embark_time ?? null;
    if (body.embarkLocation !== undefined) {
      nextLoc =
        body.embarkLocation === null
          ? null
          : String(body.embarkLocation).trim() === ""
            ? null
            : String(body.embarkLocation).trim();
    }
    if (body.embarkTime !== undefined) {
      if (body.embarkTime === null || String(body.embarkTime).trim() === "") {
        nextTime = null;
      } else {
        const nt = normalizeEmbarkTimeHHMM(String(body.embarkTime));
        if (!nt) return res.status(400).send("Horário de embarque inválido.");
        nextTime = nt;
      }
    }
    if (body.embarkLocation !== undefined || body.embarkTime !== undefined) {
      try {
        const r = await assertBookingEmbarkChoices(boatId, nextLoc, nextTime);
        nextLoc = r.embarkLocation;
        nextTime = r.embarkTimeHHMM;
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Dados de embarque inválidos.";
        return res.status(400).send(msg);
      }
    }

    const row0 = cur.rows[0];
    const nextBbq = body.bbqKit !== undefined ? body.bbqKit : row0.bbq_kit;
    const nextJet = body.jetSki !== undefined ? body.jetSki : row0.jet_ski_selected;
    if (nextJet && !row0.jet_ski_offered) {
      return res.status(400).send("Esta embarcação não oferece moto aquática.");
    }
    if (body.totalCents !== undefined) {
      let expectedTotal;
      try {
        expectedTotal = expectedBookingTotalCents({
          price_cents: row0.price_cents,
          bbq_kit: nextBbq,
          jet_ski_selected: nextJet,
          jet_ski_offered: row0.jet_ski_offered,
          jet_ski_price_cents: row0.jet_ski_price_cents,
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Total inválido.";
        return res.status(400).send(msg);
      }
      if (body.totalCents !== expectedTotal) {
        return res.status(400).send("Total da reserva inconsistente. Atualize a página e tente novamente.");
      }
    }

    const sets = [];
    const vals = [bookingId, req.user.sub];
    let n = 3;
    if (body.passengersAdults !== undefined) {
      sets.push(`passengers_adults = $${n}`);
      vals.push(body.passengersAdults);
      n += 1;
    }
    if (body.passengersChildren !== undefined) {
      sets.push(`passengers_children = $${n}`);
      vals.push(body.passengersChildren);
      n += 1;
    }
    if (body.hasKids !== undefined) {
      sets.push(`has_kids = $${n}`);
      vals.push(body.hasKids);
      n += 1;
    }
    if (body.bbqKit !== undefined) {
      sets.push(`bbq_kit = $${n}`);
      vals.push(body.bbqKit);
      n += 1;
    }
    if (body.jetSki !== undefined) {
      sets.push(`jet_ski_selected = $${n}`);
      vals.push(body.jetSki);
      n += 1;
    }
    if (body.embarkLocation !== undefined) {
      sets.push(`embark_location = $${n}`);
      vals.push(nextLoc);
      n += 1;
    }
    if (body.embarkTime !== undefined) {
      sets.push(`embark_time = $${n}::time`);
      vals.push(nextTime);
      n += 1;
    }
    if (body.totalCents !== undefined) {
      sets.push(`total_cents = $${n}`);
      vals.push(body.totalCents);
      n += 1;
    }
    if (body.routeIslands !== undefined) {
      sets.push(`route_islands = $${n}`);
      vals.push(body.routeIslands);
      n += 1;
    }
    if (body.bookingDate !== undefined) {
      sets.push(`booking_date = $${n}::date`);
      vals.push(body.bookingDate);
      n += 1;
      if (reschedulePayload) {
        sets.push(`reschedule_reason = $${n}`);
        vals.push(reschedulePayload.reason);
        n += 1;
        sets.push(`reschedule_title = $${n}`);
        vals.push(reschedulePayload.title);
        n += 1;
        sets.push(`reschedule_note = $${n}`);
        vals.push(reschedulePayload.note);
        n += 1;
        sets.push(`reschedule_attachments = $${n}`);
        vals.push(reschedulePayload.attachments);
        n += 1;
      } else if (dateChanging && st === "PENDING") {
        sets.push(`reschedule_reason = NULL`);
        sets.push(`reschedule_title = NULL`);
        sets.push(`reschedule_note = NULL`);
        sets.push(`reschedule_attachments = $${n}`);
        vals.push([]);
        n += 1;
      }
    }
    if (sets.length === 0) return res.status(400).send("Nada para atualizar.");

    sets.push(`status = 'PENDING'`);
    sets.push(`decided_at = NULL`);
    sets.push(`decision_note = NULL`);

    const updated = await query(
      `update bookings set ${sets.join(", ")}
       where id = $1 and renter_user_id = $2
       returning id, status, created_at, decided_at`,
      vals
    );
    const row = updated.rows[0];
    return res.json({ booking: row });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro ao atualizar reserva.";
    if (
      e &&
      typeof e === "object" &&
      "code" in e &&
      [
        "DATE_LOCKED",
        "WEEKDAY_LOCKED",
        "DATE_OCCUPIED",
        "BOOKING_MIN_LEAD",
        "EMBARK_LOCATION_INVALID",
        "EMBARK_TIME_INVALID",
        "EMBARK_LOCATION_UNEXPECTED",
        "EMBARK_TIME_UNEXPECTED",
        "EMBARK_TIME_FORMAT",
      ].includes(String(e.code))
    ) {
      return res.status(400).send(msg);
    }
    return res.status(400).send(msg);
  }
});

app.post("/api/renter/bookings/:id/cancel", requireAuth, requireRole("banhista"), async (req, res) => {
  try {
    const bookingId = req.params.id;
    const updated = await query(
      `update bookings
       set status = 'CANCELLED', decided_at = coalesce(decided_at, now())
       where id = $1::uuid and renter_user_id = $2::uuid
         and status in ('PENDING','ACCEPTED')
       returning id, status, decided_at`,
      [bookingId, req.user.sub]
    );
    const row = updated.rows[0];
    if (!row) {
      return res.status(404).send("Reserva não encontrada ou não pode ser cancelada.");
    }
    return res.json({ booking: row });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro ao cancelar reserva.";
    return res.status(400).send(msg);
  }
});

app.get("/api/owner/bookings", requireAuth, requireRole("locatario"), async (req, res) => {
  try {
    const status = req.query.status;
    const statusFilter =
      status === "PENDING" ||
      status === "ACCEPTED" ||
      status === "DECLINED" ||
      status === "CANCELLED" ||
      status === "COMPLETED"
        ? status
        : null;

    const params = [req.user.sub];
    let where = `where bk.owner_user_id = $1`;
    if (statusFilter) {
      params.push(statusFilter);
      where += ` and bk.status = $2`;
    }

    const rows = await query(
      `select
         bk.id,
         bk.status,
         bk.created_at,
         bk.decided_at,
         bk.decision_note,
         bk.passengers_adults,
         bk.passengers_children,
         bk.has_kids,
         bk.bbq_kit,
         bk.jet_ski_selected,
         bk.embark_location,
         to_char(bk.embark_time, 'HH24:MI') as embark_time,
         bk.total_cents,
         bk.booking_date::text as booking_date,
         coalesce(bk.route_islands, '{}'::text[]) as route_islands,
         b.id as boat_id,
         b.name as boat_name,
         coalesce(b.jet_ski_offered, false) as boat_jet_ski_offered,
         coalesce(b.jet_ski_price_cents, 0) as boat_jet_ski_price_cents,
         u.id as renter_id,
         u.name as renter_name,
         u.email as renter_email,
         br.renter_stars,
         br.renter_comment,
         br.renter_rated_at,
         bk.reschedule_reason,
         bk.reschedule_title,
         bk.reschedule_note,
         coalesce(bk.reschedule_attachments, '{}'::text[]) as reschedule_attachments
       from bookings bk
       join boats b on b.id = bk.boat_id
       join users u on u.id = bk.renter_user_id
       left join booking_ratings br on br.booking_id = bk.id
       ${where}
       order by bk.created_at desc`,
      params
    );

    return res.json({
      bookings: rows.rows.map((r) => ({
        id: r.id,
        status: r.status,
        createdAt: r.created_at,
        decidedAt: r.decided_at,
        decisionNote: r.decision_note,
        passengersAdults: r.passengers_adults,
        passengersChildren: r.passengers_children,
        hasKids: r.has_kids,
        bbqKit: r.bbq_kit,
        jetSki: r.jet_ski_selected,
        embarkLocation: r.embark_location,
        embarkTime: r.embark_time,
        totalCents: r.total_cents,
        bookingDate: r.booking_date,
        routeIslands: Array.isArray(r.route_islands) ? r.route_islands : [],
        boat: {
          id: r.boat_id,
          nome: r.boat_name,
          jetSkiOffered: Boolean(r.boat_jet_ski_offered),
          jetSkiPriceCents: Number(r.boat_jet_ski_price_cents ?? 0),
        },
        renter: { id: r.renter_id, nome: r.renter_name, email: r.renter_email },
        rescheduleReason: r.reschedule_reason ?? null,
        rescheduleTitle: r.reschedule_title ?? null,
        rescheduleNote: r.reschedule_note ?? null,
        rescheduleAttachments: Array.isArray(r.reschedule_attachments) ? r.reschedule_attachments : [],
        ratingRenter:
          r.renter_stars != null
            ? {
                stars: r.renter_stars,
                comment: r.renter_comment,
                ratedAt: r.renter_rated_at,
              }
            : null,
      })),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro ao carregar reservas.";
    // eslint-disable-next-line no-console
    console.error("[GET /api/owner/bookings]", msg);
    return res.status(503).send(msg);
  }
});

const decideSchema = z.object({
  note: z.string().max(500).optional(),
});

app.post(
  "/api/owner/bookings/:id/accept",
  requireAuth,
  requireRole("locatario"),
  async (req, res) => {
    try {
      const bookingId = req.params.id;
      const body = decideSchema.parse(req.body || {});
      const pending = await query(
        `select bk.boat_id, bk.booking_date::text as bd
         from bookings bk
         where bk.id = $1 and bk.owner_user_id = $2 and bk.status = 'PENDING'`,
        [bookingId, req.user.sub]
      );
      const pr = pending.rows[0];
      if (!pr) return res.status(404).send("Reserva não encontrada ou já decidida.");

      const conflict = await query(
        `select id from bookings
         where boat_id = $1 and booking_date = $2::date
           and status in ('ACCEPTED','COMPLETED')
           and id <> $3::uuid
         limit 1`,
        [pr.boat_id, pr.bd, bookingId]
      );
      if (conflict.rows[0]) {
        return res.status(400).send("Já existe reserva confirmada neste dia para este barco.");
      }

      const updated = await query(
        `update bookings
         set status = 'ACCEPTED', decided_at = now(), decision_note = $3
         where id = $1 and owner_user_id = $2 and status = 'PENDING'
         returning id, status, decided_at`,
        [bookingId, req.user.sub, body.note ?? null]
      );
      const row = updated.rows[0];
      if (!row) return res.status(404).send("Reserva não encontrada ou já decidida.");
      return res.json({ booking: row });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro ao aceitar reserva.";
      return res.status(400).send(msg);
    }
  }
);

app.post(
  "/api/owner/bookings/:id/decline",
  requireAuth,
  requireRole("locatario"),
  async (req, res) => {
    try {
      const bookingId = req.params.id;
      const body = decideSchema.parse(req.body || {});
      const updated = await query(
        `update bookings
         set status = 'DECLINED', decided_at = now(), decision_note = $3
         where id = $1 and owner_user_id = $2 and status = 'PENDING'
         returning id, status, decided_at`,
        [bookingId, req.user.sub, body.note ?? null]
      );
      const row = updated.rows[0];
      if (!row) return res.status(404).send("Reserva não encontrada ou já decidida.");
      return res.json({ booking: row });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro ao recusar reserva.";
      return res.status(400).send(msg);
    }
  }
);

app.post(
  "/api/owner/bookings/:id/complete",
  requireAuth,
  requireRole("locatario"),
  async (req, res) => {
    try {
      const bookingId = req.params.id;
      const updated = await query(
        `update bookings
         set status = 'COMPLETED', decided_at = coalesce(decided_at, now())
         where id = $1 and owner_user_id = $2 and status = 'ACCEPTED'
         returning id, status, decided_at`,
        [bookingId, req.user.sub]
      );
      const row = updated.rows[0];
      if (!row) return res.status(404).send("Reserva não encontrada ou não está aceita.");
      return res.json({ booking: row });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro ao concluir reserva.";
      return res.status(400).send(msg);
    }
  }
);

const bookingRatingSchema = z.object({
  stars: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
});

app.post("/api/renter/bookings/:id/rate-boat", requireAuth, requireRole("banhista"), async (req, res) => {
  try {
    const bookingId = req.params.id;
    const body = bookingRatingSchema.parse(req.body || {});
    const cur = await query(
      `select bk.id, bk.status, bk.boat_id, bk.renter_user_id, br.boat_stars
       from bookings bk
       left join booking_ratings br on br.booking_id = bk.id
       where bk.id = $1::uuid and bk.renter_user_id = $2::uuid
       limit 1`,
      [bookingId, req.user.sub]
    );
    const row = cur.rows[0];
    if (!row) return res.status(404).send("Reserva não encontrada.");
    if (row.status !== "COMPLETED") {
      return res.status(400).send("Só é possível avaliar após o passeio concluído.");
    }
    if (row.boat_stars != null) {
      return res.status(400).send("Você já avaliou esta embarcação nesta reserva.");
    }

    const up = await query(
      `update booking_ratings
       set boat_stars = $2, boat_comment = $3, boat_rated_at = now()
       where booking_id = $1::uuid and boat_stars is null
       returning booking_id`,
      [bookingId, body.stars, body.comment?.trim() || null]
    );
    if (!up.rows[0]) {
      await query(
        `insert into booking_ratings (booking_id, boat_stars, boat_comment, boat_rated_at)
         values ($1::uuid, $2, $3, now())`,
        [bookingId, body.stars, body.comment?.trim() || null]
      );
    }

    await recalcBoatRating(row.boat_id);
    return res.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro ao registrar avaliação.";
    return res.status(400).send(msg);
  }
});

app.post("/api/owner/bookings/:id/rate-renter", requireAuth, requireRole("locatario"), async (req, res) => {
  try {
    const bookingId = req.params.id;
    const body = bookingRatingSchema.parse(req.body || {});
    const cur = await query(
      `select bk.id, bk.status, bk.renter_user_id, br.renter_stars
       from bookings bk
       left join booking_ratings br on br.booking_id = bk.id
       where bk.id = $1::uuid and bk.owner_user_id = $2::uuid
       limit 1`,
      [bookingId, req.user.sub]
    );
    const row = cur.rows[0];
    if (!row) return res.status(404).send("Reserva não encontrada.");
    if (row.status !== "COMPLETED") {
      return res.status(400).send("Só é possível avaliar após o passeio concluído.");
    }
    if (row.renter_stars != null) {
      return res.status(400).send("Você já avaliou este banhista nesta reserva.");
    }

    const up = await query(
      `update booking_ratings
       set renter_stars = $2, renter_comment = $3, renter_rated_at = now()
       where booking_id = $1::uuid and renter_stars is null
       returning booking_id`,
      [bookingId, body.stars, body.comment?.trim() || null]
    );
    if (!up.rows[0]) {
      await query(
        `insert into booking_ratings (booking_id, renter_stars, renter_comment, renter_rated_at)
         values ($1::uuid, $2, $3, now())`,
        [bookingId, body.stars, body.comment?.trim() || null]
      );
    }

    await recalcGuestRating(row.renter_user_id);
    return res.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro ao registrar avaliação.";
    return res.status(400).send(msg);
  }
});

app.post("/api/mercadopago/preference", async (req, res) => {
  try {
    if (!MP_ACCESS_TOKEN) {
      return res.status(500).send("MP_ACCESS_TOKEN não configurado no servidor.");
    }

    const {
      titulo,
      valor,
      metodoPagamento,
      nome,
      cpf,
      telefone,
      externalReference,
      bookingId,
    } = req.body || {};

    if (!titulo || typeof titulo !== "string") return res.status(400).send("Campo 'titulo' inválido.");
    if (!valor || typeof valor !== "number") return res.status(400).send("Campo 'valor' inválido.");
    if (metodoPagamento !== "pix" && metodoPagamento !== "cartao") {
      return res.status(400).send("Campo 'metodoPagamento' inválido.");
    }
    if (!nome || typeof nome !== "string") return res.status(400).send("Campo 'nome' inválido.");
    if (!cpf || typeof cpf !== "string") return res.status(400).send("Campo 'cpf' inválido.");
    if (!telefone || typeof telefone !== "string") return res.status(400).send("Campo 'telefone' inválido.");

    const preference = await preferenceClient.create({
      body: {
        external_reference: bookingId || externalReference || undefined,
        items: [
          {
            title: titulo,
            quantity: 1,
            currency_id: "BRL",
            unit_price: Number(valor),
          },
        ],
        payer: {
          name: nome,
          identification: {
            type: "CPF",
            number: cpf,
          },
          phone: {
            number: telefone,
          },
        },
        payment_methods: {
          excluded_payment_types:
            metodoPagamento === "pix"
              ? [{ id: "credit_card" }, { id: "debit_card" }, { id: "ticket" }]
              : [{ id: "bank_transfer" }, { id: "ticket" }],
        },
        back_urls: {
          success: `${FRONTEND_URL}/reservar/sucesso`,
          failure: `${FRONTEND_URL}/reservar/erro`,
          pending: `${FRONTEND_URL}/reservar/pendente`,
        },
        auto_return: "approved",
      },
    });

    return res.json({
      id: preference.id,
      init_point: preference.init_point,
      sandbox_init_point: preference.sandbox_init_point,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erro ao criar preferência.";
    return res.status(500).send(message);
  }
});

async function startServer() {
  if (!DATABASE_URL || !String(DATABASE_URL).trim()) {
    // eslint-disable-next-line no-console
    console.error(`
[alto-mar] Falta DATABASE_URL no ficheiro server/.env

Exemplo (Postgres local com Docker — na raiz do repo):
  npm run db:setup
  copie server/.env.example para server/.env e use:
  DATABASE_URL=postgres://postgres:postgres@127.0.0.1:5432/alto_mar

Teste: http://127.0.0.1:3001/api/health
`);
    process.exit(1);
  }

  try {
    await ensureFavoritesTable();
    await ensureBoatsRouteIslandsColumn();
    await ensureBoatsRouteIslandImagesColumn();
    await ensureUserProfileColumns();
    await ensureBoatDocumentAndMediaColumns();
    await ensureBookingsRouteIslandsColumn();
    await ensureBookingStatusCompleted();
    await ensureSeedAmenities();
    await ensureBookingDateColumn();
    await ensureBoatCalendarTables();
    await ensureBookingRatingsTable();
    await ensureBoatEmbarkSlotsAndBookingEmbarkColumns();
    await ensureBookingsRescheduleColumns();
    await ensureJetSkiBoatAndBookingColumns();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    // eslint-disable-next-line no-console
    console.error("Falha ao garantir estrutura inicial:", msg);
  }

  app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`API running on http://localhost:${PORT}`);
  }).on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      // eslint-disable-next-line no-console
      console.error(`Porta ${PORT} em uso. Feche o programa que está usando ou mude PORT no server/.env e o target no vite.config.ts.`);
    }
    process.exit(1);
  });
}

startServer();

