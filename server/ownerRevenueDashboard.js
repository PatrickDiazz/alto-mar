import { query } from "./db.js";
import { splitPlatformOwnerNet } from "./stripe/fees.js";

const PRESETS = new Set([
  "today",
  "last7",
  "last30",
  "thisMonth",
  "last3months",
  "last6months",
  "last12months",
  "custom",
]);

const DEFAULT_BBQ_KIT_PRICE_CENTS = 250 * 100;

/**
 * @param {import("express").Request["query"]} query
 */
export function resolveOwnerRevenuePeriod(query) {
  const preset = PRESETS.has(String(query?.preset)) ? String(query.preset) : "last30";
  let from = typeof query?.from === "string" ? query.from : null;
  let to = typeof query?.to === "string" ? query.to : null;

  if (preset !== "custom") {
    const bounds = presetBoundsForPreset(preset);
    return { preset, from: bounds.from, to: bounds.to };
  }

  if (!isYmd(from) || !isYmd(to)) {
    throw new Error("Período personalizado inválido.");
  }
  if (from > to) {
    throw new Error("Data inicial deve ser anterior à final.");
  }
  return { preset, from, to };
}

function isYmd(s) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(s));
}

function presetBoundsForPreset(preset) {
  const map = {
    today: { from: "current_date", to: "current_date" },
    last7: { from: "(current_date - interval '6 days')::date", to: "current_date" },
    last30: { from: "(current_date - interval '29 days')::date", to: "current_date" },
    thisMonth: { from: "date_trunc('month', current_date)::date", to: "current_date" },
    last3months: {
      from: "date_trunc('month', current_date - interval '2 months')::date",
      to: "current_date",
    },
    last6months: {
      from: "date_trunc('month', current_date - interval '5 months')::date",
      to: "current_date",
    },
    last12months: {
      from: "date_trunc('month', current_date - interval '11 months')::date",
      to: "current_date",
    },
  };
  return map[preset] ?? map.last30;
}

function parseCustomOptionalsCatalog(catalogJson) {
  try {
    const catalog = typeof catalogJson === "string" ? JSON.parse(catalogJson) : catalogJson ?? [];
    return Array.isArray(catalog) ? catalog : [];
  } catch {
    return [];
  }
}

function customOptionalsTotalCents(ids, catalogJson) {
  const catalog = parseCustomOptionalsCatalog(catalogJson);
  if (!Array.isArray(ids) || !ids.length) return 0;
  const byId = new Map(catalog.map((o) => [o.id, o]));
  return ids.reduce((sum, id) => sum + Math.max(0, Number(byId.get(id)?.priceCents ?? 0)), 0);
}

/**
 * @param {Map<string, string>} ownerOptionalNames
 * @param {Record<string, unknown>} row
 */
function collectOptionalItems(row, ownerOptionalNames) {
  const catalog = parseCustomOptionalsCatalog(row.custom_optionals);
  const byId = new Map(catalog.map((o) => [String(o.id), o]));
  const items = [];

  if (row.bbq_kit && row.bbq_offered !== false) {
    const cents = Math.max(0, Number(row.bbq_kit_price_cents ?? DEFAULT_BBQ_KIT_PRICE_CENTS));
    items.push({
      key: "bbq_kit",
      name: ownerOptionalNames.get("bbq_kit") || "Kit churrasco",
      amountCents: cents,
    });
  }
  if (row.jet_ski_selected && row.jet_ski_offered) {
    const cents = Math.max(0, Number(row.jet_ski_price_cents ?? 0));
    if (cents > 0) {
      items.push({
        key: "jet_ski",
        name: ownerOptionalNames.get("jet_ski") || "Moto aquática",
        amountCents: cents,
      });
    }
  }

  const customIds = Array.isArray(row.custom_optional_ids) ? row.custom_optional_ids : [];
  for (const rawId of customIds) {
    const id = String(rawId);
    const fromCatalog = byId.get(id);
    const cents = Math.max(0, Number(fromCatalog?.priceCents ?? 0));
    if (cents <= 0) continue;
    items.push({
      key: id,
      name:
        ownerOptionalNames.get(id) ||
        String(fromCatalog?.label || fromCatalog?.name || "Opcional"),
      amountCents: cents,
    });
  }

  return items;
}

/**
 * @param {Record<string, unknown>[]} rows
 * @param {Map<string, string>} ownerOptionalNames
 */
