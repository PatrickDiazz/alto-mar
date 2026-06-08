/**
 * Inventário unitário de opcionais do locador + disponibilidade por dia na frota.
 */

const ACTIVE_BOOKING_STATUSES = ["ACCEPTED", "COMPLETED"];

export async function ensureOwnerOptionalsTables(query) {
  await query(`
    create table if not exists owner_optionals (
      id uuid primary key default gen_random_uuid(),
      owner_user_id uuid not null references users(id) on delete cascade,
      kind text not null check (kind in ('vehicle', 'bbq', 'other')),
      title text not null,
      description text not null default '',
      price_cents integer not null default 0,
      image_urls text[] not null default '{}'::text[],
      metadata jsonb not null default '{}'::jsonb,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  `);
  await query(`
    create table if not exists owner_optional_boats (
      optional_id uuid not null references owner_optionals(id) on delete cascade,
      boat_id uuid not null references boats(id) on delete cascade,
      primary key (optional_id, boat_id)
    )
  `);
  await query(`create index if not exists owner_optionals_owner_idx on owner_optionals (owner_user_id)`);
  await query(`create index if not exists owner_optional_boats_boat_idx on owner_optional_boats (boat_id)`);
}

function mapOptionalRow(row, boatIds, boatNames) {
  const meta = row.metadata && typeof row.metadata === "object" ? row.metadata : {};
  return {
    id: row.id,
    kind: row.kind,
    title: row.title,
    description: row.description ?? "",
    priceCents: Number(row.price_cents ?? 0),
    imageUrls: Array.isArray(row.image_urls) ? row.image_urls : [],
    boatIds,
    boatNames,
    vehicleDocumentUrl: meta.vehicleDocumentUrl ?? null,
    bbqKitItems: Array.isArray(meta.bbqKitItems) ? meta.bbqKitItems : [],
    quantity: 1,
  };
}

async function loadOwnerOptionalsWithBoats(query, ownerUserId) {
  const rows = await query(
    `select o.id, o.kind, o.title, o.description, o.price_cents, o.image_urls, o.metadata,
            coalesce(array_agg(ob.boat_id) filter (where ob.boat_id is not null), '{}') as boat_ids,
            coalesce(array_agg(b.name order by b.name) filter (where b.name is not null), '{}') as boat_names
     from owner_optionals o
     left join owner_optional_boats ob on ob.optional_id = o.id
     left join boats b on b.id = ob.boat_id
     where o.owner_user_id = $1::uuid
     group by o.id
     order by o.kind, o.title`,
    [ownerUserId]
  );
  return rows.rows.map((r) => mapOptionalRow(r, r.boat_ids ?? [], r.boat_names ?? []));
}

export async function listOwnerOptionals(query, ownerUserId, parseCustomOptionalsJson) {
  await migrateOwnerOptionalsFromBoatsIfEmpty(query, ownerUserId, parseCustomOptionalsJson);
  return loadOwnerOptionalsWithBoats(query, ownerUserId);
}

export async function getOwnerOptional(query, ownerUserId, optionalId) {
  const rows = await query(
    `select o.id, o.kind, o.title, o.description, o.price_cents, o.image_urls, o.metadata,
            coalesce(array_agg(ob.boat_id) filter (where ob.boat_id is not null), '{}') as boat_ids,
            coalesce(array_agg(b.name order by b.name) filter (where b.name is not null), '{}') as boat_names
     from owner_optionals o
     left join owner_optional_boats ob on ob.optional_id = o.id
     left join boats b on b.id = ob.boat_id
     where o.owner_user_id = $1::uuid and o.id = $2::uuid
     group by o.id`,
    [ownerUserId, optionalId]
  );
  const r = rows.rows[0];
  if (!r) return null;
  return mapOptionalRow(r, r.boat_ids ?? [], r.boat_names ?? []);
}

