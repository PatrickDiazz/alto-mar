import { useQuery } from "@tanstack/react-query";
import type { Boat } from "@/lib/types";
import { apiUrl } from "@/lib/auth";
import i18n from "@/i18n";

export function useBarcos() {
  const q = useQuery({
    queryKey: ["boats"],
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 4000),
    queryFn: async (): Promise<Boat[]> => {
      const url = apiUrl("/api/boats");
      let resp: Response;
      try {
        resp = await fetch(url);
      } catch (e) {
        if (import.meta.env.DEV) {
          // eslint-disable-next-line no-console
          console.error("[boats] fetch failed:", e);
        }
        throw new Error(i18n.t("common.boatsUnavailable"));
      }
      const raw = await resp.text();
      if (!resp.ok) {
        if (import.meta.env.DEV) {
          // eslint-disable-next-line no-console
          console.error("[boats] HTTP", resp.status, raw.slice(0, 400));
        }
        throw new Error(i18n.t("common.boatsUnavailable"));
      }
      let data: { boats?: Boat[] };
      try {
        data = JSON.parse(raw) as { boats?: Boat[] };
      } catch {
        if (import.meta.env.DEV) {
          // eslint-disable-next-line no-console
          console.error("[boats] non-JSON:", raw.slice(0, 300));
        }
        throw new Error(i18n.t("common.boatsUnavailable"));
      }
      return data.boats ?? [];
    },
  });
  return {
    boats: q.data ?? [],
    isLoading: q.isLoading,
    isError: q.isError,
    error: q.error as Error | null,
    refetch: q.refetch,
  };
}
