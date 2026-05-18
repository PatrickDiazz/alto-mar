import { useQuery } from "@tanstack/react-query";
import type { BoatReviewsResponse } from "@/lib/boatReviews";
import { apiUrl } from "@/lib/auth";
import i18n from "@/i18n";

export function useBoatReviews(boatId: string | undefined) {
  return useQuery({
    queryKey: ["boat-reviews", boatId ?? ""],
    enabled: Boolean(boatId),
    staleTime: 120_000,
    gcTime: 10 * 60_000,
    refetchOnWindowFocus: false,
    queryFn: async (): Promise<BoatReviewsResponse> => {
      const resp = await fetch(apiUrl(`/api/boats/${boatId}/reviews`));
      if (!resp.ok) {
        throw new Error(i18n.t("detalhes.reviewsLoadError"));
      }
      return (await resp.json()) as BoatReviewsResponse;
    },
  });
}
