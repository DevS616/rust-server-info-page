-- Добавление системы оценок для закрытых тикетов
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS rating INTEGER CHECK (rating >= 1 AND rating <= 5);
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS rating_comment TEXT;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS rated_at TIMESTAMP;

-- Индекс для быстрого поиска оцененных тикетов
CREATE INDEX IF NOT EXISTS idx_tickets_rating ON tickets(rating) WHERE rating IS NOT NULL;