import { reservationMainGridClass } from "@/components/owner/reservations/reservationUi";
import type { TFunction } from "i18next";

export type OwnerPanelWidth = "default" | "wide";

export type OwnerPanelBodyLayout =
  | "stack"
  | "stack-tight"
  | "grid-2"
  | "grid-reservas"
  | "grid-agenda"
  | "none";

export function ownerPanelWidthFromPath(pathname: string): OwnerPanelWidth {
  if (pathname.startsWith("/marinheiro/reservas") || pathname.startsWith("/marinheiro/agenda")) {
    return "wide";
  }
  return "default";
}

export function ownerPanelMaxWidthClass(width: OwnerPanelWidth): string {
  return width === "wide" ? "max-w-[min(100%,1600px)]" : "max-w-6xl";
}

/** Título da página derivado da rota — única fonte para o header do painel. */
export function ownerPanelTitleFromPath(pathname: string, t: TFunction): string {
  if (pathname.startsWith("/marinheiro/faturamento")) return t("ownerRevenue.title");
  if (pathname === "/marinheiro/opcionais/novo") return t("ownerPanel.optionalAdd");
  if (pathname.startsWith("/marinheiro/opcionais/")) return t("ownerPanel.optionalEdit");
  if (pathname === "/marinheiro/opcionais") return t("ownerPanel.myOptionalsTitle");
  if (pathname === "/marinheiro/embarcacoes/novo") return t("marinheiro.newBoat");
  if (pathname.match(/^\/marinheiro\/embarcacoes\/[^/]+$/)) return t("ownerPanel.myBoatsTitle");
  if (pathname === "/marinheiro/embarcacoes") return t("ownerPanel.myBoatsTitle");
  if (pathname.startsWith("/marinheiro/agenda")) return t("ownerPanel.navAgenda");
  if (pathname.startsWith("/marinheiro/reservas")) {
    if (pathname.match(/^\/marinheiro\/reservas\/[^/]+$/)) return t("ownerReservas.detailTitle");
    return t("ownerPanel.tabBookings");
  }
  if (pathname.startsWith("/marinheiro/perfil")) return t("ownerPanel.tabProfile");
  return t("marinheiro.title");
}

export const ownerPanelPageClass =
  "mx-auto w-full min-w-0 space-y-6 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-500 motion-reduce:animate-none sm:space-y-8";

export const ownerPanelPageHeaderClass = "space-y-3";

export const ownerPanelTitleRowClass = "flex items-start justify-between gap-3";

export const ownerPanelTitleClass = "min-w-0 text-2xl font-bold tracking-tight text-foreground sm:text-3xl";

export const ownerPanelSubtitleClass = "max-w-2xl text-sm text-muted-foreground";

export const ownerPanelToolbarRowClass =
  "flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4";

export const ownerPanelBodyStackClass = "flex min-w-0 flex-col gap-4 sm:gap-6";

export const ownerPanelBodyStackTightClass = "flex min-w-0 flex-col gap-4";

export const ownerPanelBodyGrid2Class = "grid min-w-0 gap-4 lg:grid-cols-2";

export const ownerPanelBodyGridAgendaClass =
  "grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(440px,1.2fr)]";

export const OWNER_PANEL_BODY_LAYOUT: Record<OwnerPanelBodyLayout, string> = {
  stack: ownerPanelBodyStackClass,
  "stack-tight": ownerPanelBodyStackTightClass,
  "grid-2": ownerPanelBodyGrid2Class,
  "grid-reservas": reservationMainGridClass,
  "grid-agenda": ownerPanelBodyGridAgendaClass,
  none: "",
};
