CREATE TABLE IF NOT EXISTS servers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_servers_active ON servers(is_active);

INSERT INTO servers (name, is_active) VALUES 
  ('x2 DevilRust', TRUE),
  ('x3 DevilRust', TRUE),
  ('x5 DevilRust', TRUE)
ON CONFLICT (name) DO NOTHING;