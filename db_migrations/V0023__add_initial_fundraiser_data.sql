-- Добавляем начальный сбор на разработку админ-панели
INSERT INTO fundraisers (title, description, goal_amount, current_amount, is_active, status, created_at) 
VALUES (
    'Разработка админ-панели', 
    'Сбор средств на создание и развитие функционала административной панели для управления сервером. Планируется добавить систему тикетов, управление новостями, настройку акций и другие инструменты.', 
    47000, 
    19367, 
    true, 
    'active', 
    '2025-01-05 10:00:00'
);

-- Добавляем фейковую историю пополнений
INSERT INTO fundraiser_donations (fundraiser_id, steam_id, steam_username, amount, comment, created_at) VALUES
((SELECT id FROM fundraisers WHERE title = 'Разработка админ-панели'), '76561198012345678', 'PlayerOne', 5000, 'Отличная идея! Поддерживаю проект', '2025-01-05 12:30:00'),
((SELECT id FROM fundraisers WHERE title = 'Разработка админ-панели'), '76561198087654321', 'GamerPro', 3500, 'Ждём обновления!', '2025-01-05 15:20:00'),
((SELECT id FROM fundraisers WHERE title = 'Разработка админ-панели'), NULL, 'Аноним', 2000, '', '2025-01-06 09:15:00'),
((SELECT id FROM fundraisers WHERE title = 'Разработка админ-панели'), '76561198023456789', 'CS_Master', 4000, 'За развитие сервера!', '2025-01-06 18:45:00'),
((SELECT id FROM fundraisers WHERE title = 'Разработка админ-панели'), '76561198034567890', 'TopPlayer', 1500, '', '2025-01-07 11:00:00'),
((SELECT id FROM fundraisers WHERE title = 'Разработка админ-панели'), NULL, 'Аноним', 1000, 'Небольшой вклад', '2025-01-07 14:30:00'),
((SELECT id FROM fundraisers WHERE title = 'Разработка админ-панели'), '76561198045678901', 'NinjaGamer', 1367, 'Последний рубль отдаю!', '2025-01-08 10:20:00'),
((SELECT id FROM fundraisers WHERE title = 'Разработка админ-панели'), '76561198056789012', 'ProSkill', 1000, '', '2025-01-08 16:50:00');