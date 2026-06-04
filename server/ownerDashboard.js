import { query } from "./db.js";

const DEFAULT_SLOTS_PER_DAY = 6;
const AGENDA_PREVIEW_DAYS = 14;
const AGENDA_PREVIEW_LIMIT = 3;

function ymdLocal(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addDaysLocal(d, n) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() + n);
  return x;
}

function weekdayDow(ymd) {
  const [y, m, day] = ymd.split("-").map(Number);
  return new Date(y, m - 1, day).getDay();
}

/**
 * @param {string} ownerUserId
 */
export async function buildOwnerDashboard(ownerUserId) {
  const boatsRes = await query(
    `select b.id from boats b where b.owner_user_id = $1 order by b.created_at desc`,
    [ownerUserId]
  );
  const boatIds = boatsRes.rows.map((r) => r.id);

  const statsRes = await query(
    `select
       count(*) filter (where bk.status = 'COMPLETED')::int as trips_total,
       count(*) filter (
         where bk.status = 'COMPLETED'
           and bk.booking_date >= date_trunc('month', current_date)::date
       )::int as trips_this_month,
       count(*) filter (
         where bk.status = 'COMPLETED'
           and bk.booking_date >= date_trunc('month', current_date - interval '1 month')::date
           and bk.booking_date < date_trunc('month', current_date)::date
       )::int as trips_prev_month,
       coalesce(sum(bk.total_cents) filter (where bk.status = 'COMPLETED'), 0)::bigint as revenue_total_cents,
       coalesce(
         sum(bk.total_cents) filter (
           where bk.status = 'COMPLETED'
             and bk.booking_date >= date_trunc('month', current_date)::date
         ),
         0
       )::bigint as revenue_month_cents,
       coalesce(
         sum(bk.total_cents) filter (
           where bk.status = 'COMPLETED'
             and bk.booking_date >= date_trunc('month', current_date - interval '1 month')::date
             and bk.booking_date < date_trunc('month', current_date)::date
         ),
         0
       )::bigint as revenue_prev_month_cents
     from bookings bk
     where bk.owner_user_id = $1`,
    [ownerUserId]
  );
  const st = statsRes.rows[0] || {};
  const revenueMonth = Number(st.revenue_month_cents ?? 0);
  const revenuePrev = Number(st.revenue_prev_month_cents ?? 0);
  let revenueMonthDeltaPct = 0;
  if (revenuePrev > 0) {
    revenueMonthDeltaPct = Math.round(((revenueMonth - revenuePrev) / revenuePrev) * 100);
  } else if (revenueMonth > 0) {
    revenueMonthDeltaPct = 100;
  }

  const tripsMonth = Number(st.trips_this_month ?? 0);
  const tripsPrev = Number(st.trips_prev_month ?? 0);
  let tripsMonthDeltaPct = 0;
  if (tripsPrev > 0) {
    tripsMonthDeltaPct = Math.round(((tripsMonth - tripsPrev) / tripsPrev) * 100);
  } else if (tripsMonth > 0) {
    tripsMonthDeltaPct = 100;
  }

  const agendaPreview = await buildAgendaPreview(boatIds);

  return {
    stats: {
      tripsCompleted: Number(st.trips_total ?? 0),
      tripsMonth,
      tripsMonthDeltaPct,
      revenueTotalCents: Number(st.revenue_total_cents ?? 0),
      revenueMonthCents: revenueMonth,
      revenueMonthDeltaPct,
    },
    agendaPreview,
    activeBoatsCount: boatIds.length,
  };
}

/**
 * @param {string[]} boatIds
 */
async function buildAgendaPreview(boatIds) {
  if (boatIds.length === 0) return [];

  const today = new Date();
  const from = ymdLocal(today);
  const to = ymdLocal(addDaysLocal(today, AGENDA_PREVIEW_DAYS - 1));

  const [dateLocksRes, weekdayLocksRes, bookingsRes, slotsRes] = await Promise.all([
    query(
      `select boat_id, to_char(locked_date, 'YYYY-MM-DD') as d
       from boat_date_locks
       where boat_id = any($1::uuid[])
         and locked_date >= $2::date
         and locked_date <= $3::date`,
      [boatIds, from, to]
    ),
    query(`select boat_id, weekday from boat_weekday_locks where boat_id = any($1::uuid[])`, [boatIds]),
    query(
      `select x.boat_id, x.d
       from (
         select bk.boat_id, to_char(bk.booking_date, 'YYYY-MM-DD') as d
         from bookings bk
         where bk.boat_id = any($1::uuid[])
           and bk.booking_date >= $2::date
           and bk.booking_date <= $3::date
           and bk.status not in ('DECLINED', 'CANCELLED')
         union
         select bk.boat_id, to_char(bd.day_date, 'YYYY-MM-DD') as d
         from bookings bk
         join booking_days bd on bd.booking_id = bk.id and bd.status = 'ACTIVE'
         where bk.boat_id = any($1::uuid[])
           and bd.day_date >= $2::date
           and bd.day_date <= $3::date
           and bk.status not in ('DECLINED', 'CANCELLED')
       ) x
       group by x.boat_id, x.d`,
      [boatIds, from, to]
    ),
    query(
      `select boat_id, count(*)::int as n
       from boat_embark_slots
       where boat_id = any($1::uuid[])
       group by boat_id`,
      [boatIds]
    ),
  ]);

  const dateLocksByBoat = {};
  for (const r of dateLocksRes.rows) {
    (dateLocksByBoat[r.boat_id] ||= new Set()).add(r.d);
  }
  const weekdayLocksByBoat = {};
  for (const r of weekdayLocksRes.rows) {
    (weekdayLocksByBoat[r.boat_id] ||= new Set()).add(Number(r.weekday));
  }
  const bookedByBoatDate = new Set();
  for (const r of bookingsRes.rows) {
    bookedByBoatDate.add(`${r.boat_id}|${r.d}`);
  }
  const slotsByBoat = {};
  for (const r of slotsRes.rows) {
    slotsByBoat[r.boat_id] = Math.max(1, Number(r.n));
  }

  const byDate = [];
  for (let i = 0; i < AGENDA_PREVIEW_DAYS; i++) {
    const day = addDaysLocal(today, i);
    const key = ymdLocal(day);
    const dow = weekdayDow(key);
    let availableSlots = 0;
    for (const boatId of boatIds) {
      if (weekdayLocksByBoat[boatId]?.has(dow)) continue;
      if (dateLocksByBoat[boatId]?.has(key)) continue;
      if (bookedByBoatDate.has(`${boatId}|${key}`)) continue;
      availableSlots += slotsByBoat[boatId] ?? DEFAULT_SLOTS_PER_DAY;
    }
    if (availableSlots > 0) byDate.push({ date: key, availableSlots });
  }

  return byDate.slice(0, AGENDA_PREVIEW_LIMIT);
}
