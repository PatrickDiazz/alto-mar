import type { TFunction } from "i18next";
import type { Boat, CustomOptional } from "@/lib/types";

/** Chaves estáveis para filtro no Explorar — rótulos via i18n. */
export const TRIP_OPTIONAL_FILTER_KEYS = ["bbq", "jetSki", "floatingMat", "custom"] as const;
export type TripOptionalFilterKey = (typeof TRIP_OPTIONAL_FILTER_KEYS)[number];

/** Preço padrão do kit churrasco quando o locador não definiu outro. */
export const KIT_CHURRASCO_PRICE_REAIS = 250;
export const KIT_CHURRASCO_CENTS = KIT_CHURRASCO_PRICE_REAIS * 100;

export function bbqKitPriceCents(
  barco: Pick<Boat, "bbqOffered" | "bbqKitPriceCents">
): number {
  if (barco.bbqOffered === false) return 0;
  const cents = Number(barco.bbqKitPriceCents ?? KIT_CHURRASCO_CENTS);
  return Number.isFinite(cents) && cents >= 100 ? cents : KIT_CHURRASCO_CENTS;
}

export function bbqKitPriceReais(barco: Pick<Boat, "bbqOffered" | "bbqKitPriceCents">): number {
  return bbqKitPriceCents(barco) / 100;
}

/** Itens fixos do kit churrasco Alto Mar (rótulos e quantidades via i18n). */
export const BBQ_KIT_ITEM_KEYS = [
  "meat",
  "sausage",
  "garlicBread",
  "charcoal",
  "seasoning",
  "ice",
] as const;
export type BbqKitItemKey = (typeof BBQ_KIT_ITEM_KEYS)[number];

export type BbqKitItemUnit = "un" | "kg" | "L";

export type BbqKitItemConfig = {
  label: string;
  amount: string;
  unit: BbqKitItemUnit;
};

export const BBQ_KIT_UNITS: BbqKitItemUnit[] = ["un", "kg", "L"];

export function isKitChurrascoAmenityName(name: string): boolean {
  return name.trim().toLowerCase() === "kit churrasco";
}

export function defaultOwnerBbqKitItems(): BbqKitItemConfig[] {
  return [
    { label: "Picanha e contrafilé", amount: "2", unit: "kg" },
    { label: "Linguiça calabresa", amount: "10", unit: "un" },
    { label: "Pão de alho", amount: "10", unit: "un" },
    { label: "Carvão extra", amount: "5", unit: "kg" },
    { label: "Temperos", amount: "1", unit: "un" },
    { label: "Gelo", amount: "20", unit: "kg" },
  ];
}

export function normalizeBbqKitItems(items: BbqKitItemConfig[] | undefined): BbqKitItemConfig[] {
  if (!Array.isArray(items)) return [];
  return items
    .map((row) => ({
      label: String(row.label ?? "").trim(),
      amount: String(row.amount ?? "").trim(),
      unit: BBQ_KIT_UNITS.includes(row.unit) ? row.unit : "un",
    }))
    .filter((row) => row.label.length > 0 && row.amount.length > 0);
}

export function formatBbqKitQuantity(
  item: Pick<BbqKitItemConfig, "amount" | "unit">,
  t: TFunction
): string {
  const amount = item.amount.trim();
  const unitLabel = t(`optionals.bbqKit.units.${item.unit}`);
  return `${amount} ${unitLabel}`;
}

export function ownerBbqKitItemsValid(items: BbqKitItemConfig[]): boolean {
  return normalizeBbqKitItems(items).length > 0;
}

export const DEFAULT_BBQ_IMAGE = "/assets/kit_churrasco.jpg";
export const DEFAULT_JET_SKI_IMAGE = "/assets/moto_aquatica_exterior.png";
export const DEFAULT_FLOATING_MAT_IMAGE = "/assets/lancha_inflavel_exterior.png";

export type BbqVariant = "full" | "non_alcoholic";

export type BoatOptionalPreview = {
  key: string;
  labelKey: string;
  icon: "bbq" | "jetSki" | "custom";
  imageUrl: string;
};

export function jetSkiPriceReais(barco: Pick<Boat, "jetSkiOffered" | "jetSkiPriceCents">): number {
  if (!barco.jetSkiOffered) return 0;
  const cents = Number(barco.jetSkiPriceCents ?? 0);
  return cents > 0 ? cents / 100 : 0;
}

/** Fotos de placeholder de demo/seed — não mostrar ao banhista. */
function isJetSkiPlaceholderPhoto(url: string): boolean {
  const u = url.trim().toLowerCase();
  if (!u) return true;
  if (u.includes("unsplash.com")) return true;
  if (u.includes("example.com")) return true;
  if (u.includes("placeholder")) return true;
  return false;
}

