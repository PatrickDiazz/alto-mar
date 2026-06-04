const DEMO_BOAT_REVIEW_AUTHORS = [
  "Camila R.",
  "João P.",
  "Mariana L.",
  "Rafael S.",
  "Beatriz M.",
  "Lucas T.",
];

const DEMO_BOAT_REVIEW_COMMENTS = [
  "Passeio incrível! Marinheiro muito atencioso e embarcação impecável.",
  "Dia perfeito no mar. Embarque organizado e roteiro valeu cada minuto.",
  "Barco confortável e limpo. Voltaria com a família sem pensar duas vezes.",
  "Experiência maravilhosa. Comunicação clara e pontualidade no horário.",
  "Superou as expectativas. Águas lindas e estrutura de segurança em dia.",
  "Ótimo custo-benefício. Equipe simpática do início ao fim do passeio.",
];

export function hashBoatIdForDemo(boatId) {
  let h = 0;
  const s = String(boatId ?? "");
  for (let i = 0; i < s.length; i += 1) {
    h = (h * 31 + s.charCodeAt(i)) >>> 0;
  }
  return h;
}

export function roundBoatRating1(n) {
  return Math.round(Number(n) * 10) / 10;
}

export function buildDemoBoatReviews(boatId) {
  const h = hashBoatIdForDemo(boatId);
  const count = 3 + (h % 3);
  const reviews = [];
  for (let i = 0; i < count; i += 1) {
    const idx = (h + i * 7) % DEMO_BOAT_REVIEW_COMMENTS.length;
    const stars = 4 + ((h + i) % 2);
    const daysAgo = 12 + i * 18 + (h % 9);
    const ratedAt = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString();
    reviews.push({
      stars,
      comment: DEMO_BOAT_REVIEW_COMMENTS[idx],
      authorName: DEMO_BOAT_REVIEW_AUTHORS[(h + i) % DEMO_BOAT_REVIEW_AUTHORS.length],
      ratedAt,
      demo: true,
    });
  }
  return reviews;
}

/** Média exibida: estrelas reais + mock estáveis por embarcação. */
export function computeBoatDisplayRating(boatId, realStars) {
  const demo = buildDemoBoatReviews(boatId);
  const stars = [];
  for (const s of realStars) {
    const n = Number(s);
    if (Number.isFinite(n) && n >= 1 && n <= 5) stars.push(n);
  }
  for (const r of demo) stars.push(r.stars);
  if (!stars.length) return { average: 0, count: 0 };
  const average = roundBoatRating1(stars.reduce((a, b) => a + b, 0) / stars.length);
  return { average, count: stars.length };
}
