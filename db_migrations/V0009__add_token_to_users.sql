ALTER TABLE users 
ADD COLUMN IF NOT EXISTS token TEXT;

CREATE INDEX IF NOT EXISTS idx_users_token ON users(token);