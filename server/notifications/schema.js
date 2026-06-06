import { query } from "../db.js";

export async function ensureNotificationsSchema() {
  await query(`
    create table if not exists user_push_tokens (
      id uuid primary key default gen_random_uuid(),
      user_id uuid not null references users(id) on delete cascade,
      token text not null,
      platform text not null default 'android',
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      unique (user_id, token)
    )
  `);
  await query(`
    create index if not exists idx_user_push_tokens_user
      on user_push_tokens(user_id, updated_at desc)
  `);

  await query(`
    create table if not exists app_notifications (
      id uuid primary key default gen_random_uuid(),
      user_id uuid not null references users(id) on delete cascade,
      type text not null,
      title text not null,
      body text not null,
      path text null,
      booking_id uuid null references bookings(id) on delete set null,
      data jsonb not null default '{}'::jsonb,
      read_at timestamptz null,
      created_at timestamptz not null default now()
    )
  `);
  await query(`
    create index if not exists idx_app_notifications_user_created
      on app_notifications(user_id, created_at desc)
  `);
  await query(`
    create index if not exists idx_app_notifications_user_unread
      on app_notifications(user_id) where read_at is null
  `);
}
