-- Добавляем тип обращения: complaint (жалоба) или appeal (апелляция блокировки)
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS complaint_type VARCHAR(20) NOT NULL DEFAULT 'complaint';

-- Добавляем steam_id администраторам для привязки к Steam-аккаунту (назначается суперадмином)
ALTER TABLE admins ADD COLUMN IF NOT EXISTS steam_id VARCHAR(50) NULL;

-- Индексы для ускорения публичных запросов
CREATE INDEX IF NOT EXISTS idx_complaints_status ON complaints(status);
CREATE INDEX IF NOT EXISTS idx_complaints_created_at ON complaints(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_complaints_user_id ON complaints(user_id);
CREATE INDEX IF NOT EXISTS idx_complaint_messages_complaint_id ON complaint_messages(complaint_id);
CREATE INDEX IF NOT EXISTS idx_complaint_messages_is_admin ON complaint_messages(is_admin_reply);
