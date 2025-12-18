-- Заполнение серверов актуальными данными DevilRust

-- #1 [PVE] DevilRust X3
UPDATE t_p48919527_rust_server_info_pag.servers 
SET 
  mode = 'PVE',
  ip = 'play.devilrust.ru:28015',
  server_ip = '185.246.66.218:28015',
  battlemetrics_id = '13371337',
  description = 'Классический сервер с увеличенными ресурсами х3. Идеален для начинающих игроков.',
  features = '["x3 Ресурсы", "PVE режим", "Телепорты", "Магазин", "Кланы", "Домашняя точка"]'::jsonb,
  detailed_description = '{"title": "Добро пожаловать на DevilRust X3!", "description": "Классический PVE сервер с увеличенными ресурсами х3. Идеальное место для начала игры в Rust с защитой от PVP.", "highlights": [{"icon": "Users", "text": "Активное сообщество игроков"}, {"icon": "Shield", "text": "Полная защита от PVP"}, {"icon": "Zap", "text": "x3 скорость добычи ресурсов"}, {"icon": "Home", "text": "Система телепортов и домов"}]}'::jsonb,
  display_order = 1
WHERE id = 4;

-- #2 [PVE] DevilRust X5
UPDATE t_p48919527_rust_server_info_pag.servers 
SET 
  mode = 'PVE',
  ip = 'play.devilrust.ru:28016',
  server_ip = '185.246.66.218:28016',
  battlemetrics_id = '13371338',
  description = 'Ускоренный фарм х5 для быстрого развития. Комфортная игра без PVP стресса.',
  features = '["x5 Ресурсы", "PVE режим", "Быстрое развитие", "Магазин", "Кланы", "Наборы для новичков"]'::jsonb,
  detailed_description = '{"title": "DevilRust X5 - Быстрое развитие", "description": "PVE сервер с х5 множителем добычи. Быстро развивайтесь и стройте мегапроекты без опасности рейдов.", "highlights": [{"icon": "Zap", "text": "x5 скорость добычи"}, {"icon": "Hammer", "text": "Ускоренное строительство"}, {"icon": "Gift", "text": "Стартовые наборы"}, {"icon": "Users", "text": "Дружное комьюнити"}]}'::jsonb,
  display_order = 2
WHERE id = 5;

-- #3 [PVE] DevilRust X8
UPDATE t_p48919527_rust_server_info_pag.servers 
SET 
  mode = 'PVE',
  ip = 'play.devilrust.ru:28017',
  server_ip = '185.246.66.218:28017',
  battlemetrics_id = '13371339',
  description = 'Максимально ускоренный фарм х8. Стройте грандиозные проекты за считанные часы.',
  features = '["x8 Ресурсы", "PVE режим", "Мгновенное развитие", "Большие стаки", "Магазин", "VIP привилегии"]'::jsonb,
  detailed_description = '{"title": "DevilRust X8 - Мегастройки", "description": "PVE сервер с х8 множителем для любителей масштабных построек. Фармьте быстро, стройте грандиозно!", "highlights": [{"icon": "Rocket", "text": "x8 ускорение фарма"}, {"icon": "Building", "text": "Идеально для мегабаз"}, {"icon": "Package", "text": "Увеличенные стаки"}, {"icon": "Crown", "text": "VIP бонусы"}]}'::jsonb,
  display_order = 3
WHERE id = 6;

-- #4 [PVE] DevilRust X10
UPDATE t_p48919527_rust_server_info_pag.servers 
SET 
  mode = 'PVE',
  ip = 'play.devilrust.ru:28018',
  server_ip = '185.246.66.218:28018',
  battlemetrics_id = '13371340',
  description = 'Экстремальный фарм х10. Для тех, кто хочет сразу к делу - строительству и PVE контенту.',
  features = '["x10 Ресурсы", "PVE режим", "Мгновенное развитие", "Рейды на НПС", "Ивенты", "Награды"]'::jsonb,
  detailed_description = '{"title": "DevilRust X10 - Экстрим фарм", "description": "Максимально ускоренный PVE сервер. Сосредоточьтесь на строительстве, исследовании и PVE событиях.", "highlights": [{"icon": "Flame", "text": "x10 экстрим фарм"}, {"icon": "Target", "text": "PVE рейды и боссы"}, {"icon": "Trophy", "text": "Ивенты с наградами"}, {"icon": "Sparkles", "text": "Быстрый старт"}]}'::jsonb,
  display_order = 4
WHERE id = 7;

