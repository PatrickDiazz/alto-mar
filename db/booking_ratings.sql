-- Avaliações por reserva (banhista → barco; locador → banhista).
-- Execute após o schema base, em bases já existentes.

ALTER TABLE users ADD COLUMN IF NOT EXISTS guest_rating numeric(2,1) NOT NULL DEFAULT 0.0
  CHECK (guest_rating >= 0 AND guest_rating <= 5);

CREATE TABLE IF NOT EXISTS booking_ratings (
  booking_id uuid PRIMARY KEY REFERENCES bookings(id) ON DELETE CASCADE,
  boat_stars smallint NULL CHECK (boat_stars IS NULL OR (boat_stars >= 1 AND boat_stars <= 5)),
  boat_comment text NULL,
  boat_rated_at timestamptz NULL,
  renter_stars smallint NULL CHECK (renter_stars IS NULL OR (renter_stars >= 1 AND renter_stars <= 5)),
  renter_comment text NULL,
  renter_rated_at timestamptz NULL
);
