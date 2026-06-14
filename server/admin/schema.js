import { query } from "../db.js";

export async function ensureAdminSchema() {
  await query(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'staff_role') THEN
        CREATE TYPE staff_role AS ENUM ('STAFF', 'MODERATOR', 'SENIOR_MODERATOR', 'ADMIN');
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ticket_type') THEN
        CREATE TYPE ticket_type AS ENUM (
          'CUSTOMER_SUPPORT', 'HOST_SUPPORT', 'TECHNICAL', 'FINANCIAL',
          'BOOKING_ISSUE', 'COMPLAINT'
        );
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ticket_status') THEN
        CREATE TYPE ticket_status AS ENUM (
          'OPEN', 'WAITING_STAFF', 'WAITING_CUSTOMER', 'WAITING_HOST',
          'IN_PROGRESS', 'ESCALATED', 'RESOLVED', 'CLOSED'
        );
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ticket_priority') THEN
        CREATE TYPE ticket_priority AS ENUM ('URGENT', 'HIGH', 'MEDIUM', 'LOW');
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'boat_review_status') THEN
        CREATE TYPE boat_review_status AS ENUM (
          'DRAFT', 'PENDING_REVIEW', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'SUSPENDED'
        );
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'moderation_action_type') THEN
        CREATE TYPE moderation_action_type AS ENUM (
          'WARNING', 'TEMP_SUSPENSION', 'INDEFINITE_SUSPENSION', 'PERMANENT_BAN'
        );
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'moderation_case_status') THEN
        CREATE TYPE moderation_case_status AS ENUM ('OPEN', 'IN_REVIEW', 'RESOLVED', 'DISMISSED');
      END IF;
    END $$
  `);

  await query(`
    create table if not exists staff_users (
      id uuid primary key default gen_random_uuid(),
      email citext not null unique,
      password_hash text not null,
      name text not null,
      role staff_role not null default 'STAFF',
      active boolean not null default true,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  `);

  await query(`
    alter table boats add column if not exists review_status boat_review_status
  `);
  await query(`
    alter table boats add column if not exists review_notes text null
  `);
  await query(`
    alter table boats add column if not exists reviewed_at timestamptz null
  `);
  await query(`
    alter table boats add column if not exists reviewed_by_staff_id uuid null
      references staff_users(id) on delete set null
  `);

  await query(`
    update boats
    set review_status = case
      when verified = true then 'APPROVED'::boat_review_status
      else 'PENDING_REVIEW'::boat_review_status
    end
    where review_status is null
  `);

  await query(`
    create table if not exists tickets (
      id uuid primary key default gen_random_uuid(),
      type ticket_type not null,
      status ticket_status not null default 'OPEN',
      priority ticket_priority not null default 'MEDIUM',
      subject text not null,
      created_by_user_id uuid not null references users(id) on delete restrict,
      assigned_staff_id uuid null references staff_users(id) on delete set null,
      related_booking_id uuid null references bookings(id) on delete set null,
      related_boat_id uuid null references boats(id) on delete set null,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      resolved_at timestamptz null,
      closed_at timestamptz null
    )
  `);
  await query(`
    create index if not exists idx_tickets_status_created on tickets(status, created_at desc)
  `);
  await query(`
    create index if not exists idx_tickets_user on tickets(created_by_user_id, created_at desc)
  `);

  await query(`
    create table if not exists ticket_messages (
      id uuid primary key default gen_random_uuid(),
      ticket_id uuid not null references tickets(id) on delete cascade,
      author_user_id uuid null references users(id) on delete set null,
      author_staff_id uuid null references staff_users(id) on delete set null,
      body text not null,
      created_at timestamptz not null default now(),
      check (author_user_id is not null or author_staff_id is not null)
    )
  `);
  await query(`
    create index if not exists idx_ticket_messages_ticket on ticket_messages(ticket_id, created_at asc)
  `);

  await query(`
    create table if not exists ticket_tags (
      id uuid primary key default gen_random_uuid(),
      name text not null unique,
      color text not null default '#6366f1',
      created_at timestamptz not null default now()
    )
  `);
  await query(`
    create table if not exists ticket_tag_links (
      ticket_id uuid not null references tickets(id) on delete cascade,
      tag_id uuid not null references ticket_tags(id) on delete cascade,
      primary key (ticket_id, tag_id)
    )
  `);

  await query(`
    create table if not exists boat_review_history (
      id uuid primary key default gen_random_uuid(),
      boat_id uuid not null references boats(id) on delete cascade,
      staff_id uuid null references staff_users(id) on delete set null,
      action text not null,
      reason text null,
      macro_code text null,
      metadata jsonb not null default '{}'::jsonb,
      created_at timestamptz not null default now()
    )
  `);
  await query(`
    create index if not exists idx_boat_review_history_boat on boat_review_history(boat_id, created_at desc)
  `);

  await query(`
    create table if not exists admin_macros (
      id uuid primary key default gen_random_uuid(),
      code text not null unique,
      category text not null,
      title text not null,
      body text not null,
      active boolean not null default true,
      created_at timestamptz not null default now()
    )
  `);

  await query(`
    create table if not exists moderation_cases (
      id uuid primary key default gen_random_uuid(),
      target_user_id uuid null references users(id) on delete set null,
      target_boat_id uuid null references boats(id) on delete set null,
      reporter_user_id uuid null references users(id) on delete set null,
      reason text not null,
      status moderation_case_status not null default 'OPEN',
      assigned_staff_id uuid null references staff_users(id) on delete set null,
      notes text null,
      created_at timestamptz not null default now(),
      resolved_at timestamptz null
    )
  `);
  await query(`
    create index if not exists idx_moderation_cases_status on moderation_cases(status, created_at desc)
  `);

  await query(`
    create table if not exists moderation_actions (
      id uuid primary key default gen_random_uuid(),
      case_id uuid not null references moderation_cases(id) on delete cascade,
      staff_id uuid not null references staff_users(id) on delete restrict,
      action_type moderation_action_type not null,
      reason text not null,
      expires_at timestamptz null,
      created_at timestamptz not null default now()
    )
  `);

  await query(`
    create table if not exists user_suspensions (
      user_id uuid primary key references users(id) on delete cascade,
      active boolean not null default true,
      action_type moderation_action_type not null,
      reason text not null,
      expires_at timestamptz null,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  `);

  await query(`
    create table if not exists chat_reports (
      id uuid primary key default gen_random_uuid(),
      booking_id uuid not null references bookings(id) on delete cascade,
      message_id uuid null references booking_messages(id) on delete set null,
      reporter_user_id uuid not null references users(id) on delete restrict,
      reason text not null,
      status text not null default 'OPEN',
      reviewed_by_staff_id uuid null references staff_users(id) on delete set null,
      resolution_note text null,
      created_at timestamptz not null default now(),
      resolved_at timestamptz null
    )
  `);
  await query(`
    create index if not exists idx_chat_reports_status on chat_reports(status, created_at desc)
  `);

  await query(`
    create table if not exists audit_logs (
      id uuid primary key default gen_random_uuid(),
      actor_staff_id uuid null references staff_users(id) on delete set null,
      action varchar(120) not null,
      entity_type varchar(80) not null,
      entity_id uuid null,
      metadata jsonb not null default '{}'::jsonb,
      created_at timestamptz not null default now()
    )
  `);
  await query(`
    create index if not exists idx_audit_logs_created on audit_logs(created_at desc)
  `);
  await query(`
    create index if not exists idx_audit_logs_entity on audit_logs(entity_type, entity_id)
  `);
  await query(`
    create index if not exists idx_audit_logs_actor on audit_logs(actor_staff_id, created_at desc)
  `);
}
