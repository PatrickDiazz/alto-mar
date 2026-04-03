import { useQuery, type Query } from "@tanstack/react-query";
import type { Boat } from "@/lib/types";
import { apiUrl } from "@/lib/auth";
import { fetchBoatsResponse } from "@/lib/fetchBoatsApi";
import i18n from "@/i18n";

function devBoatsHint() {
  if (!import.meta.env.DEV) return;
  // eslint-disable-next-line no-console
  console.error(
    "[boats] Dev: 1) `npm.cmd run dev:all` na raiz (Vite :8080 + API :3001)  2) Postgres a correr e `server/.env` com DATABASE_URL  3) Teste API: http://127.0.0.1:3001/api/health"
  );
}

function boatsRefetchInterval(query: Query<Boat[], Error, Boat[], string[]>) {
  return query.state.status === "error" ? 12_000 : false;
}

export function useBarcos(amenityFilters?: string[] | null) {
  const sorted =
    amenityFilters && amenityFilters.length > 0
      ? [...amenityFilters].map((s) => s.trim()).filter(Boolean).sort()
      : null;
  const q = useQuery({
    queryKey: ["boats", sorted?.join("\0") ?? ""],
    retry: import.meta.env.DEV ? 1 : 5,
    retryDelay: (attempt) =>
      import.meta.env.DEV ? Math.min(800, 200 + 200 * attempt) : Math.min(4000, 500 + 600 * 2 ** attempt),
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchInterval: boatsRefetchInterval,
    refetchIntervalInBackground: true,
    staleTime: 30_000,
    gcTime: 10 * 60_000,
    networkMode: "online",
    queryFn: async (): Promise<Boat[]> => {
      const base = apiUrl("/api/boats");
      let url = base;
      if (sorted && sorted.length > 0) {
        const params = new URLSearchParams();
        for (const a of sorted) params.append("amenities", a);
        url = `${base}?${params.toString()}`;
      }
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