function buildRevenueBySource(rows, ownerOptionalNames) {
  let boatsCents = 0;
  let optionalsCents = 0;
  let boatTrips = 0;
  let optionalRequests = 0;
  const byBoat = new Map();
  const byOptional = new Map();

  for (const row of rows) {
    const c = categorizeBookingLine(row);
    const boatId = String(row.boat_id);
    const boatName = String(row.boat_name || "Embarcação");
    const boatShare = c.rental + c.other;

    boatsCents += boatShare;
    boatTrips += 1;

    const boatEntry = byBoat.get(boatId) || {
      id: boatId,
      name: boatName,
      amountCents: 0,
      tripCount: 0,
    };
    boatEntry.amountCents += boatShare;
    boatEntry.tripCount += 1;
    byBoat.set(boatId, boatEntry);

    for (const item of collectOptionalItems(row, ownerOptionalNames)) {
      optionalsCents += item.amountCents;
      optionalRequests += 1;
      const opt = byOptional.get(item.key) || {
        id: item.key,
        name: item.name,
        amountCents: 0,
        requestCount: 0,
      };
      opt.amountCents += item.amountCents;
      opt.requestCount += 1;
      byOptional.set(item.key, opt);
    }
  }

  const segmentTotal = boatsCents + optionalsCents;
  const pctOf = (part, whole) => (whole > 0 ? Math.round((part / whole) * 100) : 0);

  const segments = [
    {
      id: "boats",
      amountCents: boatsCents,
      transactionCount: boatTrips,
      pct: pctOf(boatsCents, segmentTotal),
    },
    {
      id: "optionals",
      amountCents: optionalsCents,
      transactionCount: optionalRequests,
      pct: pctOf(optionalsCents, segmentTotal),
    },
  ].filter((s) => s.amountCents > 0);

  const boats = [...byBoat.values()]
    .sort((a, b) => b.amountCents - a.amountCents)
    .map((b) => ({
      ...b,
      pct: pctOf(b.amountCents, boatsCents),
    }));

  const optionals = [...byOptional.values()]
    .sort((a, b) => b.amountCents - a.amountCents)
    .map((o) => ({
      ...o,
      pct: pctOf(o.amountCents, optionalsCents),
    }));

  return { segments, boats, optionals };
}

/**
 * @param {Record<string, unknown>} row
 */
function categorizeBookingLine(row) {
  const lineTotal = Math.max(0, Number(row.line_total_cents ?? 0));
  const rental = Math.max(0, Number(row.price_cents ?? 0));
  let extras = 0;
  if (row.bbq_kit && row.bbq_offered !== false) {
    extras += Math.max(0, Number(row.bbq_kit_price_cents ?? DEFAULT_BBQ_KIT_PRICE_CENTS));
  }
  if (row.jet_ski_selected && row.jet_ski_offered) {
    extras += Math.max(0, Number(row.jet_ski_price_cents ?? 0));
  }
  const customIds = Array.isArray(row.custom_optional_ids) ? row.custom_optional_ids : [];
  extras += customOptionalsTotalCents(customIds, row.custom_optionals);

  const cleaning = 0;
  const fuel = 0;
  const computed = rental + extras + cleaning + fuel;
  const other = Math.max(0, lineTotal - computed);

  const bookingTotal = Math.max(1, Number(row.booking_total_cents ?? lineTotal));
  const bookingFee =
    row.platform_fee_cents != null
      ? Number(row.platform_fee_cents)
      : splitPlatformOwnerNet(bookingTotal).platformFeeCents;
  const platformFee = Math.round((bookingFee * lineTotal) / bookingTotal);

  return {
    lineTotal,
    rental,
    extras,
    cleaning,
    fuel,
    other,
    platformFee,
    net: lineTotal - platformFee,
  };
}

function deltaPct(current, previous) {
  if (previous > 0) return Math.round(((current - previous) / previous) * 100);
  if (current > 0) return 100;
  return 0;
}

/**
 * @param {string} ownerUserId
 * @param {{ preset: string; from: string; to: string }} period
 */
