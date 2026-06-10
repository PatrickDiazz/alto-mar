import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { query } from "../db.js";

const raw = process.env.JWT_SECRET;
const JWT_SECRET = typeof raw === "string" ? raw.trim() : "";

/** @typedef {'STAFF'|'MODERATOR'|'SENIOR_MODERATOR'|'ADMIN'} StaffRole */

export const STAFF_ROLE_HIERARCHY = {
  STAFF: 1,
  MODERATOR: 2,
  SENIOR_MODERATOR: 3,
  ADMIN: 4,
};

/** @param {StaffRole} role */
export function staffRoleLevel(role) {
  return STAFF_ROLE_HIERARCHY[role] ?? 0;
}

/** @param {import('express').Request} req @param {StaffRole} minRole */
export function staffHasMinRole(req, minRole) {
  const role = req.staff?.staff_role;
  if (!role) return false;
  return staffRoleLevel(role) >= staffRoleLevel(minRole);
}

export function signStaffToken(staff) {
  return jwt.sign(
    {
      sub: staff.id,
      type: "staff",
      staff_role: staff.role,
      name: staff.name,
      email: staff.email,
    },
    JWT_SECRET,
    { expiresIn: "12h" }
  );
}

export function requireStaffAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const [, token] = header.split(" ");
  if (!token) return res.status(401).json({ error: "Não autenticado." });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (payload.type !== "staff") {
      return res.status(403).json({ error: "Token não é de staff." });
    }
    req.staff = payload;
    return next();
  } catch {
    return res.status(401).json({ error: "Token inválido." });
  }
}

/** @param {...StaffRole} roles */
export function requireStaffRole(...roles) {
  return (req, res, next) => {
    if (!req.staff) return res.status(401).json({ error: "Não autenticado." });
    if (!roles.includes(req.staff.staff_role)) {
      return res.status(403).json({ error: "Sem permissão." });
    }
    return next();
  };
}

/** @param {StaffRole} minRole */
export function requireStaffMinRole(minRole) {
  return (req, res, next) => {
    if (!req.staff) return res.status(401).json({ error: "Não autenticado." });
    if (!staffHasMinRole(req, minRole)) {
      return res.status(403).json({ error: "Sem permissão." });
    }
    return next();
  };
}

/**
 * @param {string} email
 * @param {string} password
 */
export async function authenticateStaff(email, password) {
  const r = await query(
    `select id, email, password_hash, name, role, active
     from staff_users where email = $1::citext limit 1`,
    [email.trim()]
  );
  const row = r.rows[0];
  if (!row || !row.active) return null;
  const ok = await bcrypt.compare(password, row.password_hash);
  if (!ok) return null;
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
  };
}

/** Permissões por papel (Fase 1 + 2) */
export const PERMISSIONS = {
  ticketsView: ["STAFF", "MODERATOR", "SENIOR_MODERATOR", "ADMIN"],
  ticketsManage: ["STAFF", "MODERATOR", "SENIOR_MODERATOR", "ADMIN"],
  boatsReview: ["MODERATOR", "SENIOR_MODERATOR", "ADMIN"],
  moderationBasic: ["MODERATOR", "SENIOR_MODERATOR", "ADMIN"],
  moderationBan: ["SENIOR_MODERATOR", "ADMIN"],
  auditView: ["ADMIN"],
  staffManage: ["ADMIN"],
  dashboardView: ["STAFF", "MODERATOR", "SENIOR_MODERATOR", "ADMIN"],
  macrosManage: ["ADMIN"],
  tagsManage: ["STAFF", "MODERATOR", "SENIOR_MODERATOR", "ADMIN"],
};

/** @param {StaffRole} staffRole @param {keyof typeof PERMISSIONS} permission */
export function staffCan(staffRole, permission) {
  const allowed = PERMISSIONS[permission];
  return Array.isArray(allowed) && allowed.includes(staffRole);
}

/** @param {keyof typeof PERMISSIONS} permission */
export function requireStaffPermission(permission) {
  return (req, res, next) => {
    if (!req.staff) return res.status(401).json({ error: "Não autenticado." });
    if (!staffCan(req.staff.staff_role, permission)) {
      return res.status(403).json({ error: "Sem permissão." });
    }
    return next();
  };
}
