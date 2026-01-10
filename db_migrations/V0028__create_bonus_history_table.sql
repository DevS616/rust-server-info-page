-- Создание таблицы для истории выданных бонусов
CREATE TABLE IF NOT EXISTS bonus_history (
    id SERIAL PRIMARY KEY,
    steam_id VARCHAR(255) NOT NULL,
    amount INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_bonus_history_steam_id ON bonus_history(steam_id);
