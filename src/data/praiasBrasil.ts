import raw from "./praiasBrasil.json";

/** Lista extensa de praias, orlas e localidades costeiras (Brasil); pode ser ampliada. */
export const PRAIAS_BRASIL = raw as readonly string[];

export function normalizeSearchText(s: string) {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function filterPraiasSugestoes(query: string, limit = 10): string[] {
  const q = normalizeSearchText(query.trim());
  if (q.length < 2) return [];
  const out: { label: string; score: number }[] = [];
  for (const label of PRAIAS_BRASIL) {
    const n = normalizeSearchText(label);
    let score: number | null = null;
    if (n.startsWith(q)) score = 0;
    else if (n.split(/[\s,—/·]+/).some((part) => normalizeSearchText(part).startsWith(q))) score = 1;
    else if (n.includes(q)) score = 2;
    if (score !== null) out.push({ label, score });
  }
  out.sort((a, b) => a.score - b.score || a.label.localeCompare(b.label, "pt"));
  const seen = new Set<string>();
  const labels: string[] = [];
  for (const o of out) {
    if (seen.has(o.label)) continue;
    seen.add(o.label);
    labels.push(o.label);
    if (labels.length >= limit) break;
  }
  return labels;
}
