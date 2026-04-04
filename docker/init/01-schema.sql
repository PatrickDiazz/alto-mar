-- Executado automaticamente na primeira subida do container (POSTGRES_DB=alto_mar).
-- Replica db/schema.sql sem CREATE DATABASE nem \\connect.

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM ('banhista', 'locatario');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'booking_status') THEN
    CREATE TYPE booking_status AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'CANCELLED');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_provider') THEN
    CREATE TYPE payment_provider AS ENUM ('MERCADO_PAGO');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_status') THEN
    CREATE TYPE payment_status AS ENUM ('CREATED', 'PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email citext NOT NULL UNIQUE,
  password_hash text NOT NULL,
  role user_role NOT NULL,
  rg_url text NULL,
  nautical_license_url text NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS boats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name text NOT NULL,
  location_text text NOT NULL,
  price_cents integer NOT NULL CHECK (price_cents >= 0),
  rating numeric(2,1) NOT NULL DEFAULT 0.0 CHECK (rating >= 0 AND rating <= 5),
  size_feet integer NOT NULL CHECK (size_feet >= 0),
  capacity integer NOT NULL CHECK (capacity >= 0),
  type text NOT NULL,
  description text NOT NULL,
  verified boolean NOT NULL DEFAULT false,
  tie_document_url text NULL,
  tiem_document_url text NULL,
  video_url text NULL,
  route_islands text[] NOT NULL DEFAULT '{}'::text[],
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS rg_url text NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS nautical_license_url text NULL;
ALTER TABLE boats ADD COLUMN IF NOT EXISTS tie_document_url text NULL;
ALTER TABLE boats ADD COLUMN IF NOT EXISTS tiem_document_url text NULL;
ALTER TABLE boats ADD COLUMN IF NOT EXISTS video_url text NULL;
ALTER TABLE boats ADD COLUMN IF NOT EXISTS route_islands text[] NOT NULL DEFAULT '{}'::text[];

CREATE TABLE IF NOT EXISTS boat_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  boat_id uuid NOT NULL REFERENCES boats(id) ON DELETE CASCADE,
  url text NOT NULL,
  sort integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS amenities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS boat_amenities (
  boat_id uuid NOT NULL REFERENCES boats(id) ON DELETE CASCADE,
  amenity_id uuid NOT NULL REFERENCES amenities(id) ON DELETE CASCADE,
  included boolean NOT NULL DEFAULT true,
  PRIMARY KEY (boat_id, amenity_id)
);

CREATE TABLE IF NOT EXISTS embark_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  boat_id uuid NOT NULL REFERENCES boats(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (boat_id, name)
);

CREATE TABLE IF NOT EXISTS boat_embark_slots (
  boat_id uuid NOT NULL REFERENCES boats(id) ON DELETE CASCADE,
  slot_time time NOT NULL,
  sort_order smallint NOT NULL DEFAULT 0,
  PRIMARY KEY (boat_id, slot_time)
);

CREATE TABLE IF NOT EXISTS bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  boat_id uuid NOT NULL REFERENCES boats(id) ON DELETE RESTRICT,
  renter_user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  owner_user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  status booking_status NOT NULL DEFAULT 'PENDING',
  passengers_adults integer NOT NULL DEFAULT 1 CHECK (passengers_adults >= 1),
  passengers_children integer NOT NULL DEFAULT 0 CHECK (passengers_children >= 0),
  has_kids boolean NOT NULL DEFAULT false,
  bbq_kit boolean NOT NULL DEFAULT false,
  embark_location text NULL,
  embark_time time NULL,
  total_cents integer NOT NULL CHECK (total_cents >= 0),
  route_islands text[] NOT NULL DEFAULT '{}'::text[],
  booking_date date NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC')::date,
  reschedule_reason text NULL,
  reschedule_title text NULL,
  reschedule_note text NULL,
  reschedule_attachments text[] NOT NULL DEFAULT '{}'::text[],
  created_at timestamptz NOT NULL DEFAULT now(),
  decided_at timestamptz NULL,
  decision_note text NULL
);

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS route_islands text[] NOT NULL DEFAULT '{}'::text[];
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS booking_date date;

CREATE TABLE IF NOT EXISTS boat_date_locks (
  boat_id uuid NOT NULL REFERENCES boats(id) ON DELETE CASCADE,
  locked_date date NOT NULL,
  PRIMARY KEY (boat_id, locked_date)
);

CREATE TABLE IF NOT EXISTS boat_weekday_locks (
  boat_id uuid NOT NULL REFERENCES boats(id) ON DELETE CASCADE,
  weekday smallint NOT NULL CHECK (weekday >= 0 AND weekday <= 6),
  PRIMARY KEY (boat_id, weekday)
);

CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL UNIQUE REFERENCES bookings(id) ON DELETE CASCADE,
  provider payment_provider NOT NULL DEFAULT 'MERCADO_PAGO',
  mp_preference_id text NULL,
  mp_init_point text NULL,
  status payment_status NOT NULL DEFAULT 'CREATED',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  token_hash text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_boat_favorites (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  boat_id uuid NOT NULL REFERENCES boats(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, boat_id)
);

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

CREATE INDEX IF NOT EXISTS idx_boats_owner ON boats(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_boats_created_at_desc ON boats(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_embark_locations_boat ON embark_locations(boat_id);
CREATE INDEX IF NOT EXISTS idx_boat_embark_slots_boat ON boat_embark_slots(boat_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_bookings_owner_status ON bookings(owner_user_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bookings_renter ON bookings(renter_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bookings_boat_date ON bookings(boat_id, booking_date);
CREATE INDEX IF NOT EXISTS idx_boat_images_boat_sort ON boat_images(boat_id, sort);
CREATE INDEX IF NOT EXISTS idx_password_reset_user ON password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_user_boat_favorites_user ON user_boat_favorites(user_id, created_at DESC);

CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_payments_updated_at'
  ) THEN
    CREATE TRIGGER trg_payments_updated_at
    BEFORE UPDATE ON payments
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();
  END IF;
END $$;
