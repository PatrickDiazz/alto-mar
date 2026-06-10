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
 * @param {{ limit?: number; offset?: number; entityType?: string; entityId?: string }} opts
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
