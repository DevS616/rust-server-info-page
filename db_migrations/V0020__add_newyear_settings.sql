ALTER TABLE t_p48919527_rust_server_info_pag.site_settings
ADD COLUMN IF NOT EXISTS newyear_snow_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS newyear_lights_enabled BOOLEAN DEFAULT true;