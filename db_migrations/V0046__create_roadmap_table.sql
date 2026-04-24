CREATE TABLE roadmap (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'in_progress', 'done')),
    icon VARCHAR(50) NOT NULL DEFAULT 'Map',
    sort_order INTEGER NOT NULL DEFAULT 0,
    updated_at DATE NOT NULL DEFAULT CURRENT_DATE,
    is_published BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_roadmap_published ON roadmap(is_published);
CREATE INDEX idx_roadmap_sort ON roadmap(sort_order);
