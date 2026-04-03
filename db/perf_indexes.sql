-- Índices de performance (listagem pública / joins por barco).
-- Executar uma vez em bases já criadas antes destes índices existirem no schema.
CREATE INDEX IF NOT EXISTS idx_boats_created_at_desc ON boats(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_embark_locations_boat ON embark_locations(boat_id);
