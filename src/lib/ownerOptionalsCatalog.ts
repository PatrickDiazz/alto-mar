import { isMotoAquaticaVessel } from "@/lib/boatVesselTypes";
import type { OwnerBoatRecord } from "@/lib/ownerBoats";
import type { OwnerOptionalRecord } from "@/lib/ownerOptionalsApi";
import type { BbqKitItemConfig, CustomOptional } from "@/lib/types";

export type OwnerOptionalKind = "vehicle" | "bbq" | "other";

export type OwnerOptionalCatalogItem = {
  key: string;
  kind: OwnerOptionalKind;
  title: string;
  description: string;
  imageUrl: string;
  priceCents: number;
  boatIds: string[];
  boatNames: string[];
  quantity: number;
  /** Dados para edição */
  vehicleDocumentUrl?: string | null;
  bbqKitItems?: BbqKitItemConfig[];
  customOptional?: CustomOptional;
};

const BBQ_IMG = "/assets/kit_churrasco.jpg";
const JET_IMG = "/assets/moto_aquatica_exterior.png";

/** Lista deduplicada a partir do inventário do locador (1 unidade por opcional). */
export function buildOwnerOptionalsCatalogFromApi(
  optionals: OwnerOptionalRecord[]
): OwnerOptionalCatalogItem[] {
  return optionals.map((o) => ({
    key: o.id,
    kind: o.kind,
    title: o.title,
    description: o.description,
    imageUrl: o.imageUrls[0] || (o.kind === "bbq" ? BBQ_IMG : o.kind === "vehicle" ? JET_IMG : BBQ_IMG),
    priceCents: o.priceCents,
    boatIds: o.boatIds,
    boatNames: o.boatNames,
    quantity: o.quantity ?? 1,
    vehicleDocumentUrl: o.vehicleDocumentUrl,
    bbqKitItems: o.bbqKitItems,
    customOptional:
      o.kind === "other"
        ? {
            id: o.id,
            title: o.title,
            description: o.description,
            priceCents: o.priceCents,
            imageUrls: o.imageUrls,
          }
        : undefined,
  }));
}

export function findCatalogItemFromApi(
  optionals: OwnerOptionalRecord[],
  key: string
): OwnerOptionalCatalogItem | null {
  return buildOwnerOptionalsCatalogFromApi(optionals).find((i) => i.key === key) ?? null;
}

function jetKey(boatId: string) {
  return `vehicle-${boatId}`;
}
function bbqKey(boatId: string) {
  return `bbq-${boatId}`;
}
function customKey(boatId: string, id: string) {
  return `other-${boatId}-${id}`;
}

export function parseOptionalKey(key: string): { kind: OwnerOptionalKind; boatId: string; customId?: string } | null {
  if (key.startsWith("vehicle-")) return { kind: "vehicle", boatId: key.slice("vehicle-".length) };
  if (key.startsWith("bbq-")) return { kind: "bbq", boatId: key.slice("bbq-".length) };
  if (key.startsWith("other-")) {
    const rest = key.slice("other-".length);
    const dash = rest.indexOf("-");
    if (dash < 1) return null;
    return { kind: "other", boatId: rest.slice(0, dash), customId: rest.slice(dash + 1) };
  }
  return null;
}

export function buildOwnerOptionalsCatalog(
  boats: OwnerBoatRecord[],
  t: (k: string) => string
): OwnerOptionalCatalogItem[] {
  const items: OwnerOptionalCatalogItem[] = [];

  for (const b of boats) {
    if (b.jetSkiOffered || isMotoAquaticaVessel(b.tipo)) {
      items.push({
        key: jetKey(b.id),
        kind: "vehicle",
        title: isMotoAquaticaVessel(b.tipo) ? b.nome : t("ownerPanel.optionalJetTitle"),
        description: t("ownerPanel.optionalJetDesc"),
        imageUrl: b.jetSkiImageUrls?.[0] || JET_IMG,
        priceCents: b.jetSkiPriceCents ?? 0,
        boatIds: [b.id],
        boatNames: [b.nome],
        quantity: 1,
        vehicleDocumentUrl: b.jetSkiDocumentUrl,
      });
    }
    if (b.bbqOffered !== false) {
      items.push({
        key: bbqKey(b.id),
        kind: "bbq",
        title: t("ownerPanel.optionalBbqTitle"),
        description: t("ownerPanel.optionalBbqDesc"),
        imageUrl: BBQ_IMG,
        priceCents: b.bbqKitPriceCents ?? 25000,
        boatIds: [b.id],
        boatNames: [b.nome],
        quantity: 1,
        bbqKitItems: b.bbqKitItems,
      });
    }
    for (const c of b.customOptionals ?? []) {
      if (!c.title?.trim()) continue;
      items.push({
        key: customKey(b.id, c.id),
        kind: "other",
        title: c.title,
        description: c.description ?? "",
        imageUrl: c.imageUrls?.[0] || BBQ_IMG,
        priceCents: c.priceCents,
        boatIds: [b.id],
        boatNames: [b.nome],
        quantity: 1,
        customOptional: c,
      });
    }
  }

  return items;
}

export function findCatalogItem(
  boats: OwnerBoatRecord[],
  key: string,
  t: (k: string) => string
): OwnerOptionalCatalogItem | null {
  return buildOwnerOptionalsCatalog(boats, t).find((i) => i.key === key) ?? null;
}
