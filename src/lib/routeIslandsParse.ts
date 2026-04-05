/**
 * `route_islands` no BD: cada elemento pode ser
 * - uma parada (legado: vários itens, sem vírgulas) = um único roteiro;
 * - uma linha de roteiro com paradas separadas por vírgula;
 * - várias linhas = vários roteiros alternativos (cada linha = um roteiro).
 */

export type ParsedBoatRoutes =
  | { kind: "single"; stops: string[] }
  | { kind: "multi"; routes: string[][] };

/** Para mapas, roteiros e reserva: interpreta o array guardado pelo locador. */
export function parseOwnerRouteIslands(routeIslands?: string[] | null): ParsedBoatRoutes {
  const lines = (routeIslands || []).map((s) => s.trim()).filter(Boolean);
  if (lines.length === 0) return { kind: "single", stops: [] };

  const anyComma = lines.some((l) => l.includes(","));
  if (!anyComma && lines.length > 1) {
    return { kind: "single", stops: lines };
  }

  const routes = lines
    .map((l) => l.split(",").map((s) => s.trim()).filter(Boolean))
    .filter((stops) => stops.length > 0);

  if (routes.length <= 1) {
    return { kind: "single", stops: routes[0] ?? [] };
  }
  return { kind: "multi", routes };
}

/** Formulário do marinheiro: uma linha por roteiro; legado vira um campo com vírgulas. */
export function storedRouteIslandsToFormRows(stored: string[] | undefined | null): string[] {
  const lines = (stored || []).map((s) => s.trim()).filter(Boolean);
  if (lines.length === 0) return [""];
  const anyComma = lines.some((l) => l.includes(","));
  if (!anyComma && lines.length > 1) {
    return [lines.join(", ")];
  }
  return lines.length ? [...lines] : [""];
}

/** Grava no BD: uma string por roteiro (paradas separadas por vírgula dentro da string). */
export function formRowsToStoredRouteIslands(rows: string[]): string[] {
  return rows.map((s) => s.trim()).filter(Boolean);
}
