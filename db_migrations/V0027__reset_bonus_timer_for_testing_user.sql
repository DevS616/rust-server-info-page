-- Сброс таймера бонуса для тестирования
UPDATE daily_bonus_claims 
SET last_spin_time = NOW() - INTERVAL '25 hours'
WHERE steam_id = '76561198995407853';