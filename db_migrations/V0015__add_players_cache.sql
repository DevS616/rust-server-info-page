-- Добавление полей для кеширования данных мониторинга

ALTER TABLE t_p48919527_rust_server_info_pag.servers
ADD COLUMN IF NOT EXISTS cached_players INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS players_updated_at TIMESTAMP DEFAULT NOW();

-- Инициализация: установим примерное значение для активных серверов
UPDATE t_p48919527_rust_server_info_pag.servers
SET cached_players = 15, players_updated_at = NOW()
WHERE is_active = true;