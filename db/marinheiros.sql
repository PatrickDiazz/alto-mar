-- Tripulação (Marinheiro) — perfis, vínculos e designações
-- Aplicar após schema base: psql -U postgres -d alto_mar -f db/marinheiros.sql

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'marinheiro_approval_status') THEN
    CREATE TYPE marinheiro_approval_status AS ENUM ('PENDENTE', 'APROVADO', 'REPROVADO', 'SUSPENSO');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'marinheiro_funcao') THEN
    CREATE TYPE marinheiro_funcao AS ENUM (
      'CAPITAO', 'MARINHEIRO', 'MESTRE', 'CONDUTOR', 'IMEDIATO', 'TRIPULANTE', 'GUIA_NAUTICO', 'OUTRA'
    );
  END IF;
END $$;

-- Papel marinheiro na conta de utilizador
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'user_role' AND e.enumlabel = 'marinheiro'
  ) THEN
    ALTER TYPE user_role ADD VALUE 'marinheiro';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS marinheiros (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  cpf text NOT NULL,
  birth_date date NOT NULL,
  phone text NOT NULL,
  photo_url text NOT NULL,
  funcao marinheiro_funcao NOT NULL,
  funcao_custom text NULL,
  identity_doc_url text NOT NULL,
  identity_doc_expires_at date NULL,
  nautical_cert_url text NOT NULL,
  nautical_cert_expires_at date NULL,
  approval_status marinheiro_approval_status NOT NULL DEFAULT 'PENDENTE',
  suspension_reason text NULL,
  bio text NULL,
  show_on_boat_detail boolean NOT NULL DEFAULT true,
  review_notes text NULL,
  reviewed_at timestamptz NULL,
  reviewed_by_staff_id uuid NULL REFERENCES staff_users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS marinheiro_locadores (
  marinheiro_id uuid NOT NULL REFERENCES marinheiros(id) ON DELETE CASCADE,
  locador_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (marinheiro_id, locador_user_id)
);

CREATE TABLE IF NOT EXISTS boat_marinheiros (
  boat_id uuid NOT NULL REFERENCES boats(id) ON DELETE CASCADE,
  marinheiro_id uuid NOT NULL REFERENCES marinheiros(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (boat_id, marinheiro_id)
);

CREATE TABLE IF NOT EXISTS booking_marinheiros (
  booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  marinheiro_id uuid NOT NULL REFERENCES marinheiros(id) ON DELETE RESTRICT,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  assigned_by_user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  PRIMARY KEY (booking_id, marinheiro_id)
);

CREATE TABLE IF NOT EXISTS marinheiro_review_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  marinheiro_id uuid NOT NULL REFERENCES marinheiros(id) ON DELETE CASCADE,
  staff_id uuid NULL REFERENCES staff_users(id) ON DELETE SET NULL,
  action text NOT NULL,
  reason text NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_marinheiros_approval ON marinheiros(approval_status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_marinheiro_locadores_locador ON marinheiro_locadores(locador_user_id);
CREATE INDEX IF NOT EXISTS idx_boat_marinheiros_boat ON boat_marinheiros(boat_id);
CREATE INDEX IF NOT EXISTS idx_booking_marinheiros_marinheiro ON booking_marinheiros(marinheiro_id);
