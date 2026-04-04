-- Justificativa obrigatória quando o banhista altera a data da reserva (remarcação).

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS reschedule_reason text NULL;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS reschedule_title text NULL;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS reschedule_note text NULL;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS reschedule_attachments text[] NOT NULL DEFAULT '{}'::text[];
