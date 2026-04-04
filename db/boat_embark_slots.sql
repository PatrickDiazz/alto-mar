-- Horários de embarque opcionais por barco + coluna de hora na reserva.
-- `embark_location` em bookings passa a poder ser NULL (local a combinar).

CREATE TABLE IF NOT EXISTS boat_embark_slots (
  boat_id uuid NOT NULL REFERENCES boats(id) ON DELETE CASCADE,
  slot_time time NOT NULL,
  sort_order smallint NOT NULL DEFAULT 0,
  PRIMARY KEY (boat_id, slot_time)
);

CREATE INDEX IF NOT EXISTS idx_boat_embark_slots_boat ON boat_embark_slots(boat_id, sort_order);

ALTER TABLE bookings ALTER COLUMN embark_location DROP NOT NULL;

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS embark_time time NULL;
