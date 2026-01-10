-- Таблица для прайс-листа (услуги/товары)
CREATE TABLE IF NOT EXISTS price_items (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    price INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT true,
    position INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица для сборов средств
CREATE TABLE IF NOT EXISTS fundraisers (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    goal_amount INTEGER NOT NULL,
    current_amount INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

-- Таблица для истории пополнений сборов
CREATE TABLE IF NOT EXISTS fundraiser_donations (
    id SERIAL PRIMARY KEY,
    fundraiser_id INTEGER NOT NULL REFERENCES fundraisers(id),
    steam_id VARCHAR(100),
    steam_username VARCHAR(255),
    amount INTEGER NOT NULL,
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Индексы для оптимизации
CREATE INDEX IF NOT EXISTS idx_price_items_active ON price_items(is_active, position);
CREATE INDEX IF NOT EXISTS idx_fundraisers_active ON fundraisers(is_active, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_donations_fundraiser ON fundraiser_donations(fundraiser_id, created_at DESC);