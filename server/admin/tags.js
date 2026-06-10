import { query } from "../db.js";

/** @param {import('pg').QueryResultRow} row */
function mapTag(row) {
  return { id: row.id, name: row.name, color: row.color, createdAt: row.created_at };
}

export async function listTags() {
  const r = await query(
    `select id, name, color, created_at from ticket_tags order by name asc`
  );
  return r.rows.map(mapTag);
}

/** @param {{ name: string; color?: string }} input */
export async function createTag(input) {
  const r = await query(
    `insert into ticket_tags (name, color) values ($1, $2)
     returning id, name, color, created_at`,
    [input.name.trim(), input.color ?? "#6366f1"]
  );
  return mapTag(r.rows[0]);
}

/** @param {string} ticketId @param {string} tagId */
export async function addTagToTicket(ticketId, tagId) {
  await query(
    `insert into ticket_tag_links (ticket_id, tag_id) values ($1::uuid, $2::uuid)
     on conflict do nothing`,
    [ticketId, tagId]
  );
}

/** @param {string} ticketId @param {string} tagId */
export async function removeTagFromTicket(ticketId, tagId) {
  await query(
    `delete from ticket_tag_links where ticket_id = $1::uuid and tag_id = $2::uuid`,
    [ticketId, tagId]
  );
}

/** @param {string} ticketId */
export async function getTicketTags(ticketId) {
  const r = await query(
    `select t.id, t.name, t.color, t.created_at
     from ticket_tags t
     join ticket_tag_links l on l.tag_id = t.id
     where l.ticket_id = $1::uuid
     order by t.name asc`,
    [ticketId]
  );
  return r.rows.map(mapTag);
}
