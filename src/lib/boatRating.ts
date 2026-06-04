/** Formata nota 0–5 no padrão da UI (vírgula decimal). */
export function formatBoatRatingLabel(rating: number): string {
  const n = Number(rating);
  const v = Number.isFinite(n) ? n : 0;
  return v.toFixed(1).replace(".", ",");
}

export function parseBoatRatingLabel(nota: string): number {
  const n = parseFloat(String(nota).replace(",", ".").trim());
  return Number.isNaN(n) ? 0 : n;
}
