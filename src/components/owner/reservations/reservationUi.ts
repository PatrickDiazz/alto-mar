import { ownerBookingDayDiff, ownerBookingYmd, type OwnerBookingRow } from "@/lib/ownerBookingTypes";

/** Superfície padrão do painel locador (OwnerSurface). */
export const reservationSurfaceClass = "rounded-xl border border-border/45 bg-transparent";

/** Card clicável de lista — alinhado a OwnerBookingCompactRow. */
export const reservationListCardSurface = "rounded-lg border border-border/35 bg-transparent";

export const reservationListCardHover =
  "cursor-pointer transition-colors hover:border-border/60 hover:bg-muted/25";

/** Miniatura 16:9 compacta para listas. */
export const reservationThumbClass =
  "aspect-video w-14 shrink-0 overflow-hidden rounded-lg bg-muted sm:w-16";

/** Lista vertical — scroll interno só em desktop; no mobile a página rola normalmente. */
export const reservationListStackClass =
  "flex flex-col gap-2 pr-0.5 lg:min-h-0 lg:flex-1 lg:max-h-[14.5rem] lg:overflow-y-auto lg:overscroll-contain";

/** Lista horizontal com scroll — por vir. */
export const reservationListRowClass =
  "flex gap-2.5 overflow-x-auto overscroll-x-contain pb-1 snap-x snap-mandatory [scrollbar-width:thin]";

/** Largura fixa de cada tile no carrossel. */
export const reservationListTileWidthClass = "w-[9.25rem] shrink-0 snap-start sm:w-[10rem]";

/** Altura mínima alinhada entre em curso e resumo (≥ lg). */
export const reservationTopPanelMinHeightClass = "lg:min-h-[18.25rem]";

/** Grid principal: em curso | por vir | resumo na mesma linha, alturas alinhadas. */
export const reservationMainGridClass =
  "grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(240px,260px)] lg:items-stretch lg:gap-5 xl:gap-6";

/** Lista de concluídas — scroll interno só em desktop. */
export const reservationCompletedGridClass =
  "grid grid-cols-1 gap-2 pr-0.5 lg:max-h-[min(22rem,52vh)] lg:overflow-y-auto lg:overscroll-contain xl:grid-cols-2";

export type ReservationStatusVariant = "inProgress" | "confirmed" | "pending" | "completed" | "cancelled";

/** Tons de status — mesmo padrão da agenda e do dashboard. */
export function reservationStatusTone(variant: ReservationStatusVariant): string {
  if (variant === "inProgress" || variant === "confirmed") {
    return "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300";
  }
  if (variant === "pending") return "bg-amber-500/15 text-amber-600 dark:text-amber-300";
  if (variant === "completed") return "bg-primary/15 text-primary";
  return "bg-muted text-muted-foreground";
}

export function reservationStatusVariant(
  status: string,
  dayDiff: number | null
): ReservationStatusVariant {
  if (status === "COMPLETED") return "completed";
  if (status === "CANCELLED" || status === "DECLINED") return "cancelled";
  if (status === "PENDING") return "pending";
  if (status === "ACCEPTED" && dayDiff !== null && dayDiff <= 0) return "inProgress";
  return "confirmed";
}

function isBookingInCurrentMonth(ymd: string): boolean {
  const now = new Date();
  const [y, m] = ymd.split("-").map(Number);
  return y === now.getFullYear() && m - 1 === now.getMonth();
}

export function filterBookingsByBoat(bookings: OwnerBookingRow[], boatId: string | null): OwnerBookingRow[] {
  return bookings.filter((b) => Boolean(b.bookingDate) && (!boatId || b.boat.id === boatId));
}

export type ReservationMetrics = {
  totalMonth: number;
  inCourseNow: number;
  upcoming7: number;
  completedMonth: number;
  cancelledMonth: number;
};

/** Métricas derivadas dos dados já carregados — só apresentação. */
export function computeReservationMetrics(bookings: OwnerBookingRow[]): ReservationMetrics {
  let totalMonth = 0;
  let inCourseNow = 0;
  let upcoming7 = 0;
  let completedMonth = 0;
  let cancelledMonth = 0;

  for (const b of bookings) {
    const ymd = ownerBookingYmd(b);
    if (!ymd) continue;
    const dayDiff = ownerBookingDayDiff(b.bookingDate);
    const inMonth = isBookingInCurrentMonth(ymd);

    if (inMonth) totalMonth += 1;

    if (b.status === "ACCEPTED" && dayDiff !== null && dayDiff <= 0) {
      inCourseNow += 1;
    }

    if (
      (b.status === "PENDING" || b.status === "ACCEPTED") &&
      dayDiff !== null &&
      dayDiff > 0 &&
      dayDiff <= 7
    ) {
      upcoming7 += 1;
    }

    if (b.status === "COMPLETED" && inMonth) completedMonth += 1;

    if ((b.status === "CANCELLED" || b.status === "DECLINED") && inMonth) {
      cancelledMonth += 1;
    }
  }

  return { totalMonth, inCourseNow, upcoming7, completedMonth, cancelledMonth };
}

export function splitReservationLists(bookings: OwnerBookingRow[]) {
  const inCourse: OwnerBookingRow[] = [];
  const upcoming: OwnerBookingRow[] = [];
  const completed: OwnerBookingRow[] = [];
  const archived: OwnerBookingRow[] = [];

  for (const b of bookings) {
    const dayDiff = ownerBookingDayDiff(b.bookingDate);
    if (b.status === "COMPLETED") {
      completed.push(b);
      continue;
    }
    if (b.status === "CANCELLED" || b.status === "DECLINED") {
      archived.push(b);
      continue;
    }
    if (b.status === "ACCEPTED" && dayDiff !== null && dayDiff <= 0) {
      inCourse.push(b);
      continue;
    }
    if (
      (b.status === "PENDING" || b.status === "ACCEPTED") &&
      (dayDiff === null || (dayDiff > 0 && dayDiff <= 7))
    ) {
      upcoming.push(b);
    }
  }

  const sortByDate = (a: OwnerBookingRow, b: OwnerBookingRow) =>
    ownerBookingYmd(a).localeCompare(ownerBookingYmd(b)) ||
    (a.embarkTime || "").localeCompare(b.embarkTime || "");

  inCourse.sort(sortByDate);
  upcoming.sort(sortByDate);
  completed.sort((a, b) => ownerBookingYmd(b).localeCompare(ownerBookingYmd(a)));
  archived.sort((a, b) => ownerBookingYmd(b).localeCompare(ownerBookingYmd(a)));

  return { inCourse, upcoming, completed, archived };
}
