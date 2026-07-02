import bcrypt from "bcryptjs";
import { z } from "zod";
import { pool, query } from "../db.js";
import { requireAuth, requireRole } from "../auth.js";

export const MARINHEIRO_FUNCOES = [
  "CAPITAO",
  "MARINHEIRO",
  "MESTRE",
  "CONDUTOR",
  "IMEDIATO",
  "TRIPULANTE",
  "GUIA_NAUTICO",
  "OUTRA",
];

export const ACTIVE_BOOKING_STATUSES = ["ACCEPTED", "COMPLETED"];

const cpfSchema = z
  .string()
  .min(11)
  .max(14)
  .transform((v) => v.replace(/\D/g, ""))
  .refine((v) => v.length === 11, "CPF inválido.");

function normalizeCpf(cpf) {
  return String(cpf || "").replace(/\D/g, "");
}

function hasExpiredDocs(row) {
  const today = new Date().toISOString().slice(0, 10);
  if (row.identity_doc_expires_at && String(row.identity_doc_expires_at).slice(0, 10) < today) return true;
  if (row.nautical_cert_expires_at && String(row.nautical_cert_expires_at).slice(0, 10) < today) return true;
  return false;
}

function platformTenureMonths(createdAt) {
  if (!createdAt) return 0;
  const start = new Date(createdAt);
  const now = new Date();
  return Math.max(0, (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth()));
}

/** @param {import('pg').QueryResultRow} row */
export function mapMarinheiroRow(row, extras = {}) {
  const funcao = row.funcao;
  const funcaoLabel =
    funcao === "OUTRA" && row.funcao_custom ? row.funcao_custom : funcao;
  return {
    id: row.id,
    userId: row.user_id,
    nome: row.user_name ?? row.name ?? "",
    email: row.user_email ?? row.email ?? "",
    cpf: row.cpf,
    birthDate: row.birth_date ? String(row.birth_date).slice(0, 10) : null,
    phone: row.phone,
    photoUrl: row.photo_url,
    funcao,
    funcaoCustom: row.funcao_custom ?? null,
    funcaoLabel,
    identityDocUrl: row.identity_doc_url,
    identityDocExpiresAt: row.identity_doc_expires_at
      ? String(row.identity_doc_expires_at).slice(0, 10)
      : null,
    nauticalCertUrl: row.nautical_cert_url,
    nauticalCertExpiresAt: row.nautical_cert_expires_at
      ? String(row.nautical_cert_expires_at).slice(0, 10)
      : null,
    approvalStatus: row.approval_status,
    suspensionReason: row.suspension_reason ?? null,
    bio: row.bio ?? null,
    showOnBoatDetail: Boolean(row.show_on_boat_detail),
    reviewNotes: row.review_notes ?? null,
    reviewedAt: row.reviewed_at ?? null,
    documentsExpired: hasExpiredDocs(row),
    platformTenureMonths: platformTenureMonths(row.created_at),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    boatIds: extras.boatIds ?? [],
    boatNames: extras.boatNames ?? [],
    locadorIds: extras.locadorIds ?? [],
    ...extras,
  };
}

const marinheiroBaseSelect = `
  select m.*, u.name as user_name, u.email as user_email
  from marinheiros m
  join users u on u.id = m.user_id
`;

async function loadBoatLinksForMarinheiro(marinheiroId) {
  const r = await query(
    `select bm.boat_id, b.name
     from boat_marinheiros bm
     join boats b on b.id = bm.boat_id
     where bm.marinheiro_id = $1::uuid
     order by b.name`,
    [marinheiroId]
  );
  return {
    boatIds: r.rows.map((x) => x.boat_id),
    boatNames: r.rows.map((x) => x.name),
  };
}

