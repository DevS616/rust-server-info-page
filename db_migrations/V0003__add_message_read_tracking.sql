-- Добавляем колонку для отслеживания прочитанных сообщений
ALTER TABLE ticket_messages ADD COLUMN IF NOT EXISTS is_read_by_user BOOLEAN DEFAULT FALSE;

-- Создаем индекс для быстрого поиска непрочитанных сообщений
CREATE INDEX IF NOT EXISTS idx_ticket_messages_read_status ON ticket_messages(ticket_id, is_admin_reply, is_read_by_user);

-- Помечаем все существующие сообщения пользователей как прочитанные
UPDATE ticket_messages SET is_read_by_user = TRUE WHERE is_admin_reply = FALSE;

-- Помечаем существующие ответы администраторов как прочитанные (чтобы не спамить старыми уведомлениями)
UPDATE ticket_messages SET is_read_by_user = TRUE WHERE is_admin_reply = TRUE;