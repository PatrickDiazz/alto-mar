export type BoatReview = {
  stars: number;
  comment: string;
  authorName: string;
  ratedAt: string | null;
};

export type BoatReviewsResponse = {
  reviews: BoatReview[];
  count: number;
  average: number;
  demo?: boolean;
};
