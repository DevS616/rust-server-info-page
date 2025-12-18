-- Добавление колонки для хранения временного токена привязки Telegram
ALTER TABLE users ADD COLUMN IF NOT EXISTS telegram_link_token TEXT;

-- Создание индекса для быстрого поиска по токену
CREATE INDEX IF NOT EXISTS idx_users_telegram_link_token ON users(telegram_link_token) WHERE telegram_link_token IS NOT NULL;
