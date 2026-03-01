CREATE TABLE IF NOT EXISTS complaint_ratings (
    id SERIAL PRIMARY KEY,
    complaint_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    moderator_steam_id VARCHAR(50) NOT NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(complaint_id, user_id)
);

ALTER TABLE complaint_moderators ADD COLUMN IF NOT EXISTS rating_sum INTEGER NOT NULL DEFAULT 0;
ALTER TABLE complaint_moderators ADD COLUMN IF NOT EXISTS rating_count INTEGER NOT NULL DEFAULT 0;