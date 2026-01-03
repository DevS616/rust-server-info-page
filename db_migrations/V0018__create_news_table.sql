CREATE TABLE news (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    date VARCHAR(50) NOT NULL,
    category VARCHAR(20) NOT NULL CHECK (category IN ('update', 'event', 'wipe', 'news')),
    icon VARCHAR(50) NOT NULL DEFAULT 'Newspaper',
    is_published BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_news_published ON news(is_published);
CREATE INDEX idx_news_category ON news(category);
CREATE INDEX idx_news_created_at ON news(created_at DESC);

INSERT INTO news (title, description, date, category, icon) VALUES
('Новогодний ивент 2026', 'Начался праздничный ивент с уникальными наградами и х2 к дропу подарков! Собирайте новогодние ящики и получайте эксклюзивные скины.', '25 декабря 2025', 'event', 'Gift'),
('Еженедельный вайп серверов', 'Запланирован вайп всех х2-х10 серверов. Карты обновлены, добавлены новые монументы. Приготовьтесь к свежему старту!', '4 января 2026', 'wipe', 'RefreshCw'),
('Обновление античита', 'Внедрена новая система защиты от читеров. Мы постоянно работаем над безопасностью игры и честной игровой средой для всех игроков.', '28 декабря 2025', 'update', 'Shield'),
('Открытие 10-го сервера', 'Скоро откроется новый х100 сервер для любителей быстрого прогресса! Следите за анонсами в нашем Telegram канале.', 'Скоро', 'news', 'Rocket');