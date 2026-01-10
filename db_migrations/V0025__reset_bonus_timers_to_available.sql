-- Сброс таймеров: устанавливаем last_spin_time на 24 часа назад
UPDATE daily_bonus_claims 
SET last_spin_time = NOW() - INTERVAL '24 hours';