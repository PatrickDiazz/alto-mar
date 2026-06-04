export type OwnerRevenuePeriodPreset =
  | "today"
  | "last7"
  | "last30"
  | "thisMonth"
  | "last3months"
  | "last6months"
  | "last12months"
  | "custom";

export type OwnerRevenuePeriodFilter = {
  preset: OwnerRevenuePeriodPreset;
  from?: string;
  to?: string;
};

const STORAGE_KEY = "alto-mar-owner-revenue-period";

export const OWNER_REVENUE_PERIOD_PRESETS: OwnerRevenuePeriodPreset[] = [
  "today",
  "last7",
  "last30",
  "thisMonth",
  "last3months",
  "last6months",
  "last12months",
  "custom",
];

export function loadOwnerRevenuePeriod(): OwnerRevenuePeriodFilter {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { preset: "last30" };
    const parsed = JSON.parse(raw) as Partial<OwnerRevenuePeriodFilter>;
    const preset = OWNER_REVENUE_PERIOD_PRESETS.includes(
      parsed.preset as OwnerRevenuePeriodPreset
    )
      ? (parsed.preset as OwnerRevenuePeriodPreset)
      : "last30";
    if (preset === "custom" && (!parsed.from || !parsed.to)) {
      return { preset: "last30" };
    }
    return {
      preset,
      from: typeof parsed.from === "string" ? parsed.from.slice(0, 10) : undefined,
      to: typeof parsed.to === "string" ? parsed.to.slice(0, 10) : undefined,
    };
  } catch {
    return { preset: "last30" };
  }
}

export function saveOwnerRevenuePeriod(filter: OwnerRevenuePeriodFilter): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filter));
}

export function periodQueryString(filter: OwnerRevenuePeriodFilter): string {
  const params = new URLSearchParams({ preset: filter.preset });
  if (filter.preset === "custom" && filter.from && filter.to) {
    params.set("from", filter.from);
    params.set("to", filter.to);
  }
  return params.toString();
}

export function formatDeltaPct(pct: number): { text: string; positive: boolean } {
  if (pct > 0) return { text: `+${pct}%`, positive: true };
  if (pct < 0) return { text: `${pct}%`, positive: false };
  return { text: "0%", positive: true };
}
