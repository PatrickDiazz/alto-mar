-- Executar no banco já existente (local/produção) para habilitar favoritos por usuário.
CREATE TABLE IF NOT EXISTS user_boat_favorites (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  boat_id uuid NOT NULL REFERENCES boats(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, boat_id)
);

CREATE INDEX IF NOT EXISTS idx_user_boat_favorites_user ON user_boat_favorites(user_id, created_at DESC);

