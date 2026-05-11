import { useQuery } from "@tanstack/react-query";
import type { Boat } from "@/lib/types";
import { apiUrl } from "@/lib/auth";
import i18n from "@/i18n";

/**
 * Um barco por id (detalhes / reserva). Evita carregar a lista completa.
 */
export function useBoat(boatId: string | undefined) {
  return useQuery({
    queryKey: ["boat", boatId ?? ""],
    enabled: Boolean(boatId),
    retry: import.meta.env.DEV ? 1 : 5,
    retryDelay: (attempt) =>
      import.meta.env.DEV ? Math.min(800, 200 + 200 * attempt) : Math.min(4000, 500 + 600 * 2 ** attempt),
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    refetchInterval: (query) => (query.state.status === "error" ? 12_000 : false),
    refetchIntervalInBackground: true,
    staleTime: 120_000,
    gcTime: 10 * 60_000,
    queryFn: async (): Promise<Boat | null> => {
      const id = boatId!;
      const resp = await fetch(apiUrl(`/api/boats/${id}`));
      if (resp.status === 404) return null;
      if (!resp.ok) {
        throw new Error(i18n.t("common.boatsUnavailable"));
      }
      const data = (await resp.json()) as { boat?: Boat };
      return data.boat ?? null;
    },
  });
}
