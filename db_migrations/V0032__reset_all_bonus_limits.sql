-- Сброс всех лимитов бонусов для всех игроков
-- Устанавливаем таймеры на 8 дней назад, чтобы все бонусы стали доступны
UPDATE daily_bonus_claims 
SET 
    last_spin_time = NOW() - INTERVAL '8 days',
    last_weekly_bonus = NOW() - INTERVAL '8 days';