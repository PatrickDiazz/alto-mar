import { useQuery } from "@tanstack/react-query";
import type { Boat } from "@/lib/types";
import { apiUrl } from "@/lib/auth";

export function useBarcos() {
  const q = useQuery({
    queryKey: ["boats"],
    queryFn: async (): Promise<Boat[]> => {
      const resp = await fetch(apiUrl("/api/boats"));
      if (!resp.ok) throw new Error("Falha ao carregar barcos.");
      const data = (await resp.json()) as { boats: Boat[] };
      return data.boats;
    },
  });
  return q.data ?? [];
}
