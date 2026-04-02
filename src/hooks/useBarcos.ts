import { useQuery, type Query } from "@tanstack/react-query";
import type { Boat } from "@/lib/types";
import { apiUrl } from "@/lib/auth";
import { fetchBoatsResponse } from "@/lib/fetchBoatsApi";
import i18n from "@/i18n";

function devBoatsHint() {
  if (!import.meta.env.DEV) return;
  // eslint-disable-next-line no-console
  console.error(
    "[boats] Dica (dev): confirme PostgreSQL ligado, server/.env com DATABASE_URL correcto, e na raiz do repo rode `npm run dev:all` (ou `npm run dev:server` noutro terminal). Teste: http://127.0.0.1:3001/api/health"
  );
}

function boatsRefetchInterval(query: Query<Boat[], Error, Boat[], string[]>) {
  return query.state.status === "error" ? 12_000 : false;
}

export function useBarcos() {
  const q = useQuery({
    queryKey: ["boats"],
    retry: 5,
    retryDelay: (attempt) => Math.min(4000, 500 + 600 * 2 ** attempt),
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchInterval: boatsRefetchInterval,
    refetchIntervalInBackground: true,
    staleTime: 30_000,
    gcTime: 10 * 60_000,
    networkMode: "online",
    queryFn: async (): Promise<Boat[]> => {
      const url = apiUrl("/api/boats");
      let resp: Response;
      try {
        resp = await fetchBoatsResponse(url);
      } catch (e) {
        if (import.meta.env.DEV) {
          // eslint-disable-next-line no-console
          console.error("[boats] fetch failed:", url, e);
          devBoatsHint();
        }
        throw new Error(i18n.t("common.boatsUnavailable"));
      }
      const raw = await resp.text();
      if (!resp.ok) {
        if (import.meta.env.DEV) {
          // eslint-disable-next-line no-console
          console.error("[boats] HTTP", resp.status, url, raw.slice(0, 400));
          if (resp.status === 502 || resp.status === 503 || resp.status === 504) {
            devBoatsHint();
          }
        }
        throw new Error(i18n.t("common.boatsUnavailable"));
      }
      let data: { boats?: Boat[] };
      try {
        data = JSON.parse(raw) as { boats?: Boat[] };
      } catch {
        if (import.meta.env.DEV) {
          // eslint-disable-next-line no-console
          console.error("[boats] non-JSON:", url, raw.slice(0, 300));
          devBoatsHint();
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
    isRefetching: q.isRefetching,
  };
}