async function assertUniqueKindPerOwner(query, ownerUserId, kind, excludeId = null) {
  if (kind !== "vehicle" && kind !== "bbq") return;
  const existing = await query(
    `select id from owner_optionals
     where owner_user_id = $1::uuid and kind = $2
       and ($3::uuid is null or id <> $3::uuid)
     limit 1`,
    [ownerUserId, kind, excludeId]
  );
  if (existing.rows[0]) {
    const err = new Error(
      kind === "vehicle"
        ? "Já existe uma moto aquática no seu inventário. Edite a existente."
        : "Já existe um kit churrasco no seu inventário. Edite o existente."
    );
    err.code = "OPTIONAL_KIND_EXISTS";
    throw err;
  }
}

function buildMetadata(body) {
  const meta = {};
  if (body.kind === "vehicle" && body.vehicleDocumentUrl != null) {
    meta.vehicleDocumentUrl = body.vehicleDocumentUrl;
  }
  if (body.kind === "bbq" && Array.isArray(body.bbqKitItems)) {
    meta.bbqKitItems = body.bbqKitItems;
  }
  return meta;
}

async function replaceOptionalBoatLinks(query, optionalId, boatIds) {
  await query(`delete from owner_optional_boats where optional_id = $1::uuid`, [optionalId]);
  for (const boatId of boatIds) {
    await query(
      `insert into owner_optional_boats (optional_id, boat_id) values ($1::uuid, $2::uuid) on conflict do nothing`,
      [optionalId, boatId]
    );
  }
}

/**
 * Espelha o opcional nas colunas de cada embarcação (compatível com fluxo de reserva atual).
 */
export async function syncOwnerOptionalToBoats(query, ownerUserId, optional, boatIds, parseCustomOptionalsJson) {
  const boats = await query(
    `select id, name, location_text, price_cents, size_feet, capacity, type, description, verified,
            jet_ski_offered, jet_ski_price_cents, jet_ski_image_urls, jet_ski_document_url,
            bbq_offered, bbq_kit_items, bbq_kit_price_cents, custom_optionals
     from boats where owner_user_id = $1::uuid`,
    [ownerUserId]
  );
  const linked = new Set(boatIds);
  const entry = {
    id: optional.id,
    title: optional.title,
    description: optional.description,
    priceCents: optional.priceCents,
    imageUrls: optional.imageUrls,
  };

  for (const boat of boats.rows) {
    const custom = parseCustomOptionalsJson(boat.custom_optionals);
    let jetSkiOffered = Boolean(boat.jet_ski_offered);
    let jetSkiPriceCents = Number(boat.jet_ski_price_cents ?? 0);
    let jetSkiImageUrls = boat.jet_ski_image_urls ?? [];
    let jetSkiDocumentUrl = boat.jet_ski_document_url;
    let bbqOffered = boat.bbq_offered !== false;
    let bbqKitPriceCents = Number(boat.bbq_kit_price_cents ?? 25000);
    let bbqKitItems = boat.bbq_kit_items;
    let nextCustom = [...custom];

    if (optional.kind === "vehicle") {
      if (linked.has(boat.id)) {
        jetSkiOffered = true;
        jetSkiPriceCents = optional.priceCents;
        jetSkiImageUrls = optional.imageUrls;
        jetSkiDocumentUrl = optional.vehicleDocumentUrl ?? null;
      } else {
        jetSkiOffered = false;
        jetSkiPriceCents = 0;
        jetSkiImageUrls = [];
        jetSkiDocumentUrl = null;
      }
    } else if (optional.kind === "bbq") {
      if (linked.has(boat.id)) {
        bbqOffered = true;
        bbqKitPriceCents = optional.priceCents;
        bbqKitItems = optional.bbqKitItems?.length ? optional.bbqKitItems : bbqKitItems;
      } else {
        bbqOffered = false;
      }
    } else if (optional.kind === "other") {
      nextCustom = nextCustom.filter((c) => c.id !== optional.id);
      if (linked.has(boat.id)) {
        const idx = nextCustom.findIndex((c) => c.id === optional.id);
        if (idx >= 0) nextCustom[idx] = entry;
        else nextCustom.push(entry);
      }
    }

    await query(
      `update boats set
         jet_ski_offered = $2,
         jet_ski_price_cents = $3,
         jet_ski_image_urls = $4::text[],
         jet_ski_document_url = $5,
         bbq_offered = $6,
         bbq_kit_price_cents = $7,
         bbq_kit_items = coalesce($8::jsonb, bbq_kit_items),
         custom_optionals = $9::jsonb
       where id = $1::uuid and owner_user_id = $10::uuid`,
      [
        boat.id,
        jetSkiOffered,
        jetSkiPriceCents,
        jetSkiImageUrls,
        jetSkiDocumentUrl,
        bbqOffered,
        bbqKitPriceCents,
        optional.kind === "bbq" && linked.has(boat.id) ? JSON.stringify(optional.bbqKitItems ?? []) : null,
        JSON.stringify(nextCustom),
        ownerUserId,
      ]
    );
  }
}

