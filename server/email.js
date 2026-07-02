/**
 * Envio de email transacional.
 * - Com RESEND_API_KEY: envia via Resend (https://resend.com).
 * - Sem provedor configurado: imprime o conteúdo no terminal (desenvolvimento).
 */

const RESEND_API_KEY = process.env.RESEND_API_KEY && String(process.env.RESEND_API_KEY).trim();
const EMAIL_FROM =
  (process.env.EMAIL_FROM && String(process.env.EMAIL_FROM).trim()) || "Alto Mar <noreply@altomar.app>";

/**
 * @param {{ to: string; subject: string; html: string; text?: string }} input
 */
export async function sendEmail({ to, subject, html, text }) {
  const recipient = String(to || "").trim();
  if (!recipient) throw new Error("Destinatário de email ausente.");

  if (RESEND_API_KEY) {
    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: EMAIL_FROM,
        to: [recipient],
        subject,
        html,
        ...(text ? { text } : {}),
      }),
    });
    if (!resp.ok) {
      const body = await resp.text().catch(() => "");
      throw new Error(body || `Falha ao enviar email (${resp.status}).`);
    }
    return;
  }

  // eslint-disable-next-line no-console
  console.log("\n[Alto Mar] Email (sem provedor configurado — defina RESEND_API_KEY em produção):\n");
  // eslint-disable-next-line no-console
  console.log(`Para: ${recipient}`);
  // eslint-disable-next-line no-console
  console.log(`Assunto: ${subject}`);
  // eslint-disable-next-line no-console
  console.log(text || html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
  // eslint-disable-next-line no-console
  console.log("");
}
