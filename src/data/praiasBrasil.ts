import raw from "./praiasBrasil.json";

/** Lista extensa de praias, orlas e localidades costeiras (Brasil); pode ser ampliada. */
export const PRAIAS_BRASIL = raw as readonly string[];

/** Cidades/regiões costeiras do RJ para seleção por cidade no app. */
export const CIDADES_LITORAL_RJ = [
  "Angra dos Reis/RJ",
  "Arraial do Cabo/RJ",
  "Araruama/RJ",
  "Búzios/RJ",
  "Cabo Frio/RJ",
  "Campos dos Goytacazes/RJ",
  "Carapebus/RJ",
  "Casimiro de Abreu/RJ",
  "Duque de Caxias (Ilha de Paquetá)/RJ",
  "Guapimirim/RJ",
  "Iguaba Grande/RJ",
  "Ilha Grande (Angra dos Reis/RJ)",
  "Itaboraí/RJ",
  "Itaguaí/RJ",
  "Macaé/RJ",
  "Magé/RJ",
  "Mangaratiba/RJ",
  "Maricá/RJ",
  "Niterói/RJ",
  "Paraty/RJ",
  "Praia de Itaúna (Saquarema/RJ)",
  "Quissamã/RJ",
  "Região dos Lagos/RJ",
  "Rio das Ostras/RJ",
  "Rio de Janeiro/RJ",
  "Saquarema/RJ",
  "São Francisco de Itabapoana/RJ",
  "São Gonçalo/RJ",
  "São João da Barra/RJ",
  "São Pedro da Aldeia/RJ",
] as const;

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

/** Distância de edição (Levenshtein); strings curtas, lista pequena — OK em cliente. */
function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array<number>(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[m][n];
}

/** Partes do nome para comparar com erros de digitação (cidade, região, sem sufixo /RJ). */
function tokensFromCidadeLabel(normalizedLabel: string): string[] {
  const noSuf = normalizedLabel.replace(/\s*\/rj\s*$/i, "").trim();
  const parts = noSuf
    .split(/[\s,—/·()]+/)
    .map((p) => p.trim())
    .filter((p) => p.length >= 2);
  return [...new Set([normalizedLabel, noSuf, ...parts])];
}

function maxEditsForQuery(len: number): number {
  if (len <= 3) return 1;
  if (len <= 6) return 2;
  return 3;
}

export function filterCidadesLitoralRJSugestoes(query: string, limit = 12): string[] {
  const q = normalizeSearchText(query.trim());
  if (q.length < 2) return [];
  const maxEdits = maxEditsForQuery(q.length);
  const out: { label: string; score: number }[] = [];

  for (const label of CIDADES_LITORAL_RJ) {
    const n = normalizeSearchText(label);
    const tokens = tokensFromCidadeLabel(n);

    let best = Infinity;

    for (const token of tokens) {
      if (token.startsWith(q)) {
        best = 0;
        break;
      }
      if (token.includes(q)) {
        best = Math.min(best, 1);
        continue;
      }
      const d = levenshtein(q, token);
      best = Math.min(best, d);
      if (token.length >= q.length && q.length >= 3) {
        const head = token.slice(0, Math.min(token.length, q.length + 2));
        best = Math.min(best, levenshtein(q, head));
      }
    }

    const dFull = levenshtein(q, n);
    best = Math.min(best, dFull);

    if (best === 0) {
      out.push({ label, score: 0 });
    } else if (best === 1) {
      out.push({ label, score: 1 });
    } else if (best <= maxEdits) {
      out.push({ label, score: 2 + best });
    } else if (q.length >= 4 && best / Math.max(q.length, 8) <= 0.45) {
      out.push({ label, score: 10 + best });
    }
  }

  out.sort((a, b) => a.score - b.score || a.label.localeCompare(b.label, "pt"));
  return out.slice(0, limit).map((x) => x.label);
}
