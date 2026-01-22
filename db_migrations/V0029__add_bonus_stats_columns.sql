-- Добавляем недостающие поля в таблицу daily_bonus_claims
ALTER TABLE daily_bonus_claims 
ADD COLUMN IF NOT EXISTS steam_username VARCHAR(255),
ADD COLUMN IF NOT EXISTS steam_avatar TEXT,
ADD COLUMN IF NOT EXISTS total_spins INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_winnings INTEGER DEFAULT 0;
