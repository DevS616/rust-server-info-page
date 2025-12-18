# Настройка Telegram бота для уведомлений

## Шаг 1: Проверка секретов

Убедитесь, что в проекте настроены следующие секреты:
- `TELEGRAM_BOT_TOKEN` - токен вашего бота от BotFather
- `JWT_SECRET` - секретный ключ для JWT (должен быть одинаковым во всех функциях)
- `TELEGRAM_CHAT_ID` - ID чата/канала для админских уведомлений (опционально)

## Шаг 2: Установка webhook

После деплоя функции `telegram-webhook`, нужно установить webhook для бота.

Выполните следующий HTTP запрос (замените `YOUR_BOT_TOKEN` на токен вашего бота):

```bash
curl -X POST "https://api.telegram.org/botYOUR_BOT_TOKEN/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://functions.poehali.dev/cb594b05-6249-4b7a-b810-c7e550fa915f"
  }'
```

Или откройте в браузере:
```
https://api.telegram.org/botYOUR_BOT_TOKEN/setWebhook?url=https://functions.poehali.dev/cb594b05-6249-4b7a-b810-c7e550fa915f
```

## Шаг 3: Проверка webhook

Проверить установлен ли webhook:
```
https://api.telegram.org/botYOUR_BOT_TOKEN/getWebhookInfo
```

Должен вернуться ответ с `url` вашей функции.

## Шаг 4: Тестирование

1. На сайте авторизуйтесь через Steam
2. Нажмите "Подключить Telegram"
3. Перейдите по ссылке в бота
4. Нажмите "Start" в боте
5. Бот должен отправить сообщение "✅ Telegram успешно привязан!"

## Как это работает

1. Пользователь нажимает "Подключить Telegram" на сайте
2. Функция `telegram-link` создает JWT токен с `user_id` и `steam_id`
3. Пользователь переходит по ссылке `https://t.me/DevilRustBot?start={token}`
4. Пользователь нажимает "Start" в боте
5. Telegram отправляет webhook на функцию `telegram-webhook`
6. Функция извлекает токен из команды `/start {token}`
7. Функция создает новый токен с `user_id`, `telegram_chat_id`, `telegram_username`
8. Функция вызывает `telegram-link/?action=verify&token=...`
9. Функция `telegram-link` обновляет данные пользователя в БД
10. Бот отправляет подтверждающее сообщение

## Имя бота

В коде используется бот `@DevilRustBot`. Если у вас другое имя бота, измените его в файле:
- `backend/telegram-link/index.py` (строка 196)

## Troubleshooting

- Если webhook не устанавливается - проверьте токен бота
- Если бот не отвечает на /start - проверьте логи функции `telegram-webhook`
- Если привязка не работает - проверьте, что `JWT_SECRET` одинаковый во всех функциях
