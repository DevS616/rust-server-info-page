-- Add promotion settings columns to site_settings table
ALTER TABLE t_p48919527_rust_server_info_pag.site_settings 
ADD COLUMN IF NOT EXISTS promotion_data JSONB NULL DEFAULT '{
  "enabled": true,
  "title": "Временная x2 АКЦИЯ!",
  "subtitle": "При пополнении баланса Донат магазина от 1 000 рублей - 100% бонус",
  "startDate": "2025-12-11T00:00:00",
  "endDate": "2025-12-20T23:59:59",
  "button": {
    "text": "Перейти в магазин",
    "url": "https://devilrust.ru/"
  },
  "styling": {
    "showGifts": true,
    "accentColor": "#FF4400",
    "animation": "pulse"
  },
  "behavior": {
    "showOnce": false,
    "cookieName": "devilrust_promotion_seen"
  }
}'::jsonb;

-- Update existing row with default promotion data if it doesn't exist
UPDATE t_p48919527_rust_server_info_pag.site_settings
SET promotion_data = '{
  "enabled": true,
  "title": "Временная x2 АКЦИЯ!",
  "subtitle": "При пополнении баланса Донат магазина от 1 000 рублей - 100% бонус",
  "startDate": "2025-12-11T00:00:00",
  "endDate": "2025-12-20T23:59:59",
  "button": {
    "text": "Перейти в магазин",
    "url": "https://devilrust.ru/"
  },
  "styling": {
    "showGifts": true,
    "accentColor": "#FF4400",
    "animation": "pulse"
  },
  "behavior": {
    "showOnce": false,
    "cookieName": "devilrust_promotion_seen"
  }
}'::jsonb
WHERE promotion_data IS NULL;