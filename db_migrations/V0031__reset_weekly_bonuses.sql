-- Обнуление еженедельных бонусов для всех пользователей
UPDATE daily_bonus_claims 
SET last_weekly_bonus = NULL 
WHERE last_weekly_bonus IS NOT NULL;