export async function createOwnerOptional(query, ownerUserId, body, parseCustomOptionalsJson) {
  await assertUniqueKindPerOwner(query, ownerUserId, body.kind);
  const meta = buildMetadata(body);
  const created = await query(
    `insert into owner_optionals (owner_user_id, kind, title, description, price_cents, image_urls, metadata)
     values ($1::uuid, $2, $3, $4, $5, $6::text[], $7::jsonb)
     returning id`,
    [
      ownerUserId,
      body.kind,
      body.title,
      body.description ?? "",
      body.priceCents,
      body.imageUrls ?? [],
      JSON.stringify(meta),
    ]
  );
  const id = created.rows[0].id;
  const boatIds = body.boatIds ?? [];
  await replaceOptionalBoatLinks(query, id, boatIds);
  const optional = await getOwnerOptional(query, ownerUserId, id);
  await syncOwnerOptionalToBoats(query, ownerUserId, optional, boatIds, parseCustomOptionalsJson);
  return optional;
}

export async function updateOwnerOptional(query, ownerUserId, optionalId, body, parseCustomOptionalsJson) {
  const existing = await getOwnerOptional(query, ownerUserId, optionalId);
  if (!existing) return null;
  const kind = body.kind ?? existing.kind;
  await assertUniqueKindPerOwner(query, ownerUserId, kind, optionalId);
  const meta = buildMetadata({ ...existing, ...body, kind });
  await query(
    `update owner_optionals set
       title = $3, description = $4, price_cents = $5, image_urls = $6::text[], metadata = $7::jsonb, updated_at = now()
     where id = $1::uuid and owner_user_id = $2::uuid`,
    [
      optionalId,
      ownerUserId,
      body.title ?? existing.title,
      body.description ?? existing.description,
      body.priceCents ?? existing.priceCents,
      body.imageUrls ?? existing.imageUrls,
      JSON.stringify(meta),
    ]
  );
  const boatIds = body.boatIds ?? existing.boatIds;
  await replaceOptionalBoatLinks(query, optionalId, boatIds);
  const optional = await getOwnerOptional(query, ownerUserId, optionalId);
  await syncOwnerOptionalToBoats(query, ownerUserId, optional, boatIds, parseCustomOptionalsJson);
  return optional;
}

export async function deleteOwnerOptional(query, ownerUserId, optionalId, parseCustomOptionalsJson) {
  const existing = await getOwnerOptional(query, ownerUserId, optionalId);
  if (!existing) return false;
  await query(`delete from owner_optionals where id = $1::uuid and owner_user_id = $2::uuid`, [
    optionalId,
    ownerUserId,
  ]);
  await syncOwnerOptionalToBoats(query, ownerUserId, { ...existing, boatIds: [] }, [], parseCustomOptionalsJson);
  return true;
}

function resolveSelectionsForDay(optionals, boatId, day, bodyFallback) {
  const jet = Boolean(day.jetSki ?? bodyFallback?.jetSki);
  const bbq = Boolean(day.bbqKit ?? bodyFallback?.bbqKit);
  const customIds = day.customOptionalIds ?? bodyFallback?.customOptionalIds ?? [];
  const selected = [];
  if (jet) {
    const v = optionals.find((o) => o.kind === "vehicle" && o.boatIds.includes(boatId));
    if (v) selected.push(v);
  }
  if (bbq) {
    const b = optionals.find((o) => o.kind === "bbq" && o.boatIds.includes(boatId));
    if (b) selected.push(b);
  }
  for (const cid of customIds) {
    const o = optionals.find((x) => x.id === cid && x.kind === "other" && x.boatIds.includes(boatId));
    if (o) selected.push(o);
  }
  return selected;
}

