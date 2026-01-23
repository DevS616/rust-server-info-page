-- Добавление колонки для еженедельного бонуса
ALTER TABLE daily_bonus_claims 
ADD COLUMN IF NOT EXISTS last_weekly_bonus TIMESTAMP;

COMMENT ON COLUMN daily_bonus_claims.last_weekly_bonus IS 'Время последнего получения еженедельного бонуса';
