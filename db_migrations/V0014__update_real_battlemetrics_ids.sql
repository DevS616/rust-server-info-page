-- Обновление Battlemetrics ID для серверов DevilRust
-- Найденные реальные ID:
-- #1 [PVE] DevilRust X3: 25502145
-- #4 [PVE] DevilRust X10: 25502150

UPDATE t_p48919527_rust_server_info_pag.servers 
SET battlemetrics_id = '25502145' 
WHERE name LIKE '%#1 [PVE] DevilRust X3%';

UPDATE t_p48919527_rust_server_info_pag.servers 
SET battlemetrics_id = '25502150' 
WHERE name LIKE '%#4 [PVE] DevilRust X10%';