async function assertLocadorOwnsMarinheiro(queryFn, locadorUserId, marinheiroId) {
  const r = await queryFn(
    `select 1 from marinheiro_locadores
     where marinheiro_id = $1::uuid and locador_user_id = $2::uuid
     limit 1`,
    [marinheiroId, locadorUserId]
  );
  if (!r.rows[0]) {
    const err = new Error("Marinheiro não vinculado a este locador.");
    err.code = "NOT_LINKED";
    throw err;
  }
}

async function assertLocadorOwnsBoats(queryFn, locadorUserId, boatIds) {
  if (!boatIds.length) return;
  const r = await queryFn(
    `select count(*)::int as n from boats
     where owner_user_id = $1::uuid and id = any($2::uuid[])`,
    [locadorUserId, boatIds]
  );
  if (Number(r.rows[0]?.n ?? 0) !== boatIds.length) {
    const err = new Error("Embarcação inválida para este locador.");
    err.code = "INVALID_BOAT";
    throw err;
  }
}

async function replaceBoatLinks(queryFn, marinheiroId, boatIds) {
  await queryFn(`delete from boat_marinheiros where marinheiro_id = $1::uuid`, [marinheiroId]);
  for (const boatId of boatIds) {
    await queryFn(
      `insert into boat_marinheiros (boat_id, marinheiro_id) values ($1::uuid, $2::uuid) on conflict do nothing`,
      [boatId, marinheiroId]
    );
  }
}

export async function listMarinheirosForLocador(locadorUserId) {
  const rows = await query(
    `${marinheiroBaseSelect}
     join marinheiro_locadores ml on ml.marinheiro_id = m.id
     where ml.locador_user_id = $1::uuid
     order by u.name asc`,
    [locadorUserId]
  );
  const out = [];
  for (const row of rows.rows) {
    const links = await loadBoatLinksForMarinheiro(row.id);
    out.push(mapMarinheiroRow(row, links));
  }
  return out;
}

export async function getMarinheiroForLocador(locadorUserId, marinheiroId) {
  const r = await query(
    `${marinheiroBaseSelect}
     join marinheiro_locadores ml on ml.marinheiro_id = m.id
     where ml.locador_user_id = $1::uuid and m.id = $2::uuid
     limit 1`,
    [locadorUserId, marinheiroId]
  );
  const row = r.rows[0];
  if (!row) return null;
  const links = await loadBoatLinksForMarinheiro(row.id);
  return mapMarinheiroRow(row, links);
}

export async function getMarinheiroProfileByUserId(userId) {
  const r = await query(`${marinheiroBaseSelect} where m.user_id = $1::uuid limit 1`, [userId]);
  const row = r.rows[0];
  if (!row) return null;
  const locadores = await query(
    `select locador_user_id from marinheiro_locadores where marinheiro_id = $1::uuid`,
    [row.id]
  );
  const links = await loadBoatLinksForMarinheiro(row.id);
  return mapMarinheiroRow(row, {
    ...links,
    locadorIds: locadores.rows.map((x) => x.locador_user_id),
  });
}

/**
 * Tripulação pública para detalhes do barco (RN-MAR-009).
 * @param {string} boatId
 * @param {string} ownerUserId
 */
export async function listPublicCrewForBoat(boatId, ownerUserId) {
  const r = await query(
    `select m.*, u.name as user_name, u.email as user_email
     from boat_marinheiros bm
     join marinheiros m on m.id = bm.marinheiro_id
     join users u on u.id = m.user_id
     join marinheiro_locadores ml on ml.marinheiro_id = m.id and ml.locador_user_id = $2::uuid
     where bm.boat_id = $1::uuid
       and m.approval_status = 'APROVADO'
       and m.show_on_boat_detail = true
     order by
       case m.funcao
         when 'CAPITAO' then 1
         when 'MESTRE' then 2
         when 'IMEDIATO' then 3
         when 'CONDUTOR' then 4
         when 'GUIA_NAUTICO' then 5
         when 'MARINHEIRO' then 6
         when 'TRIPULANTE' then 7
         else 8
       end,
       u.name asc
     limit 1`,
    [boatId, ownerUserId]
  );
  return r.rows.map((row) => {
    const mapped = mapMarinheiroRow(row);
    return {
      id: mapped.id,
      nome: mapped.nome,
      photoUrl: mapped.photoUrl,
      funcao: mapped.funcao,
      funcaoLabel: mapped.funcaoLabel,
      bio: mapped.bio,
      platformTenureMonths: mapped.platformTenureMonths,
      approvalStatus: mapped.approvalStatus,
    };
  });
}

