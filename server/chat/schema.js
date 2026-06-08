import { query } from "../db.js";

export async function ensureBookingChatSchema() {
  await query(`
    create table if not exists booking_messages (
      id uuid primary key default gen_random_uuid(),
      booking_id uuid not null references bookings(id) on delete cascade,
      sender_user_id uuid not null references users(id) on delete restrict,
      body text not null check (char_length(trim(body)) between 1 and 2000),
      created_at timestamptz not null default now()
    )
  `);
  await query(`
    create index if not exists idx_booking_messages_booking_created
      on booking_messages (booking_id, created_at asc)
  `);
  await query(`
    create index if not exists idx_booking_messages_booking_id_desc
      on booking_messages (booking_id, created_at desc)
  `);
  await query(`
    create table if not exists booking_message_reads (
      booking_id uuid not null references bookings(id) on delete cascade,
      user_id uuid not null references users(id) on delete cascade,
      last_read_at timestamptz not null default now(),
      primary key (booking_id, user_id)
    )
  `);
  await query(`
    alter table bookings add column if not exists last_message_at timestamptz null
  `);
}