/** Imagem da moto aquática para páginas do banhista (explorar, detalhe, reserva). */
export function jetSkiPublicCoverImage(barco: Pick<Boat, "jetSkiImageUrls">): string {
  const first = barco.jetSkiImageUrls?.[0]?.trim();
  if (first && !isJetSkiPlaceholderPhoto(first)) return first;
  return DEFAULT_JET_SKI_IMAGE;
}

/** Primeira foto cadastrada pelo locador (inclui placeholders — uso interno). */
export function jetSkiCoverImage(barco: Pick<Boat, "jetSkiImageUrls">): string {
  const urls = barco.jetSkiImageUrls ?? [];
  return urls[0]?.trim() || DEFAULT_JET_SKI_IMAGE;
}

export function customOptionalCoverImage(opt: CustomOptional): string {
  const urls = opt.imageUrls ?? [];
  return urls[0]?.trim() || DEFAULT_JET_SKI_IMAGE;
}

export function boatOffersBbq(barco: Pick<Boat, "bbqOffered">): boolean {
  return barco.bbqOffered !== false;
}

export function isFloatingMatOptionalTitle(title: string): boolean {
  const norm = title.trim().toLowerCase();
  if (!norm) return false;
  if (norm.includes("tapete") && norm.includes("flutuante")) return true;
  if (norm.includes("floating") && norm.includes("mat")) return true;
  return false;
}

export function boatOffersFloatingMat(
  barco: Pick<Boat, "customOptionals">
): boolean {
  return (barco.customOptionals ?? []).some((o) => isFloatingMatOptionalTitle(o.title ?? ""));
}

export function boatHasAnyOptionals(
  barco: Pick<Boat, "bbqOffered" | "jetSkiOffered" | "jetSkiPriceCents" | "customOptionals">
): boolean {
  return (
    boatOffersBbq(barco) ||
    (Boolean(barco.jetSkiOffered) && jetSkiPriceReais(barco) > 0) ||
    (barco.customOptionals?.length ?? 0) > 0
  );
}

/** Chips no card do explorar — só se a embarcação oferece o opcional. */
export function getBoatOptionalPreviews(
  barco: Pick<Boat, "bbqOffered" | "jetSkiOffered" | "jetSkiPriceCents" | "customOptionals">
): BoatOptionalPreview[] {
  const items: BoatOptionalPreview[] = [];
  if (boatOffersBbq(barco)) {
    items.push({
      key: "bbq",
      labelKey: "optionals.bbqShort",
      icon: "bbq",
      imageUrl: DEFAULT_BBQ_IMAGE,
    });
  }
  if (barco.jetSkiOffered && jetSkiPriceReais(barco) > 0) {
    items.push({
      key: "jetSki",
      labelKey: "optionals.jetSkiShort",
      icon: "jetSki",
      imageUrl: jetSkiPublicCoverImage(barco),
    });
  }
  for (const opt of barco.customOptionals ?? []) {
    if (!opt.title?.trim()) continue;
    items.push({
      key: `custom-${opt.id}`,
      labelKey: opt.title,
      icon: "custom",
      imageUrl: customOptionalCoverImage(opt),
    });
  }
  return items;
}

/** Título exibido ao banhista (demo legado em inglês + textos do locador). */
export function customOptionalDisplayTitle(title: string, t: TFunction): string {
  const norm = title.trim().toLowerCase();
  if (
    norm === "stand-up paddle" ||
    norm === "stand up paddle" ||
    norm === "paddle em pé (sup)" ||
    norm === "paddle em pe (sup)"
  ) {
    return t("optionals.demoSup");
  }
  if (isFloatingMatOptionalTitle(title)) {
    return t("optionals.floatingMatShort");
  }
  return title.trim();
}

/** Barco deve oferecer todos os opcionais de passeio selecionados. */
export function boatMatchesTripOptionalFilters(
  barco: Pick<Boat, "bbqOffered" | "jetSkiOffered" | "jetSkiPriceCents" | "customOptionals">,
  selected: TripOptionalFilterKey[]
): boolean {
  if (selected.length === 0) return true;
  for (const key of selected) {
    if (key === "bbq" && !boatOffersBbq(barco)) return false;
    if (key === "jetSki" && !(Boolean(barco.jetSkiOffered) && jetSkiPriceReais(barco) > 0)) return false;
    if (key === "floatingMat" && !boatOffersFloatingMat(barco)) return false;
    if (key === "custom") {
      const hasCustom = (barco.customOptionals ?? []).some((o) => Boolean(o.title?.trim()));
      if (!hasCustom) return false;
    }
  }
  return true;
}

export function customOptionalsTotalCents(
  selectedIds: string[],
  catalog: CustomOptional[] | undefined
): number {
  if (!selectedIds.length || !catalog?.length) return 0;
  const byId = new Map(catalog.map((o) => [o.id, o]));
  return selectedIds.reduce((sum, id) => sum + Math.max(0, Number(byId.get(id)?.priceCents ?? 0)), 0);
}
