-- Chat por reserva (banhista ↔ locador)
CREATE TABLE IF NOT EXISTS booking_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  sender_user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  body text NOT NULL CHECK (char_length(trim(body)) BETWEEN 1 AND 2000),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_booking_messages_booking_created
  ON booking_messages (booking_id, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_booking_messages_booking_id_desc
  ON booking_messages (booking_id, created_at DESC);

CREATE TABLE IF NOT EXISTS booking_message_reads (
  booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  last_read_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (booking_id, user_id)
);

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS last_message_at timestamptz NULL;
