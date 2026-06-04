export type BoatReview = {
  stars: number;
  comment: string;
  authorName: string;
  ratedAt: string | null;
  /** Avaliação ilustrativa (mock) — não veio de reserva real. */
  demo?: boolean;
};

export type BoatReviewsResponse = {
  reviews: BoatReview[];
  /** Total de estrelas na média (reais + mock). */
  count: number;
  /** Média combinada reais + mock. */
  average: number;
  /** Só mock, sem avaliações reais. */
  demo?: boolean;
  /** A lista inclui avaliações mock (mesmo com reais). */
  includesDemo?: boolean;
  realCount?: number;
};