-- #5 [PVE] DevilRust X20
UPDATE t_p48919527_rust_server_info_pag.servers 
SET 
  mode = 'PVE',
  ip = 'play.devilrust.ru:28019',
  server_ip = '185.246.66.218:28019',
  battlemetrics_id = '13371341',
  description = 'Невероятная скорость х20. Мгновенный фарм для творческих проектов и экспериментов.',
  features = '["x20 Ресурсы", "PVE режим", "Креативный режим", "Безлимитные ресурсы", "Творческие проекты", "Песочница"]'::jsonb,
  detailed_description = '{"title": "DevilRust X20 - Креатив мод", "description": "Почти креативный режим с х20 множителем. Воплощайте любые идеи без ограничений!", "highlights": [{"icon": "Infinity", "text": "x20 мега фарм"}, {"icon": "Palette", "text": "Креативные проекты"}, {"icon": "Blocks", "text": "Режим песочницы"}, {"icon": "Lightbulb", "text": "Эксперименты без границ"}]}'::jsonb,
  display_order = 5
WHERE id = 8;

-- #6 [PVE] DevilRust EASYBUILD
UPDATE t_p48919527_rust_server_info_pag.servers 
SET 
  mode = 'PVE',
  ip = 'play.devilrust.ru:28020',
  server_ip = '185.246.66.218:28020',
  battlemetrics_id = '13371342',
  description = 'Упрощенное строительство для архитекторов. Стройте сложные конструкции легко.',
  features = '["Упрощенное строительство", "PVE режим", "Нет урона падения", "Летающие лестницы", "Архитектурные проекты", "Творческая свобода"]'::jsonb,
  detailed_description = '{"title": "DevilRust EASYBUILD - Для архитекторов", "description": "Специальный сервер для строителей с упрощенными механиками. Создавайте шедевры архитектуры!", "highlights": [{"icon": "Hammer", "text": "Упрощенное строительство"}, {"icon": "Home", "text": "Архитектурные проекты"}, {"icon": "Feather", "text": "Нет урона от падения"}, {"icon": "Ruler", "text": "Творческие инструменты"}]}'::jsonb,
  display_order = 6
WHERE id = 9;

-- #7 [PVE] DevilRust VANILLA
UPDATE t_p48919527_rust_server_info_pag.servers 
SET 
  mode = 'PVE',
  ip = 'play.devilrust.ru:28021',
  server_ip = '185.246.66.218:28021',
  battlemetrics_id = '13371343',
  description = 'Классический Rust без модификаций. Оригинальный игровой опыт в PVE режиме.',
  features = '["Ванильный Rust", "PVE режим", "Без модов", "Оригинальный геймплей", "Классический опыт", "Чистая игра"]'::jsonb,
  detailed_description = '{"title": "DevilRust VANILLA - Оригинальный Rust", "description": "Чистый ванильный Rust без модификаций в PVE режиме. Испытайте оригинальный игровой опыт.", "highlights": [{"icon": "Circle", "text": "100% ванильный опыт"}, {"icon": "Shield", "text": "PVE защита"}, {"icon": "Compass", "text": "Оригинальный баланс"}, {"icon": "Heart", "text": "Классический Rust"}]}'::jsonb,
  display_order = 7
WHERE id = 10;

-- #8 [PVP] DevilRust DUO
UPDATE t_p48919527_rust_server_info_pag.servers 
SET 
  mode = 'PVP',
  ip = 'play.devilrust.ru:28022',
  server_ip = '185.246.66.218:28022',
  battlemetrics_id = '13371344',
  description = 'PVP сервер с ограничением на 2 игрока в команде. Честная битва парами.',
  features = '["PVP режим", "Только DUO", "x2 Ресурсы", "Еженедельный вайп", "Рейды", "Конкурентная игра"]'::jsonb,
  detailed_description = '{"title": "DevilRust DUO - Парный PVP", "description": "PVP сервер с ограничением команды до 2 игроков. Честная конкурентная игра без больших кланов.", "highlights": [{"icon": "Swords", "text": "Только команды из 2х"}, {"icon": "Target", "text": "Честный PVP"}, {"icon": "Zap", "text": "x2 ресурсы"}, {"icon": "Calendar", "text": "Еженедельный вайп"}]}'::jsonb,
  display_order = 8,
  is_active = true
WHERE id = 11;

-- #9 [PVP] DevilRust NOLIM
UPDATE t_p48919527_rust_server_info_pag.servers 
SET 
  mode = 'PVP',
  ip = 'play.devilrust.ru:28023',
  server_ip = '185.246.66.218:28023',
  battlemetrics_id = '13371345',
  description = 'PVP сервер без ограничений на размер команды. Масштабные клановые войны.',
  features = '["PVP режим", "Без лимита команды", "x2 Ресурсы", "Клановые войны", "Рейды", "Ивенты"]'::jsonb,
  detailed_description = '{"title": "DevilRust NOLIM - Клановые войны", "description": "PVP сервер без ограничений. Создавайте огромные кланы и участвуйте в эпических сражениях!", "highlights": [{"icon": "Users", "text": "Безлимитные команды"}, {"icon": "Sword", "text": "Масштабные битвы"}, {"icon": "Castle", "text": "Клановые войны"}, {"icon": "Trophy", "text": "PVP ивенты"}]}'::jsonb,
  display_order = 9
WHERE id = 12;