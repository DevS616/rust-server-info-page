-- Сброс пароля администратора для восстановления доступа
UPDATE admins SET password_hash = 'PLACEHOLDER' WHERE email = 'ad.alex1995@yandex.ru';