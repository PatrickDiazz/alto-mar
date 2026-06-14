import { query } from "../db.js";

/**
 * @param {{
 *   actorStaffId?: string | null;
 *   action: string;
 *   entityType: string;
 *   entityId?: string | null;
 *   metadata?: Record<string, unknown>;
 * }} input
 */
export async function writeAuditLog(input) {
  const { actorStaffId = null, action, entityType, entityId = null, metadata = {} } = input;
  await query(
    `insert into audit_logs (actor_staff_id, action, entity_type, entity_id, metadata)
     values ($1::uuid, $2, $3, $4::uuid, $5::jsonb)`,
    [actorStaffId, action, entityType, entityId, JSON.stringify(metadata)]
  );
}

/**
 * @param {{ limit?: number; offset?: number; entityType?: string; entityId?: string; actorStaffId?: string | null }} opts
 */
export async function listAuditLogs(opts = {}) {
  const limit = Math.min(200, Math.max(1, opts.limit ?? 50));
  const offset = Math.max(0, opts.offset ?? 0);
  const params = [];
  const parts = ["1=1"];

  if (opts.entityType) {
    params.push(opts.entityType);
    parts.push(`a.entity_type = $${params.length}`);
  }
  if (opts.entityId) {
    params.push(opts.entityId);
    parts.push(`a.entity_id = $${params.length}::uuid`);
  }
  if (opts.actorStaffId === "system") {
    parts.push("a.actor_staff_id is null");
  } else if (opts.actorStaffId) {
    params.push(opts.actorStaffId);
    parts.push(`a.actor_staff_id = $${params.length}::uuid`);
  }

  params.push(limit, offset);
  const r = await query(
    `select
       a.id, a.action, a.entity_type, a.entity_id, a.metadata, a.created_at,
       s.name as actor_name, s.email as actor_email, s.role as actor_role
     from audit_logs a
     left join staff_users s on s.id = a.actor_staff_id
     where ${parts.join(" and ")}
     order by a.created_at desc
     limit $${params.length - 1} offset $${params.length}`,
    params
  );
  return r.rows.map(mapAuditRow);
}

/** Contas staff (e «Sistema») com resumo de acções de auditoria. */
export async function listAuditAccounts() {
  const r = await query(
    `select
       coalesce(s.id::text, 'system') as id,
       coalesce(s.name, 'Sistema') as name,
       s.email,
       s.role,
       coalesce(s.active, true) as active,
       count(a.id)::int as action_count,
       max(a.created_at) as last_action_at
     from audit_logs a
     left join staff_users s on s.id = a.actor_staff_id
     group by s.id, s.name, s.email, s.role, s.active
     order by max(a.created_at) desc`
  );
  return r.rows.map((row) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    active: row.active,
    actionCount: Number(row.action_count ?? 0),
    lastActionAt: row.last_action_at,
  }));
}

/** @param {string} accountId — UUID staff ou `system` */
export async function getAuditAccount(accountId) {
  if (accountId === "system") {
    const summary = await query(
      `select count(*)::int as action_count, max(created_at) as last_action_at
       from audit_logs where actor_staff_id is null`
    );
    const row = summary.rows[0];
    if (!row || Number(row.action_count) === 0) return null;
    return {
      id: "system",
      name: "Sistema",
      email: null,
      role: null,
      active: true,
      actionCount: Number(row.action_count),
      lastActionAt: row.last_action_at,
    };
  }

  const r = await query(
    `select
       s.id, s.name, s.email, s.role, s.active,
       count(a.id)::int as action_count,
       max(a.created_at) as last_action_at
     from staff_users s
     left join audit_logs a on a.actor_staff_id = s.id
     where s.id = $1::uuid
     group by s.id, s.name, s.email, s.role, s.active
     limit 1`,
    [accountId]
  );
  const row = r.rows[0];
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    active: row.active,
    actionCount: Number(row.action_count ?? 0),
    lastActionAt: row.last_action_at,
  };
}

/** @param {import('pg').QueryResultRow} row */
function mapAuditRow(row) {
  return {
    id: row.id,
    action: row.action,
    entityType: row.entity_type,
    entityId: row.entity_id,
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
    actor: row.actor_name
      ? { name: row.actor_name, email: row.actor_email, role: row.actor_role }
      : null,
  };
}
