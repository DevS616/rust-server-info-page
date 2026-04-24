ALTER TABLE roadmap DROP CONSTRAINT IF EXISTS roadmap_status_check;
ALTER TABLE roadmap ADD CONSTRAINT roadmap_status_check CHECK (status IN ('planned', 'in_progress', 'done', 'fixed'));
