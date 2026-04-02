/**
 * Corpo de erro HTTP; quando vem vazio (502 do proxy, etc.) evita toast sem texto.
 */
export async function readResponseErrorMessage(resp: Response, fallback: string): Promise<string> {
  const raw = (await resp.text().catch(() => "")).trim();
  if (raw) {
    return raw.length > 800 ? `${raw.slice(0, 797)}…` : raw;
  }
  const fb = fallback.trim();
  if (fb) return fb;
  return `HTTP ${resp.status}`;
}
