ALTER TABLE t_p48919527_rust_server_info_pag.calendar_events
    ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN NOT NULL DEFAULT FALSE;