export async function buildOwnerRevenueDashboard(ownerUserId, period) {
  const boundsRes = await query(
    `select
       to_char((${period.from})::date, 'YYYY-MM-DD') as period_from,
       to_char((${period.to})::date, 'YYYY-MM-DD') as period_to`,
    []
  );
  const from = boundsRes.rows[0]?.period_from;
  const to = boundsRes.rows[0]?.period_to;
  if (!from || !to) throw new Error("Período inválido.");

  const spanRes = await query(`select ($2::date - $1::date + 1)::int as days`, [from, to]);
  const spanDays = Number(spanRes.rows[0]?.days ?? 1);
  const prevToRes = await query(
    `select to_char(($1::date - interval '1 day')::date, 'YYYY-MM-DD') as d`,
    [from]
  );
  const prevTo = prevToRes.rows[0]?.d;
  const prevFromRes = await query(
    `select to_char(($1::date - ($2::int - 1) * interval '1 day')::date, 'YYYY-MM-DD') as d`,
    [prevTo, spanDays]
  );
  const prevFrom = prevFromRes.rows[0]?.d;

  const ownerOptRes = await query(
    `select id::text as id, title, kind from owner_optionals where owner_user_id = $1::uuid`,
    [ownerUserId]
  );
  const ownerOptionalNames = new Map(
    ownerOptRes.rows.map((r) => [String(r.id), String(r.title)])
  );
  for (const r of ownerOptRes.rows) {
    if (r.kind === "bbq" && !ownerOptionalNames.has("bbq_kit")) {
      ownerOptionalNames.set("bbq_kit", String(r.title));
    }
    if (r.kind === "vehicle" && !ownerOptionalNames.has("jet_ski")) {
      ownerOptionalNames.set("jet_ski", String(r.title));
    }
  }
  ownerOptionalNames.set("bbq_kit", ownerOptionalNames.get("bbq_kit") || "Kit churrasco");
  ownerOptionalNames.set("jet_ski", ownerOptionalNames.get("jet_ski") || "Moto aquática");

  const linesRes = await query(
    `select
       bk.id as booking_id,
       b.id as boat_id,
       b.name as boat_name,
       bk.total_cents as booking_total_cents,
       bk.platform_fee_cents,
       to_char(coalesce(bd.day_date, bk.booking_date), 'YYYY-MM-DD') as rev_date,
       coalesce(bd.total_cents, bk.total_cents)::int as line_total_cents,
       coalesce(bd.bbq_kit, bk.bbq_kit) as bbq_kit,
       coalesce(bd.jet_ski_selected, bk.jet_ski_selected) as jet_ski_selected,
       coalesce(bd.custom_optional_ids, bk.custom_optional_ids) as custom_optional_ids,
       b.price_cents,
       coalesce(b.bbq_kit_price_cents, 25000) as bbq_kit_price_cents,
       coalesce(b.bbq_offered, true) as bbq_offered,
       b.jet_ski_offered,
       b.jet_ski_price_cents,
       b.custom_optionals
     from bookings bk
     join boats b on b.id = bk.boat_id
     left join booking_days bd on bd.booking_id = bk.id and bd.status = 'ACTIVE'
     where bk.owner_user_id = $1::uuid
       and bk.status = 'COMPLETED'
       and coalesce(bd.day_date, bk.booking_date) >= $2::date
       and coalesce(bd.day_date, bk.booking_date) <= $3::date`,
    [ownerUserId, from, to]
  );

  const prevLinesRes = await query(
    `select
       bk.id as booking_id,
       b.id as boat_id,
       b.name as boat_name,
       bk.total_cents as booking_total_cents,
       bk.platform_fee_cents,
       coalesce(bd.total_cents, bk.total_cents)::int as line_total_cents,
       coalesce(bd.bbq_kit, bk.bbq_kit) as bbq_kit,
       coalesce(bd.jet_ski_selected, bk.jet_ski_selected) as jet_ski_selected,
       to_char(coalesce(bd.day_date, bk.booking_date), 'YYYY-MM-DD') as rev_date,
       coalesce(bd.custom_optional_ids, bk.custom_optional_ids) as custom_optional_ids,
       b.price_cents,
       coalesce(b.bbq_kit_price_cents, 25000) as bbq_kit_price_cents,
       coalesce(b.bbq_offered, true) as bbq_offered,
       b.jet_ski_offered,
       b.jet_ski_price_cents,
       b.custom_optionals
     from bookings bk
     join boats b on b.id = bk.boat_id
     left join booking_days bd on bd.booking_id = bk.id and bd.status = 'ACTIVE'
     where bk.owner_user_id = $1::uuid
       and bk.status = 'COMPLETED'
       and coalesce(bd.day_date, bk.booking_date) >= $2::date
       and coalesce(bd.day_date, bk.booking_date) <= $3::date`,
    [ownerUserId, prevFrom, prevTo]
  );

  function aggregateLines(rows) {
    const cats = {
      boat_rental: { amountCents: 0, transactionCount: 0 },
      cleaning: { amountCents: 0, transactionCount: 0 },
      fuel: { amountCents: 0, transactionCount: 0 },
      extras: { amountCents: 0, transactionCount: 0 },
      admin_fees: { amountCents: 0, transactionCount: 0 },
      other: { amountCents: 0, transactionCount: 0 },
    };
    let grossCents = 0;
    let platformFeesCents = 0;
    let netCents = 0;
    const bookingIds = new Set();
    const reservedDays = new Set();

    for (const row of rows) {
      const c = categorizeBookingLine(row);
      grossCents += c.lineTotal;
      platformFeesCents += c.platformFee;
      netCents += c.net;
      bookingIds.add(row.booking_id);
      if (row.rev_date) reservedDays.add(`${row.booking_id}|${row.rev_date}`);

      if (c.rental > 0) {
        cats.boat_rental.amountCents += c.rental;
        cats.boat_rental.transactionCount += 1;
      }
      if (c.extras > 0) {
        cats.extras.amountCents += c.extras;
        cats.extras.transactionCount += 1;
      }
      if (c.cleaning > 0) {
        cats.cleaning.amountCents += c.cleaning;
        cats.cleaning.transactionCount += 1;
      }
      if (c.fuel > 0) {
        cats.fuel.amountCents += c.fuel;
        cats.fuel.transactionCount += 1;
      }
      if (c.other > 0) {
        cats.other.amountCents += c.other;
        cats.other.transactionCount += 1;
      }
    }

    return {
      grossCents,
      platformFeesCents,
      netCents,
      discountsCents: 0,
      completedBookings: bookingIds.size,
      reservedDayCount: reservedDays.size,
      categories: cats,
    };
  }

  const current = aggregateLines(linesRes.rows);
  const previous = aggregateLines(prevLinesRes.rows);

  const boatsRes = await query(`select count(*)::int as n from boats where owner_user_id = $1`, [
    ownerUserId,
  ]);
  const boatCount = Math.max(1, Number(boatsRes.rows[0]?.n ?? 0));

  const occRes = await query(
    `with owner_boats as (
       select id from boats where owner_user_id = $1::uuid
     ),
     days as (
       select generate_series($2::date, $3::date, interval '1 day')::date as d
     ),
     boat_days as (
       select ob.id as boat_id, d.d
       from owner_boats ob
       cross join days d
     ),
     weekday_locks as (
       select boat_id, weekday from boat_weekday_locks where boat_id in (select id from owner_boats)
     ),
     date_locks as (
       select boat_id, locked_date from boat_date_locks
       where boat_id in (select id from owner_boats)
         and locked_date >= $2::date and locked_date <= $3::date
     )
     select
       count(*)::int as available_days
     from boat_days bd
     left join weekday_locks wl on wl.boat_id = bd.boat_id and wl.weekday = extract(dow from bd.d)::int
     left join date_locks dl on dl.boat_id = bd.boat_id and dl.locked_date = bd.d
     where wl.boat_id is null and dl.boat_id is null`,
    [ownerUserId, from, to]
  );
  const availableDays = Math.max(1, Number(occRes.rows[0]?.available_days ?? 1));
  const occupancyPct = Math.round((current.reservedDayCount / availableDays) * 100);

  const prevOccRes = await query(
    `with owner_boats as (select id from boats where owner_user_id = $1::uuid),
     days as (select generate_series($2::date, $3::date, interval '1 day')::date as d),
     boat_days as (select ob.id as boat_id, d.d from owner_boats ob cross join days d),
     weekday_locks as (select boat_id, weekday from boat_weekday_locks where boat_id in (select id from owner_boats)),
     date_locks as (
       select boat_id, locked_date from boat_date_locks
       where boat_id in (select id from owner_boats) and locked_date >= $2::date and locked_date <= $3::date
     )
     select count(*)::int as available_days from boat_days bd
     left join weekday_locks wl on wl.boat_id = bd.boat_id and wl.weekday = extract(dow from bd.d)::int
     left join date_locks dl on dl.boat_id = bd.boat_id and dl.locked_date = bd.d
     where wl.boat_id is null and dl.boat_id is null`,
    [ownerUserId, prevFrom, prevTo]
  );
  const prevAvailable = Math.max(1, Number(prevOccRes.rows[0]?.available_days ?? 1));
  const prevOccupancyPct = Math.round((previous.reservedDayCount / prevAvailable) * 100);

  const extrasRes = await query(
    `select
       coalesce(sum(bk.total_cents) filter (where bk.status = 'ACCEPTED'), 0)::bigint as pending_receive_cents,
       count(*) filter (where bk.status = 'CANCELLED' and bk.booking_date >= $2::date and bk.booking_date <= $3::date)::int as cancellations
     from bookings bk
     where bk.owner_user_id = $1`,
    [ownerUserId, from, to]
  );
  const ext = extrasRes.rows[0] || {};

  const chartGranularity = spanDays <= 45 ? "day" : "month";
  let chartPoints = [];

  if (chartGranularity === "day") {
    const dayAgg = await query(
      `select
         to_char(coalesce(bd.day_date, bk.booking_date), 'YYYY-MM-DD') as point_key,
         coalesce(sum(coalesce(bd.total_cents, bk.total_cents)), 0)::bigint as amount_cents
       from bookings bk
       left join booking_days bd on bd.booking_id = bk.id and bd.status = 'ACTIVE'
       where bk.owner_user_id = $1
         and bk.status = 'COMPLETED'
         and coalesce(bd.day_date, bk.booking_date) >= $2::date
         and coalesce(bd.day_date, bk.booking_date) <= $3::date
       group by 1
       order by 1`,
      [ownerUserId, from, to]
    );
    const byDay = new Map(dayAgg.rows.map((r) => [r.point_key, Number(r.amount_cents)]));
    const cur = new Date(`${from}T12:00:00`);
    const end = new Date(`${to}T12:00:00`);
    while (cur <= end) {
      const y = cur.getFullYear();
      const m = String(cur.getMonth() + 1).padStart(2, "0");
      const d = String(cur.getDate()).padStart(2, "0");
      const key = `${y}-${m}-${d}`;
      chartPoints.push({ pointKey: key, amountCents: byDay.get(key) ?? 0 });
      cur.setDate(cur.getDate() + 1);
    }
  } else {
    const monthAgg = await query(
      `select
         to_char(date_trunc('month', coalesce(bd.day_date, bk.booking_date)), 'YYYY-MM') as point_key,
         coalesce(sum(coalesce(bd.total_cents, bk.total_cents)), 0)::bigint as amount_cents
       from bookings bk
       left join booking_days bd on bd.booking_id = bk.id and bd.status = 'ACTIVE'
       where bk.owner_user_id = $1
         and bk.status = 'COMPLETED'
         and coalesce(bd.day_date, bk.booking_date) >= $2::date
         and coalesce(bd.day_date, bk.booking_date) <= $3::date
       group by 1
       order by 1`,
      [ownerUserId, from, to]
    );
    const byMonth = new Map(monthAgg.rows.map((r) => [r.point_key, Number(r.amount_cents)]));
    const startParts = String(from).split("-").map(Number);
    const endParts = String(to).split("-").map(Number);
    let y = startParts[0];
    let mo = startParts[1];
    const endY = endParts[0];
    const endMo = endParts[1];
    while (y < endY || (y === endY && mo <= endMo)) {
      const key = `${y}-${String(mo).padStart(2, "0")}`;
      chartPoints.push({ pointKey: key, amountCents: byMonth.get(key) ?? 0 });
      mo += 1;
      if (mo > 12) {
        mo = 1;
        y += 1;
      }
    }
  }

  const revenueBySource = buildRevenueBySource(linesRes.rows, ownerOptionalNames);

  const avgTicket =
    current.completedBookings > 0
      ? Math.round(current.grossCents / current.completedBookings)
      : 0;
  const prevAvgTicket =
    previous.completedBookings > 0
      ? Math.round(previous.grossCents / previous.completedBookings)
      : 0;

  return {
    period: { preset: period.preset, from, to },
    previousPeriod: { from: prevFrom, to: prevTo },
    financial: {
      grossCents: current.grossCents,
      discountsCents: current.discountsCents,
      platformFeesCents: current.platformFeesCents,
      netCents: current.netCents,
      grossDeltaPct: deltaPct(current.grossCents, previous.grossCents),
      netDeltaPct: deltaPct(current.netCents, previous.netCents),
      platformFeesDeltaPct: deltaPct(current.platformFeesCents, previous.platformFeesCents),
      discountsDeltaPct: 0,
    },
    revenueBySource,
    summary: {
      completedBookings: current.completedBookings,
      completedBookingsDeltaPct: deltaPct(
        current.completedBookings,
        previous.completedBookings
      ),
      occupancyPct,
      occupancyDeltaPct: deltaPct(occupancyPct, prevOccupancyPct),
      avgTicketCents: avgTicket,
      avgTicketDeltaPct: deltaPct(avgTicket, prevAvgTicket),
      revenuePerBoatCents: Math.round(current.grossCents / boatCount),
      revenuePerBoatDeltaPct: deltaPct(
        Math.round(current.grossCents / boatCount),
        Math.round(previous.grossCents / boatCount)
      ),
    },
    stats: {
      pendingReceiveCents: Number(ext.pending_receive_cents ?? 0),
      cancellations: Number(ext.cancellations ?? 0),
      revenueTotalCents: current.grossCents,
    },
    chart: {
      granularity: chartGranularity,
      points: chartPoints,
    },
  };
}
