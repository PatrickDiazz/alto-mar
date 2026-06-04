import type { RevenueChartRange } from "@/lib/ownerRevenueApi";

const STORAGE_KEY = "alto-mar-owner-revenue-chart";

export type OwnerRevenueChartView = "range" | "day";

export type OwnerRevenueChartPrefs = {
  rangeMonths: RevenueChartRange;
  /** Mês para vista diária (YYYY-MM). */
  selectedMonthKey: string | null;
  chartView: OwnerRevenueChartView;
};

const DEFAULT_PREFS: OwnerRevenueChartPrefs = {
  rangeMonths: 6,
  selectedMonthKey: null,
  chartView: "range",
};

function isRange(n: number): n is RevenueChartRange {
  return n === 3 || n === 6 || n === 12;
}

function isChartView(v: unknown): v is OwnerRevenueChartView {
  return v === "range" || v === "day";
}

export function loadOwnerRevenueChartPrefs(): OwnerRevenueChartPrefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_PREFS };
    const parsed = JSON.parse(raw) as Partial<
      OwnerRevenueChartPrefs & { selectedMonthKeys?: string[] }
    >;
    const rangeMonths = Number(parsed.rangeMonths);
    let selectedMonthKey: string | null = null;
    if (typeof parsed.selectedMonthKey === "string") {
      selectedMonthKey = parsed.selectedMonthKey;
    } else if (Array.isArray(parsed.selectedMonthKeys) && parsed.selectedMonthKeys.length > 0) {
      selectedMonthKey = parsed.selectedMonthKeys[parsed.selectedMonthKeys.length - 1] ?? null;
    }
    const chartView = isChartView(parsed.chartView)
      ? parsed.chartView
      : selectedMonthKey
        ? "day"
        : "range";
    return {
      rangeMonths: isRange(rangeMonths) ? rangeMonths : DEFAULT_PREFS.rangeMonths,
      selectedMonthKey,
      chartView,
    };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

export function saveOwnerRevenueChartPrefs(prefs: OwnerRevenueChartPrefs): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
}

/** Garante um mês válido; padrão = último mês do intervalo (atual). */
export function reconcileSelectedMonth(
  availableKeys: string[],
  selected: string | null
): string | null {
  if (availableKeys.length === 0) return null;
  if (selected && availableKeys.includes(selected)) return selected;
  return availableKeys[availableKeys.length - 1] ?? null;
}
