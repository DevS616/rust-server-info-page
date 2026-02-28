CREATE TABLE IF NOT EXISTS t_p48919527_rust_server_info_pag.complaints (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES t_p48919527_rust_server_info_pag.users(id),
    complaint_against VARCHAR(50) NOT NULL,
    subject VARCHAR(500) NOT NULL,
    reason TEXT NOT NULL,
    file_url TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'open',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS t_p48919527_rust_server_info_pag.complaint_messages (
    id SERIAL PRIMARY KEY,
    complaint_id INTEGER REFERENCES t_p48919527_rust_server_info_pag.complaints(id),
    user_id INTEGER REFERENCES t_p48919527_rust_server_info_pag.users(id),
    message TEXT NOT NULL,
    file_url TEXT,
    is_admin_reply BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_complaints_user_id ON t_p48919527_rust_server_info_pag.complaints(user_id);
CREATE INDEX IF NOT EXISTS idx_complaints_status ON t_p48919527_rust_server_info_pag.complaints(status);
CREATE INDEX IF NOT EXISTS idx_complaint_messages_complaint_id ON t_p48919527_rust_server_info_pag.complaint_messages(complaint_id);