import { useQuery } from "@tanstack/react-query";
import type { Boat } from "@/lib/types";
import { apiUrl } from "@/lib/auth";

export function useBarcos() {
  const q = useQuery({
    queryKey: ["boats"],
    queryFn: async (): Promise<Boat[]> => {
      const url = apiUrl("/api/boats");
      const resp = await fetch(url);
      const raw = await resp.text();
      if (!resp.ok) {
        throw new Error(
          `Falha ao carregar barcos (${resp.status}). Confira se a API está no ar e se VITE_API_BASE_URL no Vercel aponta para a URL da Railway (ex.: https://...up.railway.app), sem barra no final.`
        );
      }
      let data: { boats?: Boat[] };
      try {
        data = JSON.parse(raw) as { boats?: Boat[] };
      } catch {
        throw new Error(
          "A resposta da API não é JSON. No Vercel, defina VITE_API_BASE_URL com a URL pública da API (Railway). Sem isso, o site tenta buscar /api no domínio do Vercel e não encontra os barcos."
        );
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
