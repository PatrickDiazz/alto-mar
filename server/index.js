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
  // Fail fast: without token we can't create preferences
  // eslint-disable-next-line no-console
  console.error("Missing MP_ACCESS_TOKEN in server environment.");
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

const app = express();
app.use(express.json());
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
app.use(
  cors({
    origin: (origin, cb) => (origin && allowedOrigins.includes(origin) ? cb(null, true) : cb(null, allowedOrigins[0])),
    credentials: true,
  })
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
    return res.status(500).json({ ok: false, db: "disconnected", error: msg });
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
    `select id, name, email, role, rg_url, nautical_license_url, created_at from users where id = $1`,
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
app.get("/api/boats", async (_req, res) => {
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
       b.verified
     from boats b
     order by b.created_at desc`
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
  const amenitiesByBoat = amenityRows.rows.reduce((acc, r) => {
    (acc[r.boat_id] ||= []).push({ nome: r.name, incluido: r.included });
    return acc;
  }, {});

  const payload = boats.rows.map((b) => ({
    id: b.id,
    nome: b.name,
    distancia: b.location_text,
    preco: `R$ ${(b.price_cents / 100).toLocaleString("pt-BR")}`,
    nota: Number(b.rating).toFixed(1).replace(".", ","),
    imagens: imagesByBoat[b.id] || [],
    descricao: b.description,
    verificado: b.verified,
    tamanho: `${b.size_feet} pés`,
    capacidade: b.capacity,
    tipo: b.type,
    amenidades: amenitiesByBoat[b.id] || [],
    locaisEmbarque: locationsByBoat[b.id] || [],
  }));

  return res.json({ boats: payload });
});

app.get("/api/boats/:id", async (req, res) => {
  const boatId = req.params.id;
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
       b.verified
     from boats b
     where b.id = $1
     limit 1`,
    [boatId]
  );
  const b = boat.rows[0];
  if (!b) return res.status(404).send("Barco não encontrado.");

  const [images, locations, amenities] = await Promise.all([
    query(`select url, sort from boat_images where boat_id = $1 order by sort asc`, [boatId]),
    query(`select name from embark_locations where boat_id = $1 order by name asc`, [boatId]),
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
      preco: `R$ ${(b.price_cents / 100).toLocaleString("pt-BR")}`,
      nota: Number(b.rating).toFixed(1).replace(".", ","),
      imagens: images.rows.map((r) => r.url),
      descricao: b.description,
      verificado: b.verified,
      tamanho: `${b.size_feet} pés`,
      capacidade: b.capacity,
      tipo: b.type,
      amenidades: amenities.rows.map((r) => ({ nome: r.name, incluido: r.included })),
      locaisEmbarque: locations.rows.map((r) => r.name),
    },
  });
});

// --- Favorites (por usuário logado) ---
app.get("/api/favorites", requireAuth, async (req, res) => {
  try {
    const rows = await query(
      `select boat_id from user_boat_favorites where user_id = $1 order by created_at desc`,
      [req.user.sub]
    );
    return res.json({ boatIds: rows.rows.map((r) => r.boat_id) });
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

// --- Owner boats (locatário) ---
app.get("/api/owner/boats", requireAuth, requireRole("locatario"), async (req, res) => {
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
       b.video_url
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
      imagens: images.rows.filter((i) => i.boat_id === b.id).map((i) => i.url),
    })),
  });
});

const ownerUpdateBoatSchema = z.object({
  nome: z.string().min(2).max(120),
  distancia: z.string().min(2).max(200),
  precoCents: z.number().int().min(0).max(500000000),
  rating: z.number().min(0).max(5),
  tamanhoPes: z.number().int().min(1).max(300),
  capacidade: z.number().int().min(1).max(500),
  tipo: z.string().min(2).max(80),
  descricao: z.string().min(5).max(4000),
  verificado: z.boolean(),
  tieDocumentUrl: z.string().url().or(z.string().startsWith("data:")).optional().nullable(),
  tiemDocumentUrl: z.string().url().or(z.string().startsWith("data:")).optional().nullable(),
  videoUrl: z.string().url().optional().nullable(),
  imagens: z.array(z.string().url().or(z.string().startsWith("data:"))).max(20).optional(),
});

