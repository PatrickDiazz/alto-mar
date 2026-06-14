import { query } from "../db.js";

export async function ensureOAuthSchema() {
  await query(`alter table users alter column password_hash drop not null`);
  await query(`alter table users add column if not exists google_id text null`);
  await query(`alter table users add column if not exists facebook_id text null`);
  await query(`
    create unique index if not exists users_google_id_key
      on users (google_id) where google_id is not null
  `);
  await query(`
    create unique index if not exists users_facebook_id_key
      on users (facebook_id) where facebook_id is not null
  `);
}
