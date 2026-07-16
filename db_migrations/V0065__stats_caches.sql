-- Кэш Steam-профилей (ник + аватар), чтобы не дёргать Steam API каждый раз
CREATE TABLE IF NOT EXISTS steam_profile_cache (
    steam_id VARCHAR(32) PRIMARY KEY,
    username VARCHAR(255) DEFAULT '',
    avatar TEXT DEFAULT '',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Кэш готовых топов (JSON), чтобы не пересчитывать при каждом запросе
CREATE TABLE IF NOT EXISTS stats_top_cache (
    cache_key VARCHAR(64) PRIMARY KEY,
    payload JSONB NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
