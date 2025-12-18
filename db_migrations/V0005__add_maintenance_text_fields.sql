ALTER TABLE site_settings 
ADD COLUMN IF NOT EXISTS maintenance_title TEXT DEFAULT 'Сайт временно закрыт на технические работы',
ADD COLUMN IF NOT EXISTS maintenance_subtitle TEXT DEFAULT 'Подпишитесь на наш Telegram, чтобы узнать больше о завершении работ';