export function buildMarinheiroSchemas(assetOrUrlSchema) {
  const createMarinheiroSchema = z
    .object({
      nome: z.string().min(2).max(100),
      email: z.string().email().max(200),
      password: z.string().min(6).max(200),
      cpf: cpfSchema,
      birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      phone: z.string().min(8).max(30),
      photoUrl: assetOrUrlSchema,
      funcao: z.enum(MARINHEIRO_FUNCOES),
      funcaoCustom: z.string().max(80).optional().nullable(),
      identityDocUrl: assetOrUrlSchema,
      identityDocExpiresAt: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .optional()
        .nullable(),
      nauticalCertUrl: assetOrUrlSchema,
      nauticalCertExpiresAt: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .optional()
        .nullable(),
      bio: z.string().max(500).optional().nullable(),
      showOnBoatDetail: z.boolean().optional(),
      boatIds: z.array(z.string().uuid()).max(50).default([]),
    })
    .superRefine((data, ctx) => {
      if (data.funcao === "OUTRA" && !data.funcaoCustom?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Informe a função personalizada.",
          path: ["funcaoCustom"],
        });
      }
    });

  const updateMarinheiroSchema = z
    .object({
      nome: z.string().min(2).max(100).optional(),
      phone: z.string().min(8).max(30).optional(),
      photoUrl: assetOrUrlSchema.optional(),
      funcao: z.enum(MARINHEIRO_FUNCOES).optional(),
      funcaoCustom: z.string().max(80).optional().nullable(),
      identityDocUrl: assetOrUrlSchema.optional(),
      identityDocExpiresAt: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .optional()
        .nullable(),
      nauticalCertUrl: assetOrUrlSchema.optional(),
      nauticalCertExpiresAt: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .optional()
        .nullable(),
      bio: z.string().max(500).optional().nullable(),
      showOnBoatDetail: z.boolean().optional(),
      boatIds: z.array(z.string().uuid()).max(50).optional(),
    })
    .superRefine((data, ctx) => {
      if (data.funcao === "OUTRA" && data.funcaoCustom !== undefined && !data.funcaoCustom?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Informe a função personalizada.",
          path: ["funcaoCustom"],
        });
      }
    });

  const assignBookingMarinheirosSchema = z.object({
    marinheiroIds: z.array(z.string().uuid()).max(10),
  });

  const assignBoatMarinheirosSchema = z.object({
    marinheiroIds: z.array(z.string().uuid()).max(1),
  });

  return { createMarinheiroSchema, updateMarinheiroSchema, assignBookingMarinheirosSchema, assignBoatMarinheirosSchema };
}

