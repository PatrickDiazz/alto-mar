/**
 * Quando o edge devolve HTML (ex. index.html em /api), resp.json() falha de forma confusa.
 */
export async function readJsonOrThrow<T>(resp: Response, notJsonMessage: string): Promise<T> {
  const ct = resp.headers.get("content-type") ?? "";
  if (!ct.includes("application/json")) {
    throw new Error(notJsonMessage);
  }
  try {
    return (await resp.json()) as T;
  } catch {
    throw new Error(notJsonMessage);
  }
}
