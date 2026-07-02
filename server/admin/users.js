import { query } from "../db.js";
import { writeAuditLog } from "./audit.js";

/**
 * @param {{ q?: string; status?: "pending" | "verified" | "all"; role?: string; limit?: number; offset?: number }} opts
 */
export async function listAppUsers(opts = {}) {
  const limit = Math.min(100, Math.max(1, opts.limit ?? 50));
  const offset = Math.max(0, opts.offset ?? 0);
  const params = [];
  const parts = ["1=1"];

  const status = opts.status ?? "pending";
  if (status === "pending") {
    parts.push("u.email_verified_at IS NULL");
  } else if (status === "verified") {
    parts.push("u.email_verified_at IS NOT NULL");
  }

  if (opts.role === "banhista" || opts.role === "locatario") {
    params.push(opts.role);
    parts.push(`u.role = $${params.length}`);
  }

  const q = typeof opts.q === "string" ? opts.q.trim().toLowerCase() : "";
  if (q) {
    params.push(`%${q}%`);
    const idx = params.length;
    parts.push(`(lower(u.email) like $${idx} OR lower(u.name) like $${idx})`);
  }

  const where = parts.join(" AND ");
  params.push(limit);
  const limitParam = params.length;
  params.push(offset);
  const offsetParam = params.length;

  const r = await query(
    `select u.id, u.name, u.email, u.phone, u.role, u.created_at, u.email_verified_at
     from users u
     where ${where}
     order by u.created_at desc
     limit $${limitParam} offset $${offsetParam}`,
    params
  );

  const countParams = params.slice(0, -2);
  const countR = await query(`select count(*)::int as total from users u where ${where}`, countParams);

  return {
    users: r.rows.map((row) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      phone: row.phone,
      role: row.role,
      createdAt: row.created_at,
      emailVerifiedAt: row.email_verified_at,
    })),
    total: countR.rows[0]?.total ?? 0,
  };
}

/**
 * @param {string} userId
 * @param {string} staffId
 */
export async function verifyUserEmailByStaff(userId, staffId) {
  const r = await query(
    `update users
     set email_verified_at = COALESCE(email_verified_at, now())
     where id = $1::uuid
     returning id, name, email, email_verified_at`,
    [userId]
  );
  const user = r.rows[0];
  if (!user) return { ok: false, reason: "not_found" };

  await query(`delete from email_verification_tokens where user_id = $1::uuid`, [userId]);

  await writeAuditLog({
    actorStaffId: staffId,
    action: "user.verify_email",
    entityType: "user",
    entityId: userId,
    metadata: { email: user.email },
  });

  return { ok: true, user };
}
