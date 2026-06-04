import { authFetch } from "@/lib/auth";

export type OwnerDashboardAgendaDay = {
  date: string;
  availableSlots: number;
};

export type OwnerDashboardStats = {
  tripsCompleted: number;
  tripsMonth: number;
  tripsMonthDeltaPct: number;
  revenueTotalCents: number;
  revenueMonthCents: number;
  revenueMonthDeltaPct: number;
};

export type OwnerDashboardResponse = {
  stats: OwnerDashboardStats;
  agendaPreview: OwnerDashboardAgendaDay[];
  activeBoatsCount: number;
};

export async function fetchOwnerDashboard(): Promise<OwnerDashboardResponse> {
  const resp = await authFetch("/api/owner/dashboard");
  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new Error(text || "dashboard");
  }
  return (await resp.json()) as OwnerDashboardResponse;
}