export async function createMarinheiroForLocador(locadorUserId, body) {
  const client = await pool.connect();
  try {
    await client.query("begin");
    const hash = await bcrypt.hash(body.password, 10);
    let userRow;
    try {
      const created = await client.query(
        `insert into users (name, email, password_hash, role)
         values ($1, $2, $3, 'marinheiro')
         returning id, name, email`,
        [body.nome, body.email, hash]
      );
      userRow = created.rows[0];
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      if (msg.includes("duplicate key")) {
        const err = new Error("Email já cadastrado.");
        err.code = "EMAIL_EXISTS";
        throw err;
      }
      throw e;
    }

    const cpf = normalizeCpf(body.cpf);
    const dupCpf = await client.query(`select id from marinheiros where cpf = $1 limit 1`, [cpf]);
    if (dupCpf.rows[0]) {
      const err = new Error("CPF já cadastrado para outro marinheiro.");
      err.code = "CPF_EXISTS";
      throw err;
    }

    await assertLocadorOwnsBoats(client.query.bind(client), locadorUserId, body.boatIds ?? []);

    const inserted = await client.query(
      `insert into marinheiros (
         user_id, cpf, birth_date, phone, photo_url, funcao, funcao_custom,
         identity_doc_url, identity_doc_expires_at, nautical_cert_url, nautical_cert_expires_at,
         bio, show_on_boat_detail, approval_status
       ) values (
         $1, $2, $3::date, $4, $5, $6::marinheiro_funcao, $7,
         $8, $9::date, $10, $11::date, $12, coalesce($13, true), 'PENDENTE'
       )
       returning id`,
      [
        userRow.id,
        cpf,
        body.birthDate,
        body.phone,
        body.photoUrl,
        body.funcao,
        body.funcao === "OUTRA" ? body.funcaoCustom?.trim() ?? null : null,
        body.identityDocUrl,
        body.identityDocExpiresAt ?? null,
        body.nauticalCertUrl,
        body.nauticalCertExpiresAt ?? null,
        body.bio ?? null,
        body.showOnBoatDetail ?? true,
      ]
    );
    const marinheiroId = inserted.rows[0].id;

    await client.query(
      `insert into marinheiro_locadores (marinheiro_id, locador_user_id) values ($1, $2)`,
      [marinheiroId, locadorUserId]
    );

    if (body.boatIds?.length) {
      await replaceBoatLinks(client.query.bind(client), marinheiroId, body.boatIds);
    }

    await client.query("commit");
    return getMarinheiroForLocador(locadorUserId, marinheiroId);
  } catch (e) {
    await client.query("rollback");
    throw e;
  } finally {
    client.release();
  }
}

export async function updateMarinheiroForLocador(locadorUserId, marinheiroId, body) {
  await assertLocadorOwnsMarinheiro(query, locadorUserId, marinheiroId);
  if (body.boatIds) {
    await assertLocadorOwnsBoats(query, locadorUserId, body.boatIds);
  }

  const current = await query(`select * from marinheiros where id = $1::uuid`, [marinheiroId]);
  const row = current.rows[0];
  if (!row) return null;

  const client = await pool.connect();
  try {
    await client.query("begin");

    if (body.nome) {
      await client.query(`update users set name = $1 where id = $2`, [body.nome, row.user_id]);
    }

    const fields = [];
    const values = [];
    let i = 1;

    const setField = (col, val, cast = "") => {
      if (val === undefined) return;
      fields.push(`${col} = $${i}${cast}`);
      values.push(val);
      i += 1;
    };

    setField("phone", body.phone);
    setField("photo_url", body.photoUrl);
    if (body.funcao !== undefined) {
      setField("funcao", body.funcao, "::marinheiro_funcao");
      setField("funcao_custom", body.funcao === "OUTRA" ? body.funcaoCustom?.trim() ?? null : null);
    } else if (body.funcaoCustom !== undefined) {
      setField("funcao_custom", body.funcaoCustom);
    }
    setField("identity_doc_url", body.identityDocUrl);
    setField("identity_doc_expires_at", body.identityDocExpiresAt ?? null, "::date");
    setField("nautical_cert_url", body.nauticalCertUrl);
    setField("nautical_cert_expires_at", body.nauticalCertExpiresAt ?? null, "::date");
    setField("bio", body.bio ?? null);
    if (body.showOnBoatDetail !== undefined) setField("show_on_boat_detail", body.showOnBoatDetail);

    const docsChanged =
      body.identityDocUrl !== undefined ||
      body.nauticalCertUrl !== undefined ||
      body.identityDocExpiresAt !== undefined ||
      body.nauticalCertExpiresAt !== undefined ||
      body.photoUrl !== undefined;

    if (docsChanged && row.approval_status !== "SUSPENSO") {
      fields.push(`approval_status = 'PENDENTE'`);
      fields.push(`review_notes = null`);
      fields.push(`reviewed_at = null`);
      fields.push(`reviewed_by_staff_id = null`);
    }

    if (fields.length) {
      fields.push(`updated_at = now()`);
      values.push(marinheiroId);
      await client.query(
        `update marinheiros set ${fields.join(", ")} where id = $${i}::uuid`,
        values
      );
    }

    if (body.boatIds) {
      await replaceBoatLinks(client.query.bind(client), marinheiroId, body.boatIds);
    }

    await client.query("commit");
  } catch (e) {
    await client.query("rollback");
    throw e;
  } finally {
    client.release();
  }

  return getMarinheiroForLocador(locadorUserId, marinheiroId);
}

