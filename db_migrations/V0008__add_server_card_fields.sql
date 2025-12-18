ALTER TABLE servers 
ADD COLUMN IF NOT EXISTS mode VARCHAR(100),
ADD COLUMN IF NOT EXISTS ip VARCHAR(100),
ADD COLUMN IF NOT EXISTS server_ip VARCHAR(100),
ADD COLUMN IF NOT EXISTS battlemetrics_id VARCHAR(100),
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS features JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS detailed_description JSONB,
ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_servers_display_order ON servers(display_order);
CREATE INDEX IF NOT EXISTS idx_servers_battlemetrics_id ON servers(battlemetrics_id);