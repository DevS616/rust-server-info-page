-- Добавляем поле is_read_by_admin для отслеживания прочитанных админом сообщений
ALTER TABLE ticket_messages ADD COLUMN IF NOT EXISTS is_read_by_admin BOOLEAN DEFAULT FALSE;

-- Помечаем все существующие сообщения от админов как прочитанные
UPDATE ticket_messages SET is_read_by_admin = TRUE WHERE is_admin_reply = TRUE;

-- Помечаем все сообщения старше 1 дня как прочитанные (предполагаем, что админ их уже видел)
UPDATE ticket_messages SET is_read_by_admin = TRUE WHERE created_at < NOW() - INTERVAL '1 day';