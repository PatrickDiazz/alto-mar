import { authFetch } from "@/lib/auth";
import { readResponseErrorMessage } from "@/lib/responseError";
import type { CustomOptional } from "@/lib/types";
import type { BbqKitItemConfig } from "@/lib/trip-optionals";

export type OwnerBoatRecord = {
  id: string;
  nome: string;
  distancia: string;
  precoCents: number;
  preco: string;
  nota: string;
  rating: number;
  tamanhoPes: number;
  tamanho: string;
  capacidade: number;
  tipo: string;
  descricao: string;
  verificado: boolean;
  ativo: boolean;
  tieDocumentUrl?: string | null;
  tiemDocumentUrl?: string | null;
  videoUrl?: string | null;
  routeIslands?: string[];
  routeIslandImages?: Record<string, string[]>;
  imagens: string[];
  amenidades?: Array<{ id: string; nome: string; incluido: boolean }>;
  locaisEmbarque?: string[];
  horariosEmbarque?: string[];
  jetSkiOffered?: boolean;
  jetSkiPriceCents?: number;
  jetSkiImageUrls?: string[];
  jetSkiDocumentUrl?: string | null;
  customOptionals?: CustomOptional[];
  bbqOffered?: boolean;
  bbqKitItems?: BbqKitItemConfig[];
  bbqKitPriceCents?: number;
};

export function parseOwnerBoatRating(boat: Pick<OwnerBoatRecord, "rating" | "nota">): number {
  const n = Number(boat.rating);
  if (Number.isFinite(n) && n > 0) return n;
  const fromNota = Number(String(boat.nota ?? "").replace(",", "."));
  return Number.isFinite(fromNota) ? fromNota : 0;
}

export function sortBoatsByRatingDesc(boats: OwnerBoatRecord[]): OwnerBoatRecord[] {
  return [...boats].sort((a, b) => parseOwnerBoatRating(b) - parseOwnerBoatRating(a));
}

export function topRatedBoats(boats: OwnerBoatRecord[], limit = 3): OwnerBoatRecord[] {
  return sortBoatsByRatingDesc(boats).slice(0, limit);
}

export async function fetchOwnerBoats(): Promise<OwnerBoatRecord[]> {
  const resp = await authFetch("/api/owner/boats");
  if (resp.status === 401) return [];
  if (!resp.ok) {
    throw new Error(await readResponseErrorMessage(resp, "boats"));
  }
  const data = (await resp.json()) as { boats: OwnerBoatRecord[] };
  return (data.boats ?? []).map((b) => ({
    ...b,
    rating: parseOwnerBoatRating(b),
    ativo: b.ativo !== false,
  }));
}

export async function patchOwnerBoatActive(boatId: string, ativo: boolean): Promise<void> {
  const resp = await authFetch(`/api/owner/boats/${boatId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ativo }),
  });
  if (!resp.ok) {
    throw new Error(await readResponseErrorMessage(resp, "patch"));
  }
}
