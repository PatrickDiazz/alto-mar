import { apiUrl, authFetch } from "@/lib/auth";
import { readResponseErrorMessage } from "@/lib/responseError";
import type { OwnerOptionalKind } from "@/lib/ownerOptionalsCatalog";
import type { BbqKitItemConfig } from "@/lib/types";

export type OwnerOptionalRecord = {
  id: string;
  kind: OwnerOptionalKind;
  title: string;
  description: string;
  priceCents: number;
  imageUrls: string[];
  boatIds: string[];
  boatNames: string[];
  vehicleDocumentUrl?: string | null;
  bbqKitItems?: BbqKitItemConfig[];
  quantity: number;
};

export type OptionalAvailabilityByDate = Record<
  string,
  { jetSki: boolean; bbq: boolean; custom: Record<string, boolean> }
>;

export async function fetchOwnerOptionals(): Promise<OwnerOptionalRecord[]> {
  const resp = await authFetch("/api/owner/optionals");
  if (!resp.ok) {
    throw new Error(await readResponseErrorMessage(resp, "Erro ao carregar opcionais."));
  }
  const data = (await resp.json()) as { optionals: OwnerOptionalRecord[] };
  return data.optionals ?? [];
}

export async function createOwnerOptionalApi(
  body: Record<string, unknown>
): Promise<OwnerOptionalRecord> {
  const resp = await authFetch("/api/owner/optionals", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    throw new Error(await readResponseErrorMessage(resp, "Erro ao salvar opcional."));
  }
  const data = (await resp.json()) as { optional: OwnerOptionalRecord };
  return data.optional;
}

export async function updateOwnerOptionalApi(
  id: string,
  body: Record<string, unknown>
): Promise<OwnerOptionalRecord> {
  const resp = await authFetch(`/api/owner/optionals/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    throw new Error(await readResponseErrorMessage(resp, "Erro ao salvar opcional."));
  }
  const data = (await resp.json()) as { optional: OwnerOptionalRecord };
  return data.optional;
}

export async function fetchBoatOptionalAvailability(
  boatId: string,
  dates: string[]
): Promise<OptionalAvailabilityByDate> {
  if (!dates.length) return {};
  const q = encodeURIComponent(dates.join(","));
  const resp = await fetch(`${apiUrl(`/api/boats/${boatId}/optional-availability`)}?dates=${q}`);
  if (!resp.ok) return {};
  const data = (await resp.json()) as { byDate: OptionalAvailabilityByDate };
  return data.byDate ?? {};
}
