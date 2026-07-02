import crypto from "node:crypto";
import { query } from "./db.js";
import { sendEmail } from "./email.js";

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

function sha256Hex(value) {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

/**
 * @param {string} userId
 * @param {string} frontendBase
 */
export async function issueEmailVerification(userId, frontendBase) {
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = sha256Hex(rawToken);
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);

  await query(`delete from email_verification_tokens where user_id = $1`, [userId]);
  await query(
    `insert into email_verification_tokens (token_hash, user_id, expires_at) values ($1, $2, $3)`,
    [tokenHash, userId, expiresAt.toISOString()]
  );

  const base = frontendBase.replace(/\/$/, "");
  const link = `${base}/verificar-email?token=${encodeURIComponent(rawToken)}`;

  const userRow = await query(`select name, email from users where id = $1 limit 1`, [userId]);
  const user = userRow.rows[0];
  if (!user?.email) return link;

  const greeting = user.name ? `Olá, ${user.name}` : "Olá";
  const subject = "Confirme o seu email — Alto Mar";
  const text = `${greeting},\n\nConfirme o seu email para ativar a conta Alto Mar:\n${link}\n\nO link é válido por 24 horas.\n\nSe não criou esta conta, ignore este email.`;
  const html = `
    <p>${greeting},</p>
    <p>Confirme o seu email para ativar a conta <strong>Alto Mar</strong>:</p>
    <p><a href="${link}">Confirmar email</a></p>
    <p style="color:#666;font-size:13px;">O link é válido por 24 horas. Se não criou esta conta, ignore este email.</p>
  `;

  await sendEmail({ to: user.email, subject, html, text });

  if (!process.env.RESEND_API_KEY) {
    // eslint-disable-next-line no-console
    console.log("\n[Alto Mar] Confirmação de email — copie o link (válido 24h):\n", link, "\n");
  }

  return link;
}

/**
 * @param {string} rawToken
 */
export async function verifyEmailToken(rawToken) {
  if (!rawToken || rawToken.length < 32) return { ok: false, reason: "invalid" };

  const tokenHash = sha256Hex(rawToken);
  const result = await query(
    `select t.user_id, u.email_verified_at
     from email_verification_tokens t
     join users u on u.id = t.user_id
     where t.token_hash = $1 and t.expires_at > now()
     limit 1`,
    [tokenHash]
  );
  const row = result.rows[0];
  if (!row) return { ok: false, reason: "invalid" };

  if (!row.email_verified_at) {
    await query(`update users set email_verified_at = now() where id = $1`, [row.user_id]);
  }
  await query(`delete from email_verification_tokens where user_id = $1`, [row.user_id]);

  return { ok: true, userId: row.user_id };
}

/**
 * @param {string} email
 * @param {string} frontendBase
 */
export async function resendEmailVerification(email, frontendBase) {
  const result = await query(
    `select id, email_verified_at from users where email = $1 limit 1`,
    [email]
  );
  const row = result.rows[0];
  if (!row || row.email_verified_at) return { sent: false };

  await issueEmailVerification(row.id, frontendBase);
  return { sent: true };
}
