CREATE TABLE IF NOT EXISTS site_settings (
  id INTEGER PRIMARY KEY,
  is_maintenance BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO site_settings (id, is_maintenance) VALUES (1, FALSE) ON CONFLICT (id) DO NOTHING;