export async function updateMarinheiroSelfProfile(userId, body) {
  const profile = await getMarinheiroProfileByUserId(userId);
  if (!profile) return null;

  const locadorId = profile.locadorIds[0];
  if (!locadorId) return null;

  return updateMarinheiroForLocador(locadorId, profile.id, {
    nome: body.nome,
    phone: body.phone,
    photoUrl: body.photoUrl,
    identityDocUrl: body.identityDocUrl,
    identityDocExpiresAt: body.identityDocExpiresAt,
    nauticalCertUrl: body.nauticalCertUrl,
    nauticalCertExpiresAt: body.nauticalCertExpiresAt,
    bio: body.bio,
  });
}

async function bookingDatesForConflict(bookingId) {
  const main = await query(
    `select booking_date::text as d from bookings where id = $1::uuid`,
    [bookingId]
  );
  const days = await query(
    `select trip_date::text as d from booking_days where booking_id = $1::uuid order by trip_date`,
    [bookingId]
  );
  const set = new Set();
  if (main.rows[0]?.d) set.add(main.rows[0].d);
  for (const d of days.rows) set.add(d.d);
  return [...set];
}

export async function assertMarinheirosAvailableForBooking(bookingId, marinheiroIds, excludeBookingId = null) {
  if (!marinheiroIds.length) return;

  const dates = await bookingDatesForConflict(bookingId);
  if (!dates.length) return;

  for (const marinheiroId of marinheiroIds) {
    const conflict = await query(
      `select bk.id, bk.booking_date::text as booking_date, b.name as boat_name
       from booking_marinheiros bm
       join bookings bk on bk.id = bm.booking_id
       join boats b on b.id = bk.boat_id
       where bm.marinheiro_id = $1::uuid
         and bk.status = any($2::booking_status[])
         and ($3::uuid is null or bk.id <> $3::uuid)
         and (
           bk.booking_date = any($4::date[])
           or exists (
             select 1 from booking_days bd
             where bd.booking_id = bk.id and bd.trip_date = any($4::date[])
           )
         )
       limit 1`,
      [marinheiroId, ACTIVE_BOOKING_STATUSES, excludeBookingId, dates]
    );
    if (conflict.rows[0]) {
      const c = conflict.rows[0];
      const err = new Error(
        `Marinheiro indisponível em ${c.booking_date} (reserva ${c.boat_name}).`
      );
      err.code = "SCHEDULE_CONFLICT";
      throw err;
    }
  }
}

