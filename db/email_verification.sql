-- Confirmação de email no cadastro
-- Executar uma vez no PostgreSQL existente:
--   psql "$DATABASE_URL" -f db/email_verification.sql

ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at timestamptz NULL;

-- Contas já existentes permanecem utilizáveis
UPDATE users SET email_verified_at = COALESCE(email_verified_at, created_at) WHERE email_verified_at IS NULL;

CREATE TABLE IF NOT EXISTS email_verification_tokens (
  token_hash text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS email_verification_tokens_user_id_idx
  ON email_verification_tokens (user_id);

CREATE INDEX IF NOT EXISTS email_verification_tokens_expires_at_idx
  ON email_verification_tokens (expires_at);
