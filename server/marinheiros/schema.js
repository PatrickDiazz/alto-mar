import { query } from "../db.js";

export async function ensureMarinheirosSchema() {
  await query(`
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
    END $$
  `);

  try {
    await query(`ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'marinheiro'`);
  } catch {
    try {
      await query(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_enum e
            JOIN pg_type t ON t.oid = e.enumtypid
            WHERE t.typname = 'user_role' AND e.enumlabel = 'marinheiro'
          ) THEN
            ALTER TYPE user_role ADD VALUE 'marinheiro';
          END IF;
        END $$
      `);
    } catch {
      /* already exists */
    }
  }

  await query(`
    create table if not exists marinheiros (
      id uuid primary key default gen_random_uuid(),
      user_id uuid not null unique references users(id) on delete cascade,
      cpf text not null,
      birth_date date not null,
      phone text not null,
      photo_url text not null,
      funcao marinheiro_funcao not null,
      funcao_custom text null,
      identity_doc_url text not null,
      identity_doc_expires_at date null,
      nautical_cert_url text not null,
      nautical_cert_expires_at date null,
      approval_status marinheiro_approval_status not null default 'PENDENTE',
      suspension_reason text null,
      bio text null,
      show_on_boat_detail boolean not null default true,
      review_notes text null,
      reviewed_at timestamptz null,
      reviewed_by_staff_id uuid null references staff_users(id) on delete set null,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  `);

  await query(`
    create table if not exists marinheiro_locadores (
      marinheiro_id uuid not null references marinheiros(id) on delete cascade,
      locador_user_id uuid not null references users(id) on delete cascade,
      created_at timestamptz not null default now(),
      primary key (marinheiro_id, locador_user_id)
    )
  `);

  await query(`
    create table if not exists boat_marinheiros (
      boat_id uuid not null references boats(id) on delete cascade,
      marinheiro_id uuid not null references marinheiros(id) on delete cascade,
      created_at timestamptz not null default now(),
      primary key (boat_id, marinheiro_id)
    )
  `);

  await query(`
    create table if not exists booking_marinheiros (
      booking_id uuid not null references bookings(id) on delete cascade,
      marinheiro_id uuid not null references marinheiros(id) on delete restrict,
      assigned_at timestamptz not null default now(),
      assigned_by_user_id uuid not null references users(id) on delete restrict,
      primary key (booking_id, marinheiro_id)
    )
  `);

  await query(`
    create table if not exists marinheiro_review_history (
      id uuid primary key default gen_random_uuid(),
      marinheiro_id uuid not null references marinheiros(id) on delete cascade,
      staff_id uuid null references staff_users(id) on delete set null,
      action text not null,
      reason text null,
      metadata jsonb not null default '{}'::jsonb,
      created_at timestamptz not null default now()
    )
  `);

  await query(`create index if not exists idx_marinheiros_approval on marinheiros(approval_status, created_at desc)`);
  await query(`create index if not exists idx_marinheiro_locadores_locador on marinheiro_locadores(locador_user_id)`);
  await query(`create index if not exists idx_boat_marinheiros_boat on boat_marinheiros(boat_id)`);
  await query(`create index if not exists idx_booking_marinheiros_marinheiro on booking_marinheiros(marinheiro_id)`);
}