export async function assignMarinheirosToBooking(ownerUserId, bookingId, marinheiroIds) {
  const booking = await query(
    `select bk.id, bk.owner_user_id, bk.status, bk.boat_id
     from bookings bk where bk.id = $1::uuid limit 1`,
    [bookingId]
  );
  const b = booking.rows[0];
  if (!b || b.owner_user_id !== ownerUserId) {
    const err = new Error("Reserva não encontrada.");
    err.code = "NOT_FOUND";
    throw err;
  }

  for (const marinheiroId of marinheiroIds) {
    await assertLocadorOwnsMarinheiro(query, ownerUserId, marinheiroId);
    const m = await query(
      `select approval_status from marinheiros where id = $1::uuid`,
      [marinheiroId]
    );
    if (m.rows[0]?.approval_status !== "APROVADO") {
      const err = new Error("Somente marinheiros aprovados podem ser designados.");
      err.code = "NOT_APPROVED";
      throw err;
    }
  }

  await assertMarinheirosAvailableForBooking(bookingId, marinheiroIds, bookingId);

  const client = await pool.connect();
  try {
    await client.query("begin");
    await client.query(`delete from booking_marinheiros where booking_id = $1::uuid`, [bookingId]);
    for (const marinheiroId of marinheiroIds) {
      await client.query(
        `insert into booking_marinheiros (booking_id, marinheiro_id, assigned_by_user_id)
         values ($1, $2, $3)`,
        [bookingId, marinheiroId, ownerUserId]
      );
    }
    await client.query("commit");
  } catch (e) {
    await client.query("rollback");
    throw e;
  } finally {
    client.release();
  }

  return listBookingMarinheiros(bookingId);
}

export async function listMarinheirosLinkedToBoat(ownerUserId, boatId) {
  const boat = await query(
    `select id from boats where id = $1::uuid and owner_user_id = $2::uuid limit 1`,
    [boatId, ownerUserId]
  );
  if (!boat.rows[0]) {
    const err = new Error("Embarcação não encontrada.");
    err.code = "NOT_FOUND";
    throw err;
  }

  const r = await query(
    `${marinheiroBaseSelect}
     join marinheiro_locadores ml on ml.marinheiro_id = m.id and ml.locador_user_id = $1::uuid
     join boat_marinheiros bm on bm.marinheiro_id = m.id and bm.boat_id = $2::uuid
     order by u.name asc`,
    [ownerUserId, boatId]
  );
  return r.rows.map((row) => mapMarinheiroRow(row));
}

/** Vincula tripulação à embarcação (substitui vínculos existentes deste barco). */
export async function assignMarinheirosToBoat(ownerUserId, boatId, marinheiroIds) {
  const boat = await query(
    `select id from boats where id = $1::uuid and owner_user_id = $2::uuid limit 1`,
    [boatId, ownerUserId]
  );
  if (!boat.rows[0]) {
    const err = new Error("Embarcação não encontrada.");
    err.code = "NOT_FOUND";
    throw err;
  }

  for (const marinheiroId of marinheiroIds) {
    await assertLocadorOwnsMarinheiro(query, ownerUserId, marinheiroId);
  }

  const client = await pool.connect();
  try {
    await client.query("begin");
    await client.query(`delete from boat_marinheiros where boat_id = $1::uuid`, [boatId]);
    for (const marinheiroId of marinheiroIds) {
      await client.query(
        `insert into boat_marinheiros (boat_id, marinheiro_id) values ($1::uuid, $2::uuid) on conflict do nothing`,
        [boatId, marinheiroId]
      );
    }
    await client.query("commit");
  } catch (e) {
    await client.query("rollback");
    throw e;
  } finally {
    client.release();
  }

  return listMarinheirosLinkedToBoat(ownerUserId, boatId);
}

export async function listBookingMarinheiros(bookingId) {
  const r = await query(
    `${marinheiroBaseSelect}
     join booking_marinheiros bm on bm.marinheiro_id = m.id
     where bm.booking_id = $1::uuid
     order by u.name`,
    [bookingId]
  );
  return r.rows.map((row) => mapMarinheiroRow(row));
}

