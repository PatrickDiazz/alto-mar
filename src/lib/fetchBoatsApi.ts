/** Número de tentativas em produção (502/504 de gateway ou rede a recuperar). */
export const BOATS_FETCH_ATTEMPTS = 6;

/** Em dev, falha rápido se a API ou o Postgres não estão a correr. */
const DEV_FETCH_ATTEMPTS = 2;

const RETRY_DELAY_STEP_MS = 450;

function maxAttempts(): number {
  return import.meta.env.DEV ? DEV_FETCH_ATTEMPTS : BOATS_FETCH_ATTEMPTS;
}

/** Só 502/504 costumam ser transitórios; 503 local = API/BD em baixo — não adiar o erro. */
function isRetryableHttpStatus(status: number): boolean {
  return status === 502 || status === 504;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * GET /api/boats com retentativas. Usado pelo React Query para reduzir falhas intermitentes.
 */
export async function fetchBoatsResponse(url: string): Promise<Response> {
  const attempts = maxAttempts();
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      const resp = await fetch(url);
      if (resp.ok) return resp;
      if (isRetryableHttpStatus(resp.status) && i < attempts - 1) {
        await sleep(RETRY_DELAY_STEP_MS * (i + 1));
        continue;
      }
      return resp;
    } catch (e) {
      lastErr = e;
      if (i < attempts - 1) {
        await sleep(RETRY_DELAY_STEP_MS * (i + 1));
        continue;
      }
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("fetch failed");
}
