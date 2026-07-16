CREATE TABLE IF NOT EXISTS stats_daily_snapshots (
    id SERIAL PRIMARY KEY,
    snapshot_date DATE NOT NULL,
    category VARCHAR(20) NOT NULL,
    rank INT NOT NULL,
    steamid VARCHAR(32) NOT NULL,
    username VARCHAR(255) DEFAULT '',
    avatar TEXT DEFAULT '',
    value BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (snapshot_date, category, rank)
);

CREATE INDEX IF NOT EXISTS idx_snapshots_date_cat ON stats_daily_snapshots (snapshot_date, category);
