/** Número de tentativas de rede antes de falhar (idle, 502/503/504, proxy a acordar). */
export const BOATS_FETCH_ATTEMPTS = 6;

const RETRY_DELAY_STEP_MS = 450;

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * GET /api/boats com retentativas. Usado pelo React Query para reduzir falhas intermitentes.
 */
export async function fetchBoatsResponse(url: string): Promise<Response> {
  let lastErr: unknown;
  for (let i = 0; i < BOATS_FETCH_ATTEMPTS; i++) {
    try {
      const resp = await fetch(url);
      if (resp.ok) return resp;
      const retryable = resp.status === 502 || resp.status === 503 || resp.status === 504;
      if (retryable && i < BOATS_FETCH_ATTEMPTS - 1) {
        await sleep(RETRY_DELAY_STEP_MS * (i + 1));
        continue;
      }
      return resp;
    } catch (e) {
      lastErr = e;
      if (i < BOATS_FETCH_ATTEMPTS - 1) {
        await sleep(RETRY_DELAY_STEP_MS * (i + 1));
        continue;
      }
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("fetch failed");
}