app.patch("/api/owner/boats/:id", requireAuth, requireRole("locatario"), async (req, res) => {
  try {
    const boatId = req.params.id;
    const body = ownerUpdateBoatSchema.parse(req.body || {});

    const updated = await query(
      `update boats
       set name = $3,
           location_text = $4,
           price_cents = $5,
           rating = $6,
           size_feet = $7,
           capacity = $8,
           type = $9,
           description = $10,
           verified = $11,
           tie_document_url = $12,
           tiem_document_url = $13,
           video_url = $14
       where id = $1 and owner_user_id = $2
       returning id, name, location_text, price_cents, rating, size_feet, capacity, type, description, verified, tie_document_url, tiem_document_url, video_url`,
      [
        boatId,
        req.user.sub,
        body.nome,
        body.distancia,
        body.precoCents,
        body.rating,
        body.tamanhoPes,
        body.capacidade,
        body.tipo,
        body.descricao,
        body.verificado,
        body.tieDocumentUrl ?? null,
        body.tiemDocumentUrl ?? null,
        body.videoUrl ?? null,
      ]
    );

    const b = updated.rows[0];
    if (!b) return res.status(404).send("Barco não encontrado para este locatário.");

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

    const imgs = await query(`select url from boat_images where boat_id = $1 order by sort asc`, [boatId]);

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
        imagens: imgs.rows.map((r) => r.url),
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
  rating: z.number().min(0).max(5),
  tamanhoPes: z.number().int().min(1).max(300),
  capacidade: z.number().int().min(1).max(500),
  tipo: z.string().min(2).max(80),
  descricao: z.string().min(5).max(4000),
  tieDocumentUrl: z.string().url().or(z.string().startsWith("data:")).optional().nullable(),
  tiemDocumentUrl: z.string().url().or(z.string().startsWith("data:")).optional().nullable(),
  videoUrl: z.string().url().optional().nullable(),
  imagens: z.array(z.string().url().or(z.string().startsWith("data:"))).max(20).default([]),
});

app.post("/api/owner/boats", requireAuth, requireRole("locatario"), async (req, res) => {
  try {
    const body = ownerCreateBoatSchema.parse(req.body || {});
    const created = await query(
      `insert into boats
        (owner_user_id, name, location_text, price_cents, rating, size_feet, capacity, type, description, verified, tie_document_url, tiem_document_url, video_url)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       returning id, name, location_text, price_cents, rating, size_feet, capacity, type, description, verified, tie_document_url, tiem_document_url, video_url`,
      [
        req.user.sub,
        body.nome,
        body.distancia,
        body.precoCents,
        body.rating,
        body.tamanhoPes,
        body.capacidade,
        body.tipo,
        body.descricao,
        false,
        body.tieDocumentUrl ?? null,
        body.tiemDocumentUrl ?? null,
        body.videoUrl ?? null,
      ]
    );
    const b = created.rows[0];
    for (let i = 0; i < body.imagens.length; i++) {
      await query(`insert into boat_images (boat_id, url, sort) values ($1, $2, $3)`, [b.id, body.imagens[i], i]);
    }
    return res.json({ boat: b });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro ao registrar embarcação.";
    return res.status(400).send(msg);
  }
});

// --- Bookings ---
const createBookingSchema = z.object({
  boatId: z.string().uuid(),
  passengersAdults: z.number().int().min(1),
  passengersChildren: z.number().int().min(0),
  hasKids: z.boolean(),
  bbqKit: z.boolean(),
  embarkLocation: z.string().min(1).max(200),
  totalCents: z.number().int().min(0),
});

app.post("/api/bookings", requireAuth, requireRole("banhista"), async (req, res) => {
  try {
    const body = createBookingSchema.parse(req.body);

    const boat = await query(`select id, owner_user_id from boats where id = $1`, [body.boatId]);
    const b = boat.rows[0];
    if (!b) return res.status(404).send("Barco não encontrado.");

    const created = await query(
      `insert into bookings
        (boat_id, renter_user_id, owner_user_id, status,
         passengers_adults, passengers_children, has_kids, bbq_kit,
         embark_location, total_cents)
       values ($1,$2,$3,'PENDING',$4,$5,$6,$7,$8,$9)
       returning id, status, created_at`,
      [
        body.boatId,
        req.user.sub,
        b.owner_user_id,
        body.passengersAdults,
        body.passengersChildren,
        body.hasKids,
        body.bbqKit,
        body.embarkLocation,
        body.totalCents,
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
    return res.status(400).send(msg);
  }
});

app.get("/api/owner/bookings", requireAuth, requireRole("locatario"), async (req, res) => {
  const status = req.query.status;
  const statusFilter =
    status === "PENDING" || status === "ACCEPTED" || status === "DECLINED" || status === "CANCELLED"
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
       bk.embark_location,
       bk.total_cents,
       b.id as boat_id,
       b.name as boat_name,
       u.id as renter_id,
       u.name as renter_name,
       u.email as renter_email
     from bookings bk
     join boats b on b.id = bk.boat_id
     join users u on u.id = bk.renter_user_id
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
      embarkLocation: r.embark_location,
      totalCents: r.total_cents,
      boat: { id: r.boat_id, nome: r.boat_name },
      renter: { id: r.renter_id, nome: r.renter_name, email: r.renter_email },
    })),
  });
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
  try {
    await ensureFavoritesTable();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    // eslint-disable-next-line no-console
    console.error("Falha ao garantir tabela de favoritos:", msg);
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

