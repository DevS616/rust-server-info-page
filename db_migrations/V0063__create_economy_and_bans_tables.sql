CREATE TABLE IF NOT EXISTS economy_balances (
    id SERIAL PRIMARY KEY,
    steamid VARCHAR(32) NOT NULL UNIQUE,
    balance BIGINT NOT NULL DEFAULT 0,
    limit_balance BIGINT NOT NULL DEFAULT 0,
    play_time BIGINT NOT NULL DEFAULT 0,
    last_connection VARCHAR(32),
    is_hide BOOLEAN NOT NULL DEFAULT FALSE,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_economy_balance ON economy_balances (balance DESC);
CREATE INDEX IF NOT EXISTS idx_economy_steamid ON economy_balances (steamid);

CREATE TABLE IF NOT EXISTS bans (
    id SERIAL PRIMARY KEY,
    steamid VARCHAR(32) NOT NULL,
    ip_address VARCHAR(45),
    permanent BOOLEAN NOT NULL DEFAULT FALSE,
    time_unbanned VARCHAR(70),
    reason VARCHAR(255),
    server_name VARCHAR(100),
    server_address VARCHAR(100),
    owner VARCHAR(100),
    name_history TEXT,
    ip_history TEXT,
    steamid_history TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_bans_steamid ON bans (steamid);