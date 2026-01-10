-- Таблица для отслеживания ежедневных бонусов по Steam ID
CREATE TABLE IF NOT EXISTS daily_bonus_claims (
    id SERIAL PRIMARY KEY,
    steam_id VARCHAR(255) NOT NULL UNIQUE,
    last_spin_time TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Индекс для быстрого поиска по steam_id
CREATE INDEX IF NOT EXISTS idx_daily_bonus_steam_id ON daily_bonus_claims(steam_id);

-- Индекс для очистки старых записей
CREATE INDEX IF NOT EXISTS idx_daily_bonus_last_spin ON daily_bonus_claims(last_spin_time);
