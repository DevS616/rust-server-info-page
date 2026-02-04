-- Создание таблицы для событий календаря
CREATE TABLE IF NOT EXISTS calendar_events (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    color VARCHAR(7) NOT NULL DEFAULT '#DC2626',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Индекс для быстрого поиска по дате
CREATE INDEX idx_calendar_events_date ON calendar_events(date);

-- Комментарии к таблице
COMMENT ON TABLE calendar_events IS 'События календаря для отображения на сайте';
COMMENT ON COLUMN calendar_events.date IS 'Дата события';
COMMENT ON COLUMN calendar_events.title IS 'Название события (например: Глобальный вайп)';
COMMENT ON COLUMN calendar_events.description IS 'Подробное описание события';
COMMENT ON COLUMN calendar_events.color IS 'Цвет события в формате HEX (#DC2626)';