async function findOptionalConflict(query, ownerUserId, optional, dayDate, excludeBookingId) {
  if (!optional.boatIds?.length) return null;
  const params = [ownerUserId, dayDate, ACTIVE_BOOKING_STATUSES, excludeBookingId, optional.boatIds];
  let usageClause = "";
  if (optional.kind === "vehicle") {
    usageClause = "bd.jet_ski_selected = true";
  } else if (optional.kind === "bbq") {
    usageClause = "bd.bbq_kit = true";
  } else {
    usageClause = `$6::uuid = any(bd.custom_optional_ids)`;
    params.push(optional.id);
  }
  const sql = `
    select bk.id, b.name as boat_name, bd.day_date::text as day_date
    from booking_days bd
    join bookings bk on bk.id = bd.booking_id
    join boats b on b.id = bk.boat_id
    where bk.owner_user_id = $1::uuid
      and bd.day_date = $2::date
      and bk.status::text = any($3::text[])
      and ($4::uuid is null or bk.id <> $4::uuid)
      and bk.boat_id = any($5::uuid[])
      and ${usageClause}
    limit 1`;
  const r = await query(sql, params);
  return r.rows[0] ?? null;
}

export async function assertOwnerOptionalsAvailable({
  query,
  ownerUserId,
  boatId,
  tripDays,
  bodyFallback,
  excludeBookingId,
}) {
  const optionals = await loadOwnerOptionalsWithBoats(query, ownerUserId);
  if (!optionals.length) return;

  for (const day of tripDays) {
    const selected = resolveSelectionsForDay(optionals, boatId, day, bodyFallback);
    for (const opt of selected) {
      const conflict = await findOptionalConflict(
        query,
        ownerUserId,
        opt,
        day.bookingDate,
        excludeBookingId ?? null
      );
      if (conflict) {
        const err = new Error(
          `O opcional "${opt.title}" já está em uso no dia ${day.bookingDate}` +
            (conflict.boat_name ? ` (embarcação ${conflict.boat_name}).` : ".") +
            " Escolha outra data ou remova o opcional."
        );
        err.code = "OPTIONAL_UNAVAILABLE";
        throw err;
      }
    }
  }
}

export async function getBoatOptionalAvailability(query, boatId, dates, parseCustomOptionalsJson) {
  const boat = await query(
    `select id, owner_user_id, jet_ski_offered, coalesce(bbq_offered, true) as bbq_offered, custom_optionals
     from boats where id = $1::uuid`,
    [boatId]
  );
  const b = boat.rows[0];
  if (!b) return null;

  const optionals = await loadOwnerOptionalsWithBoats(query, b.owner_user_id);
  const catalogCustom = parseCustomOptionalsJson(b.custom_optionals);
  const byDate = {};

  for (const date of dates) {
    const jetOpt = optionals.find((o) => o.kind === "vehicle" && o.boatIds.includes(boatId));
    const bbqOpt = optionals.find((o) => o.kind === "bbq" && o.boatIds.includes(boatId));
    let jetSki = Boolean(b.jet_ski_offered);
    let bbq = b.bbq_offered !== false;
    if (jetOpt) {
      const c = await findOptionalConflict(query, b.owner_user_id, jetOpt, date, null);
      if (c) jetSki = false;
    }
    if (bbqOpt) {
      const c = await findOptionalConflict(query, b.owner_user_id, bbqOpt, date, null);
      if (c) bbq = false;
    }
    const custom = {};
    for (const c of catalogCustom) {
      const opt = optionals.find((o) => o.id === c.id && o.kind === "other");
      if (opt && opt.boatIds.includes(boatId)) {
        const conflict = await findOptionalConflict(query, b.owner_user_id, opt, date, null);
        custom[c.id] = !conflict;
      } else {
        custom[c.id] = true;
      }
    }
    byDate[date] = { jetSki, bbq, custom };
  }
  return { boatId, byDate };
}

