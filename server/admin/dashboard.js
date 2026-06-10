import { query } from "../db.js";

export async function getDashboardMetrics() {
  const [
    ticketsOpen,
    ticketsResolved,
    boatsPending,
    boatsApproved,
    boatsRejected,
    moderationOpen,
    chatReportsOpen,
    suspensionsActive,
  ] = await Promise.all([
    query(`select count(*)::int as n from tickets where status not in ('RESOLVED', 'CLOSED')`),
    query(
      `select count(*)::int as n from tickets where status in ('RESOLVED', 'CLOSED')
       and coalesce(resolved_at, closed_at, updated_at) >= now() - interval '30 days'`
    ),
    query(`select count(*)::int as n from boats where review_status = 'PENDING_REVIEW'`),
    query(
      `select count(*)::int as n from boats where review_status = 'APPROVED'
       and reviewed_at >= now() - interval '30 days'`
    ),
    query(
      `select count(*)::int as n from boats where review_status = 'REJECTED'
       and reviewed_at >= now() - interval '30 days'`
    ),
    query(`select count(*)::int as n from moderation_cases where status = 'OPEN'`),
    query(`select count(*)::int as n from chat_reports where status = 'OPEN'`),
    query(
      `select count(*)::int as n from user_suspensions
       where active = true and (expires_at is null or expires_at > now())`
    ),
  ]);

  const ticketSla = await query(
    `select
       avg(extract(epoch from (coalesce(resolved_at, closed_at) - created_at)) / 3600.0)::numeric(10,2) as avg_hours,
       avg(extract(epoch from (
         (select min(tm.created_at) from ticket_messages tm
          where tm.ticket_id = t.id and tm.author_staff_id is not null) - t.created_at
       )) / 60.0)::numeric(10,2) as avg_first_response_minutes
     from tickets t
     where t.status in ('RESOLVED', 'CLOSED')
       and coalesce(t.resolved_at, t.closed_at) >= now() - interval '30 days'`
  );

  const boatReviewTime = await query(
    `select avg(extract(epoch from (reviewed_at - created_at)) / 3600.0)::numeric(10,2) as avg_hours
     from boats
     where reviewed_at is not null
       and reviewed_at >= now() - interval '30 days'`
  );

  const ticketsByStatus = await query(
    `select status, count(*)::int as count from tickets group by status order by count desc`
  );

  const ticketsByPriority = await query(
    `select priority, count(*)::int as count from tickets
     where status not in ('RESOLVED', 'CLOSED')
     group by priority`
  );

  return {
    support: {
      openTickets: ticketsOpen.rows[0]?.n ?? 0,
      resolvedLast30Days: ticketsResolved.rows[0]?.n ?? 0,
      avgResolutionHours: Number(ticketSla.rows[0]?.avg_hours ?? 0),
      avgFirstResponseMinutes: Number(ticketSla.rows[0]?.avg_first_response_minutes ?? 0),
      byStatus: ticketsByStatus.rows.map((r) => ({ status: r.status, count: r.count })),
      byPriority: ticketsByPriority.rows.map((r) => ({ priority: r.priority, count: r.count })),
    },
    approval: {
      pending: boatsPending.rows[0]?.n ?? 0,
      approvedLast30Days: boatsApproved.rows[0]?.n ?? 0,
      rejectedLast30Days: boatsRejected.rows[0]?.n ?? 0,
      avgReviewHours: Number(boatReviewTime.rows[0]?.avg_hours ?? 0),
    },
    moderation: {
      openCases: moderationOpen.rows[0]?.n ?? 0,
      openChatReports: chatReportsOpen.rows[0]?.n ?? 0,
      activeSuspensions: suspensionsActive.rows[0]?.n ?? 0,
    },
  };
}
