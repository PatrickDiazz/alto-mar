-- Inventário de opcionais do locador (1 unidade física por registro).
-- Vinculado a embarcações via owner_optional_boats.
-- Disponibilidade: bloqueada no dia se já usada em reserva PENDING/ACCEPTED/COMPLETED em outra embarcação do mesmo locador.

create table if not exists owner_optionals (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references users(id) on delete cascade,
  kind text not null check (kind in ('vehicle', 'bbq', 'other')),
  title text not null,
  description text not null default '',
  price_cents integer not null default 0,
  image_urls text[] not null default '{}'::text[],
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists owner_optional_boats (
  optional_id uuid not null references owner_optionals(id) on delete cascade,
  boat_id uuid not null references boats(id) on delete cascade,
  primary key (optional_id, boat_id)
);

create index if not exists owner_optionals_owner_idx on owner_optionals (owner_user_id);
create index if not exists owner_optional_boats_boat_idx on owner_optional_boats (boat_id);
