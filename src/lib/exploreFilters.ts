import type { Boat } from "@/lib/types";

/** Chaves estáveis — textos vêm do i18n */
export const EXPLORE_MAIN_FILTER_KEYS = ["type", "size", "seats", "price", "included"] as const;
export type ExploreMainFilter = "all" | (typeof EXPLORE_MAIN_FILTER_KEYS)[number];
export type SizeFilterKey = "all" | "upTo25" | "26to30" | "31plus";
export type SeatsFilterKey = "all" | "upTo6" | "7to10" | "11to16" | "17plus";
export type PriceFilterKey = "all" | "upTo2000" | "2001to3000" | "3001to4500" | "4501plus";

export function matchesExploreFilters(
  barco: Boat,
  opts: {
    q: string;
    tipoFiltro: string;
    tamFiltro: SizeFilterKey;
    vagasFiltro: SeatsFilterKey;
    precoFiltro: PriceFilterKey;
    /** Nome do item incluso (catálogo) ou "all" */
    amenityFiltro: string;
  }
): boolean {
  const { q, tipoFiltro, tamFiltro, vagasFiltro, precoFiltro, amenityFiltro } = opts;
  if (q.trim()) {
    const qLower = q.trim().toLowerCase();
    const locais = (barco.locaisEmbarque || []).join(" ");
    const rotas = (barco.routeIslands || []).join(" ");
    const hay = `${barco.distancia} ${locais} ${rotas} ${barco.nome} ${barco.tipo}`.toLowerCase();
    if (!hay.includes(qLower)) return false;
  }

  if (tipoFiltro !== "all" && barco.tipo !== tipoFiltro) return false;

  if (tamFiltro !== "all") {
    const pes = parseInt(barco.tamanho.replace(/[^0-9]/g, ""), 10);
    if (tamFiltro === "upTo25" && !(pes <= 25)) return false;
    if (tamFiltro === "26to30" && !(pes >= 26 && pes <= 30)) return false;
    if (tamFiltro === "31plus" && !(pes >= 31)) return false;
  }

  if (vagasFiltro !== "all") {
    const cap = barco.capacidade;
    if (vagasFiltro === "upTo6" && !(cap <= 6)) return false;
    if (vagasFiltro === "7to10" && !(cap >= 7 && cap <= 10)) return false;
    if (vagasFiltro === "11to16" && !(cap >= 11 && cap <= 16)) return false;
    if (vagasFiltro === "17plus" && !(cap >= 17)) return false;
  }

  if (precoFiltro !== "all") {
    const valor = parseInt(barco.preco.replace(/[^0-9]/g, ""), 10);
    if (precoFiltro === "upTo2000" && !(valor <= 2000)) return false;
    if (precoFiltro === "2001to3000" && !(valor >= 2001 && valor <= 3000)) return false;
    if (precoFiltro === "3001to4500" && !(valor >= 3001 && valor <= 4500)) return false;
    if (precoFiltro === "4501plus" && !(valor >= 4501)) return false;
  }

  if (amenityFiltro && amenityFiltro !== "all") {
    const want = amenityFiltro.trim().toLowerCase();
    const ok = (barco.amenidades || []).some(
      (a) => a.incluido && a.nome.toLowerCase() === want
    );
    if (!ok) return false;
  }

  return true;
}
