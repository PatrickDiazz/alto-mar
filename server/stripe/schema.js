import { query } from "../db.js";

/** Migração idempotente alinhada ao doc Stripe Connect v7 (tabelas + colunas). */
export async function ensureStripeConnectSchema(q = query) {
  await q(`
    do $$ begin
      alter type payment_provider add value 'STRIPE';
    exception
      when duplicate_object then null;
    end $$
  `);

  await q(`alter table users add column if not exists stripe_connect_account_id text null`);

  await q(`alter table bookings add column if not exists stripe_flow_status text null`);
  await q(`alter table bookings add column if not exists platform_fee_cents integer null`);
  await q(`alter table bookings add column if not exists owner_net_cents integer null`);
  await q(`alter table bookings add column if not exists stripe_checkout_session_id text null`);
  await q(`alter table bookings add column if not exists tour_started_at timestamptz null`);
  await q(`alter table bookings add column if not exists tour_completed_at timestamptz null`);
  await q(`alter table bookings add column if not exists renter_notice_code text null`);

  await q(`
    do $$ begin
      alter type payment_status add value 'REFUNDED';
    exception
      when duplicate_object then null;
    end $$
  `);

  await q(`alter table payments add column if not exists stripe_checkout_session_id text null`);
  await q(`alter table payments add column if not exists stripe_payment_intent_id text null`);
  await q(`alter table payments add column if not exists stripe_charge_id text null`);
  await q(`alter table payments add column if not exists amount_cents integer null`);
  await q(`alter table payments add column if not exists currency text null default 'brl'`);
  await q(`alter table payments add column if not exists paid_at timestamptz null`);

  await q(`
    create unique index if not exists uq_payments_stripe_checkout_session_id
      on payments (stripe_checkout_session_id) where stripe_checkout_session_id is not null
  `);
  await q(`
    create unique index if not exists uq_payments_stripe_payment_intent_id
      on payments (stripe_payment_intent_id) where stripe_payment_intent_id is not null
  `);

  await q(`
    create table if not exists stripe_events (
      id text primary key,
      type text not null,
      payload jsonb not null,
      received_at timestamptz not null default now(),
      processed boolean not null default false
    )
  `);
  await q(`create index if not exists idx_stripe_events_processed on stripe_events (processed)`);
  await q(`create index if not exists idx_stripe_events_type on stripe_events (type)`);

  await q(`
    create table if not exists stripe_connect_transfers (
      id uuid primary key default gen_random_uuid(),
      booking_id uuid not null references bookings(id) on delete cascade,
      owner_user_id uuid not null references users(id) on delete restrict,
      stripe_transfer_id text unique,
      amount_cents integer not null check (amount_cents > 0),
      status text not null,
      retry_count integer not null default 0,
      last_error text null,
      metadata jsonb null,
      requested_at timestamptz not null default now(),
      paid_at timestamptz null,
      failed_at timestamptz null,
      updated_at timestamptz not null default now()
    )
  `);
  await q(
    `create index if not exists idx_stripe_connect_transfers_booking on stripe_connect_transfers (booking_id)`
  );
  await q(
    `create index if not exists idx_stripe_connect_transfers_status on stripe_connect_transfers (status)`
  );

  await q(`
    create table if not exists stripe_connect_ledger (
      id bigserial primary key,
      booking_id uuid not null references bookings(id) on delete cascade,
      entry_type text not null,
      amount_cents integer not null,
      running_balance_cents integer not null,
      event_id text not null unique,
      description text null,
      metadata jsonb null,
      created_at timestamptz not null default now()
    )
  `);
  await q(
    `create index if not exists idx_stripe_connect_ledger_booking on stripe_connect_ledger (booking_id, created_at desc)`
  );

  await q(`
    create table if not exists stripe_connect_refunds (
      id uuid primary key default gen_random_uuid(),
      booking_id uuid not null references bookings(id) on delete cascade,
      payment_id uuid not null references payments(id) on delete cascade,
      stripe_refund_id text unique,
      amount_cents integer not null,
      refund_type text not null,
      reason text not null,
      cancelled_by text not null,
      cancelled_by_user_id uuid null references users(id) on delete set null,
      status text not null,
      failure_reason text null,
      stripe_response jsonb null,
      idempotency_key text unique,
      created_at timestamptz not null default now(),
      completed_at timestamptz null
    )
  `);
  await q(
    `create index if not exists idx_stripe_connect_refunds_booking on stripe_connect_refunds (booking_id)`
  );

  await q(`
    create table if not exists stripe_owner_penalties (
      id uuid primary key default gen_random_uuid(),
      booking_id uuid not null references bookings(id) on delete cascade,
      owner_user_id uuid not null references users(id) on delete cascade,
      penalty_amount_cents integer not null,
      penalty_type text not null,
      status text not null,
      deducted_from_transfer_id uuid null references stripe_connect_transfers(id) on delete set null,
      created_at timestamptz not null default now(),
      resolved_at timestamptz null
    )
  `);
}
