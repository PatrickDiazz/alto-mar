/**
 * Envio FCM (legacy HTTP API) — opcional via FCM_SERVER_KEY no .env.
 * @see docs/ANDROID.md
 */

const FCM_ENDPOINT = "https://fcm.googleapis.com/fcm/send";

/**
 * @param {string[]} tokens
 * @param {{ title: string; body: string; path?: string | null; type?: string; bookingId?: string | null }} payload
 */
export async function sendFcmToTokens(tokens, payload) {
  const key = process.env.FCM_SERVER_KEY && String(process.env.FCM_SERVER_KEY).trim();
  if (!key || tokens.length === 0) return { sent: 0, skipped: true };

  const unique = [...new Set(tokens.filter(Boolean))];
  if (unique.length === 0) return { sent: 0, skipped: true };

  const data = {
    type: payload.type ?? "",
    path: payload.path ?? "",
    bookingId: payload.bookingId ?? "",
  };

  let sent = 0;
  const batchSize = 500;
  for (let i = 0; i < unique.length; i += batchSize) {
    const batch = unique.slice(i, i + batchSize);
    try {
      const resp = await fetch(FCM_ENDPOINT, {
        method: "POST",
        headers: {
          Authorization: `key=${key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          registration_ids: batch,
          priority: "high",
          notification: {
            title: payload.title,
            body: payload.body,
            sound: "default",
            channel_id: "alto_mar_default",
          },
          data,
        }),
      });
      if (!resp.ok) {
        const text = await resp.text().catch(() => "");
        // eslint-disable-next-line no-console
        console.warn("[fcm] falha HTTP:", resp.status, text.slice(0, 200));
        continue;
      }
      const json = await resp.json();
      sent += Number(json?.success ?? batch.length);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      // eslint-disable-next-line no-console
      console.warn("[fcm] erro:", msg);
    }
  }
  return { sent, skipped: false };
}
