import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { authFetch, getStoredUser } from "@/lib/auth";
import { fetchOwnerDashboard, type OwnerDashboardResponse } from "@/lib/ownerDashboardApi";
import { fetchOwnerBoats, type OwnerBoatRecord } from "@/lib/ownerBoats";
import { fetchOwnerOptionals, type OwnerOptionalRecord } from "@/lib/ownerOptionalsApi";
import { readResponseErrorMessage } from "@/lib/responseError";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

import type { OwnerBookingRow } from "@/lib/ownerBookingTypes";

type OwnerPanelContextValue = {
  boats: OwnerBoatRecord[];
  optionals: OwnerOptionalRecord[];
  bookings: OwnerBookingRow[];
  dashboard: OwnerDashboardResponse | null;
  loading: boolean;
  dashboardLoading: boolean;
  pendingCount: number;
  refreshPainel: () => void;
  reloadBoats: () => Promise<void>;
  reloadOptionals: () => Promise<void>;
  reloadBookings: () => Promise<void>;
  reloadDashboard: () => Promise<void>;
};

const OwnerPanelContext = createContext<OwnerPanelContextValue | null>(null);

export function OwnerPanelProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const user = getStoredUser();
  const isLocatario = user?.role === "locatario";
  const [boats, setBoats] = useState<OwnerBoatRecord[]>([]);
  const [optionals, setOptionals] = useState<OwnerOptionalRecord[]>([]);
  const [bookings, setBookings] = useState<OwnerBookingRow[]>([]);
  const [dashboard, setDashboard] = useState<OwnerDashboardResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [dashboardLoading, setDashboardLoading] = useState(false);

  const reloadBookings = useCallback(async () => {
    if (!isLocatario) return;
    setLoading(true);
    try {
      const resp = await authFetch("/api/owner/bookings");
      if (resp.status === 401) return;
      if (!resp.ok) {
        throw new Error(await readResponseErrorMessage(resp, t("marinheiro.toastBookings")));
      }
      const data = (await resp.json()) as { bookings: OwnerBookingRow[] };
      setBookings(data.bookings || []);
    } catch (e) {
      const m = (e instanceof Error ? e.message : t("marinheiro.toastBookings")).trim();
      toast.error(m || t("marinheiro.toastBookings"), { id: "owner-bookings" });
    } finally {
      setLoading(false);
    }
  }, [isLocatario, t]);

  const reloadBoats = useCallback(async () => {
    if (!isLocatario) return;
    try {
      const list = await fetchOwnerBoats();
      setBoats(list);
    } catch (e) {
      const m = (e instanceof Error ? e.message : t("marinheiro.toastBoats")).trim();
      toast.error(m || t("marinheiro.toastBoats"), { id: "owner-boats" });
    }
  }, [isLocatario, t]);

  const reloadOptionals = useCallback(async () => {
    if (!isLocatario) return;
    try {
      const list = await fetchOwnerOptionals();
      setOptionals(list);
    } catch (e) {
      const m = (e instanceof Error ? e.message : t("ownerPanel.optionalsLoadFail")).trim();
      toast.error(m || t("ownerPanel.optionalsLoadFail"), { id: "owner-optionals" });
    }
  }, [isLocatario, t]);

  const reloadDashboard = useCallback(async () => {
    if (!isLocatario) return;
    setDashboardLoading(true);
    try {
      const data = await fetchOwnerDashboard();
      setDashboard(data);
    } catch {
      /* optional */
    } finally {
      setDashboardLoading(false);
    }
  }, [isLocatario]);

  const refreshPainel = useCallback(() => {
    void reloadDashboard();
    void reloadBoats();
    void reloadOptionals();
    void reloadBookings();
  }, [reloadDashboard, reloadBoats, reloadOptionals, reloadBookings]);

  useEffect(() => {
    if (!isLocatario) return;
    void reloadBoats();
    void reloadOptionals();
    void reloadBookings();
    void reloadDashboard();
  }, [isLocatario, reloadBoats, reloadOptionals, reloadBookings, reloadDashboard]);

  const pendingCount = useMemo(
    () => bookings.filter((b) => b.status === "PENDING").length,
    [bookings]
  );

  const value = useMemo(
    () => ({
      boats,
      optionals,
      bookings,
      dashboard,
      loading,
      dashboardLoading,
      pendingCount,
      refreshPainel,
      reloadBoats,
      reloadOptionals,
      reloadBookings,
      reloadDashboard,
    }),
    [
      boats,
      optionals,
      bookings,
      dashboard,
      loading,
      dashboardLoading,
      pendingCount,
      refreshPainel,
      reloadBoats,
      reloadOptionals,
      reloadBookings,
      reloadDashboard,
    ]
  );

  return <OwnerPanelContext.Provider value={value}>{children}</OwnerPanelContext.Provider>;
}

export function useOwnerPanel() {
  const ctx = useContext(OwnerPanelContext);
  if (!ctx) throw new Error("useOwnerPanel must be used within OwnerPanelProvider");
  return ctx;
}
