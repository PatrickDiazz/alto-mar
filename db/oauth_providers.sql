-- Login social (Google / Facebook)
-- Executar uma vez no PostgreSQL existente:
--   psql "$DATABASE_URL" -f db/oauth_providers.sql

ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id text NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS facebook_id text NULL;

CREATE UNIQUE INDEX IF NOT EXISTS users_google_id_key
  ON users (google_id) WHERE google_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS users_facebook_id_key
  ON users (facebook_id) WHERE facebook_id IS NOT NULL;
