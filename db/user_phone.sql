-- Telefone no cadastro de usuários
--   psql "$DATABASE_URL" -f db/user_phone.sql

ALTER TABLE users ADD COLUMN IF NOT EXISTS phone text NULL;