export async function migrateOwnerOptionalsFromBoatsIfEmpty(query, ownerUserId, parseCustomOptionalsJson) {
  const count = await query(`select count(*)::int as n from owner_optionals where owner_user_id = $1::uuid`, [
    ownerUserId,
  ]);
  if (Number(count.rows[0]?.n ?? 0) > 0) return;

  const boats = await query(
    `select id, name, jet_ski_offered, jet_ski_price_cents, jet_ski_image_urls, jet_ski_document_url,
            coalesce(bbq_offered, true) as bbq_offered, bbq_kit_price_cents, bbq_kit_items, custom_optionals
     from boats where owner_user_id = $1::uuid`,
    [ownerUserId]
  );
  if (!boats.rows.length) return;

  const jetBoats = boats.rows.filter((b) => b.jet_ski_offered);
  if (jetBoats.length) {
    const ref = jetBoats[0];
    const ins = await query(
      `insert into owner_optionals (owner_user_id, kind, title, description, price_cents, image_urls, metadata)
       values ($1::uuid, 'vehicle', $2, $3, $4, $5::text[], $6::jsonb) returning id`,
      [
        ownerUserId,
        "Moto aquática",
        "Adrenalina e diversão nas suas mãos",
        Number(ref.jet_ski_price_cents ?? 0),
        ref.jet_ski_image_urls ?? [],
        JSON.stringify({ vehicleDocumentUrl: ref.jet_ski_document_url ?? null }),
      ]
    );
    const optId = ins.rows[0].id;
    for (const b of jetBoats) {
      await query(`insert into owner_optional_boats (optional_id, boat_id) values ($1, $2) on conflict do nothing`, [
        optId,
        b.id,
      ]);
    }
  }

  const bbqBoats = boats.rows.filter((b) => b.bbq_offered !== false);
  if (bbqBoats.length) {
    const ref = bbqBoats[0];
    const ins = await query(
      `insert into owner_optionals (owner_user_id, kind, title, description, price_cents, image_urls, metadata)
       values ($1::uuid, 'bbq', $2, $3, $4, '{}'::text[], $5::jsonb) returning id`,
      [
        ownerUserId,
        "Kit churrasco",
        "Tudo que você precisa para um dia perfeito",
        Number(ref.bbq_kit_price_cents ?? 25000),
        JSON.stringify({ bbqKitItems: ref.bbq_kit_items ?? [] }),
      ]
    );
    const optId = ins.rows[0].id;
    for (const b of bbqBoats) {
      await query(`insert into owner_optional_boats (optional_id, boat_id) values ($1, $2) on conflict do nothing`, [
        optId,
        b.id,
      ]);
    }
  }

  const customById = new Map();
  for (const b of boats.rows) {
    const list = parseCustomOptionalsJson(b.custom_optionals);
    for (const c of list) {
      if (!c.id || !c.title?.trim()) continue;
      if (!customById.has(c.id)) {
        customById.set(c.id, { ...c, boatIds: [b.id] });
      } else {
        const prev = customById.get(c.id);
        if (!prev.boatIds.includes(b.id)) prev.boatIds.push(b.id);
      }
    }
  }
  for (const [, c] of customById) {
    const ins = await query(
      `insert into owner_optionals (id, owner_user_id, kind, title, description, price_cents, image_urls, metadata)
       values ($1::uuid, $2::uuid, 'other', $3, $4, $5, $6::text[], '{}'::jsonb)
       on conflict (id) do nothing
       returning id`,
      [
        c.id,
        ownerUserId,
        c.title,
        c.description ?? "",
        c.priceCents ?? 0,
        c.imageUrls ?? [],
      ]
    );
    const optId = ins.rows[0]?.id ?? c.id;
    for (const boatId of c.boatIds) {
      await query(`insert into owner_optional_boats (optional_id, boat_id) values ($1, $2) on conflict do nothing`, [
        optId,
        boatId,
      ]);
    }
  }
}