export async function listMarinheiroBookings(userId) {
  const profile = await getMarinheiroProfileByUserId(userId);
  if (!profile) return [];

  const r = await query(
    `select bk.id, bk.status, bk.booking_date::text as booking_date,
            to_char(bk.embark_time, 'HH24:MI') as embark_time,
            bk.embark_location, bk.total_cents,
            b.id as boat_id, b.name as boat_name,
            u.name as renter_name
     from booking_marinheiros bm
     join bookings bk on bk.id = bm.booking_id
     join boats b on b.id = bk.boat_id
     join users u on u.id = bk.renter_user_id
     where bm.marinheiro_id = $1::uuid
       and bk.status = any($2::booking_status[])
     order by bk.booking_date asc, bk.embark_time asc nulls last`,
    [profile.id, ["PENDING", "ACCEPTED", "COMPLETED"]]
  );

  return r.rows.map((row) => ({
    id: row.id,
    status: row.status,
    bookingDate: row.booking_date,
    embarkTime: row.embark_time,
    embarkLocation: row.embark_location,
    totalCents: Number(row.total_cents ?? 0),
    boat: { id: row.boat_id, nome: row.boat_name },
    renter: { nome: row.renter_name },
  }));
}

export function installMarinheiroRoutes(app, { assetOrUrlSchema }) {
  const { createMarinheiroSchema, updateMarinheiroSchema, assignBookingMarinheirosSchema, assignBoatMarinheirosSchema } =
    buildMarinheiroSchemas(assetOrUrlSchema);

  app.get("/api/owner/marinheiros", requireAuth, requireRole("locatario"), async (req, res) => {
    try {
      const items = await listMarinheirosForLocador(req.user.sub);
      return res.json({ marinheiros: items });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro ao listar tripulação.";
      return res.status(500).send(msg);
    }
  });

  app.get("/api/owner/marinheiros/:id", requireAuth, requireRole("locatario"), async (req, res) => {
    try {
      const item = await getMarinheiroForLocador(req.user.sub, req.params.id);
      if (!item) return res.status(404).send("Marinheiro não encontrado.");
      return res.json({ marinheiro: item });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro ao carregar marinheiro.";
      return res.status(500).send(msg);
    }
  });

  app.post("/api/owner/marinheiros", requireAuth, requireRole("locatario"), async (req, res) => {
    try {
      const body = createMarinheiroSchema.parse(req.body);
      const item = await createMarinheiroForLocador(req.user.sub, body);
      return res.status(201).json({ marinheiro: item });
    } catch (e) {
      if (e instanceof z.ZodError) return res.status(400).send(e.errors[0]?.message ?? "Dados inválidos.");
      const code = e && typeof e === "object" && "code" in e ? e.code : null;
      if (code === "EMAIL_EXISTS" || code === "CPF_EXISTS") return res.status(409).send(e.message);
      const msg = e instanceof Error ? e.message : "Erro ao cadastrar marinheiro.";
      return res.status(400).send(msg);
    }
  });

  app.patch("/api/owner/marinheiros/:id", requireAuth, requireRole("locatario"), async (req, res) => {
    try {
      const body = updateMarinheiroSchema.parse(req.body);
      const item = await updateMarinheiroForLocador(req.user.sub, req.params.id, body);
      if (!item) return res.status(404).send("Marinheiro não encontrado.");
      return res.json({ marinheiro: item });
    } catch (e) {
      if (e instanceof z.ZodError) return res.status(400).send(e.errors[0]?.message ?? "Dados inválidos.");
      const msg = e instanceof Error ? e.message : "Erro ao atualizar marinheiro.";
      return res.status(400).send(msg);
    }
  });

  app.put(
    "/api/owner/bookings/:id/marinheiros",
    requireAuth,
    requireRole("locatario"),
    async (req, res) => {
      try {
        const body = assignBookingMarinheirosSchema.parse(req.body);
        const items = await assignMarinheirosToBooking(req.user.sub, req.params.id, body.marinheiroIds);
        return res.json({ marinheiros: items });
      } catch (e) {
        if (e instanceof z.ZodError) return res.status(400).send(e.errors[0]?.message ?? "Dados inválidos.");
        const code = e && typeof e === "object" && "code" in e ? e.code : null;
        if (code === "NOT_FOUND") return res.status(404).send(e.message);
        if (code === "NOT_APPROVED" || code === "SCHEDULE_CONFLICT" || code === "NOT_LINKED") {
          return res.status(409).send(e.message);
        }
        const msg = e instanceof Error ? e.message : "Erro ao designar marinheiros.";
        return res.status(400).send(msg);
      }
    }
  );

  app.get("/api/owner/bookings/:id/marinheiros", requireAuth, requireRole("locatario"), async (req, res) => {
    try {
      const booking = await query(
        `select owner_user_id from bookings where id = $1::uuid limit 1`,
        [req.params.id]
      );
      if (booking.rows[0]?.owner_user_id !== req.user.sub) {
        return res.status(404).send("Reserva não encontrada.");
      }
      const items = await listBookingMarinheiros(req.params.id);
      return res.json({ marinheiros: items });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro ao listar designações.";
      return res.status(500).send(msg);
    }
  });

  app.get("/api/owner/boats/:boatId/marinheiros", requireAuth, requireRole("locatario"), async (req, res) => {
    try {
      const items = await listMarinheirosLinkedToBoat(req.user.sub, req.params.boatId);
      return res.json({ marinheiros: items });
    } catch (e) {
      const code = e && typeof e === "object" && "code" in e ? e.code : null;
      if (code === "NOT_FOUND") return res.status(404).send(e.message);
      const msg = e instanceof Error ? e.message : "Erro ao listar tripulação.";
      return res.status(500).send(msg);
    }
  });

  app.put("/api/owner/boats/:boatId/marinheiros", requireAuth, requireRole("locatario"), async (req, res) => {
    try {
      const body = assignBoatMarinheirosSchema.parse(req.body);
      const items = await assignMarinheirosToBoat(req.user.sub, req.params.boatId, body.marinheiroIds);
      return res.json({ marinheiros: items });
    } catch (e) {
      if (e instanceof z.ZodError) return res.status(400).send(e.errors[0]?.message ?? "Dados inválidos.");
      const code = e && typeof e === "object" && "code" in e ? e.code : null;
      if (code === "NOT_FOUND") return res.status(404).send(e.message);
      if (code === "NOT_LINKED") return res.status(409).send(e.message);
      const msg = e instanceof Error ? e.message : "Erro ao vincular tripulação.";
      return res.status(400).send(msg);
    }
  });

  app.get("/api/marinheiro/me", requireAuth, requireRole("marinheiro"), async (req, res) => {
    try {
      const profile = await getMarinheiroProfileByUserId(req.user.sub);
      if (!profile) return res.status(404).send("Perfil não encontrado.");
      return res.json({ marinheiro: profile });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro ao carregar perfil.";
      return res.status(500).send(msg);
    }
  });

  app.patch("/api/marinheiro/me", requireAuth, requireRole("marinheiro"), async (req, res) => {
    try {
      const body = updateMarinheiroSchema
        .pick({
          nome: true,
          phone: true,
          photoUrl: true,
          identityDocUrl: true,
          identityDocExpiresAt: true,
          nauticalCertUrl: true,
          nauticalCertExpiresAt: true,
          bio: true,
        })
        .parse(req.body);
      const profile = await updateMarinheiroSelfProfile(req.user.sub, body);
      if (!profile) return res.status(404).send("Perfil não encontrado.");
      return res.json({ marinheiro: profile });
    } catch (e) {
      if (e instanceof z.ZodError) return res.status(400).send(e.errors[0]?.message ?? "Dados inválidos.");
      const msg = e instanceof Error ? e.message : "Erro ao atualizar perfil.";
      return res.status(400).send(msg);
    }
  });

  app.get("/api/marinheiro/bookings", requireAuth, requireRole("marinheiro"), async (req, res) => {
    try {
      const bookings = await listMarinheiroBookings(req.user.sub);
      return res.json({ bookings });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro ao listar reservas.";
      return res.status(500).send(msg);
    }
  });
}
