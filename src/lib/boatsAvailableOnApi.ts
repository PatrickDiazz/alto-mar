import { apiUrl } from "@/lib/auth";

export type BoatAvailableOnSnippet = {
  id: string;
  nome: string;
  distancia: string;
  nota: string;
  preco: string;
};

/** Embarcações com o dia livre para reserva (público). */
export async function fetchBoatsAvailableOn(dateIso: string): Promise<BoatAvailableOnSnippet[]> {
  const params = new URLSearchParams({ date: dateIso });
  const resp = await fetch(`${apiUrl("/api/public/boats-available-on")}?${params.toString()}`);
  if (!resp.ok) {
    const t = await resp.text().catch(() => "");
    throw new Error(t || "boats-available-on");
  }
  const data = (await resp.json()) as { boats?: BoatAvailableOnSnippet[] };
  return Array.isArray(data.boats) ? data.boats : [];
}
