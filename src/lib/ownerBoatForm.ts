import type { CustomOptional } from "@/lib/types";

export type { CustomOptional };
import type { BbqKitItemConfig } from "@/lib/trip-optionals";
import { formRowsToStoredRouteIslands } from "@/lib/routeIslandsParse";

export type OwnerBoatFormState = {
  nome: string;
  distancia: string;
  precoCents: number;
  tamanhoPes: number;
  capacidade: number;
  tipo: string;
  descricao: string;
  verificado: boolean;
  tieDocumentUrl?: string | null;
  tiemDocumentUrl?: string | null;
  videoUrl?: string | null;
  routeIslands?: string[];
  routeIslandImages?: Record<string, string[]>;
  imagens: string[];
  jetSkiOffered?: boolean;
  jetSkiPriceCents?: number;
  jetSkiImageUrls?: string[];
  jetSkiDocumentUrl?: string | null;
  bbqKitPriceCents?: number;
  bbqKitItems?: BbqKitItemConfig[];
  bbqOffered?: boolean;
  customOptionals?: CustomOptional[];
};

export const emptyOwnerBoatForm: OwnerBoatFormState = {
  nome: "",
  distancia: "",
  precoCents: 0,
  tamanhoPes: 25,
  capacidade: 6,
  tipo: "Lancha",
  descricao: "",
  verificado: false,
  tieDocumentUrl: "",
  tiemDocumentUrl: "",
  videoUrl: "",
  routeIslands: [],
  routeIslandImages: {},
  imagens: [],
  jetSkiOffered: false,
  jetSkiPriceCents: 0,
  jetSkiImageUrls: [],
  jetSkiDocumentUrl: "",
  bbqKitPriceCents: 25000,
  bbqOffered: false,
  customOptionals: [],
};

export function splitCommaList(s: string): string[] {
  return s.split(",").map((x) => x.trim()).filter(Boolean);
}

export function ownerBoatRoutesStepValid(routeIslandRows: string[], embarkLocsText: string): boolean {
  const routes = formRowsToStoredRouteIslands(routeIslandRows);
  if (routes.length === 0) return false;
  return splitCommaList(embarkLocsText).length >= 1;
}

/** Com envio de fotos do roteiro ativo: exige declaração e ao menos uma foto por parada. */
export function ownerBoatRoutePhotosStepValid(
  uploadRoutePhotos: boolean,
  routePhotoRights: boolean,
  routeIslands: string[] | undefined,
  routeIslandImages: Record<string, string[]>
): boolean {
  if (!uploadRoutePhotos) return true;
  if (!routePhotoRights) return false;
  const islands = (routeIslands ?? []).map((s) => s.trim()).filter(Boolean);
  if (islands.length === 0) return false;
  return islands.every((island) => (routeIslandImages[island]?.length ?? 0) >= 1);
}

function isHttpsUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

function isDocumentUrlOrUpload(value: string): boolean {
  const t = value.trim();
  if (!t) return false;
  if (t.startsWith("data:")) return true;
  return isHttpsUrl(t);
}

export function ownerBoatMediaStepValid(form: Pick<OwnerBoatFormState, "videoUrl" | "tieDocumentUrl" | "tiemDocumentUrl">): boolean {
  const video = String(form.videoUrl ?? "").trim();
  const tie = String(form.tieDocumentUrl ?? "").trim();
  const tiem = String(form.tiemDocumentUrl ?? "").trim();
  return isHttpsUrl(video) && isDocumentUrlOrUpload(tie) && isDocumentUrlOrUpload(tiem);
}

/** Valor vazio no input quando 0 — permite apagar e digitar de novo. */
export function numberFieldDisplay(value: number): string {
  return value > 0 ? String(value) : "";
}

export function reaisDisplayFromCents(cents: number): string {
  if (cents <= 0) return "";
  return String(Math.round(cents / 100));
}

export function parseReaisToCents(raw: string): number {
  const v = raw.trim();
  if (v === "") return 0;
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n) * 100;
}

export function parsePositiveIntField(raw: string): number {
  const v = raw.trim();
  if (v === "") return 0;
  const n = parseInt(v, 10);
  if (!Number.isFinite(n) || n < 0) return 0;
  return n;
}

export async function fileToDataUrl(file: File): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
