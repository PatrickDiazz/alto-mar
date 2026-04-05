-- Opção opcional de moto aquática por embarcação + escolha na reserva.

ALTER TABLE boats ADD COLUMN IF NOT EXISTS jet_ski_offered boolean NOT NULL DEFAULT false;
ALTER TABLE boats ADD COLUMN IF NOT EXISTS jet_ski_price_cents integer NOT NULL DEFAULT 0
  CHECK (jet_ski_price_cents >= 0);
ALTER TABLE boats ADD COLUMN IF NOT EXISTS jet_ski_image_urls text[] NOT NULL DEFAULT '{}'::text[];
ALTER TABLE boats ADD COLUMN IF NOT EXISTS jet_ski_document_url text NULL;

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS jet_ski_selected boolean NOT NULL DEFAULT false;
