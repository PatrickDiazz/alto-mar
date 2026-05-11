import { useMemo } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import type { Boat } from "@/lib/types";
import { apiUrl } from "@/lib/auth";
import { fetchBoatsResponse } from "@/lib/fetchBoatsApi";
import i18n from "@/i18n";

/** Tamanho de página alinhado ao servidor (GET /api/boats?limit=&offset=). */
export const EXPLORE_BOATS_PAGE_SIZE = 14;

export type BoatsPage = {
  boats: Boat[];
  offset: number;
  limit: number;
  hasMore: boolean;
};

export function useBarcosInfinite(amenityFilters?: string[] | null) {
  const sorted =
    amenityFilters && amenityFilters.length > 0
      ? [...amenityFilters].map((s) => s.trim()).filter(Boolean).sort()
      : null;

  const q = useInfiniteQuery({
    queryKey: ["boats", "infinite", sorted?.join("\0") ?? "", String(EXPLORE_BOATS_PAGE_SIZE)],
    initialPageParam: 0,
    retry: import.meta.env.DEV ? 1 : 5,
    retryDelay: (attempt) =>
      import.meta.env.DEV ? Math.min(800, 200 + 200 * attempt) : Math.min(4000, 500 + 600 * 2 ** attempt),
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    refetchInterval: (query) => (query.state.status === "error" ? 12_000 : false),
    refetchIntervalInBackground: true,
    staleTime: 120_000,
    gcTime: 10 * 60_000,
    networkMode: "online",
    getNextPageParam: (lastPage) => {
      if (!lastPage.hasMore || lastPage.boats.length === 0) return undefined;
      return lastPage.offset + lastPage.boats.length;
    },
    queryFn: async ({ pageParam }): Promise<BoatsPage> => {
      const offset = pageParam as number;
      const params = new URLSearchParams();
      params.set("limit", String(EXPLORE_BOATS_PAGE_SIZE));
      params.set("offset", String(offset));
      if (sorted) {
        for (const a of sorted) params.append("amenities", a);
      }
      const url = `${apiUrl("/api/boats")}?${params.toString()}`;
      let resp: Response;
      try {
        resp = await fetchBoatsResponse(url);
      } catch {
        throw new Error(i18n.t("common.boatsUnavailable"));
      }
      const raw = await resp.text();
      if (!resp.ok) throw new Error(i18n.t("common.boatsUnavailable"));
      let data: {
        boats?: Boat[];
        hasMore?: boolean;
        offset?: number;
        limit?: number;
      };
      try {
        data = JSON.parse(raw) as typeof data;
      } catch {
        throw new Error(i18n.t("common.boatsUnavailable"));
      }
      const boats = data.boats ?? [];
      const hasMore =
        typeof data.hasMore === "boolean"
          ? data.hasMore
          : boats.length >= EXPLORE_BOATS_PAGE_SIZE;
      return {
        boats,
        offset: typeof data.offset === "number" ? data.offset : offset,
        limit: typeof data.limit === "number" ? data.limit : EXPLORE_BOATS_PAGE_SIZE,
        hasMore,
      };
    },
  });

  const boats = useMemo(() => q.data?.pages.flatMap((p) => p.boats) ?? [], [q.data]);

  return {
    boats,
    isLoading: q.isLoading,
    isError: q.isError,
    error: q.error as Error | null,
    refetch: q.refetch,
    isRefetching: q.isRefetching,
    fetchNextPage: q.fetchNextPage,
    hasNextPage: q.hasNextPage,
    isFetchingNextPage: q.isFetchingNextPage,
  };
}
