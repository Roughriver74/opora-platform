# Настройка продакшена для Beton CRM

## Проблема с авторизацией после деплоя

Если после деплоя не работает вход в систему (ошибка 401), выполните следующие шаги:

### 1. Проверьте .env файл на сервере

Создайте файл `/var/www/beton-crm/.env` с настройками:

```bash
# База данных MongoDB
MONGODB_URI=mongodb://localhost:27017/beton-crm

# JWT секрет для авторизации
JWT_SECRET=your-super-secret-jwt-key-change-this

# Настройки Bitrix24
BITRIX_WEBHOOK_URL=https://your-domain.bitrix24.ru/rest/1/your-webhook-key/
BITRIX_USER_ID=1

# Порт сервера
PORT=5001

# Режим работы
NODE_ENV=production
```

### 2. Создайте администратора вручную

Подключитесь к серверу и выполните:

```bash
cd /var/www/beton-crm/server
npm run create-default-admin:prod
# или напрямую:
node dist/scripts/createDefaultAdmin.js
```

### 3. Проверьте подключение к MongoDB

```bash
# Проверьте, запущен ли MongoDB
sudo systemctl status mongod

# Если не запущен, запустите
sudo systemctl start mongod
sudo systemctl enable mongod
```

### 4. Проверьте логи приложения

```bash
# Посмотрите логи PM2
pm2 logs beton-crm

# Перезапустите приложение
pm2 restart beton-crm
```

## Учетные данные по умолчанию

После успешного создания администратора:

- **Email:** crm@betonexpress.pro
- **Пароль:** Sacre.net13

## Устранение проблем

### Ошибка подключения к MongoDB

1. Убедитесь, что MongoDB установлен и запущен
2. Проверьте правильность MONGODB_URI в .env файле
3. Убедитесь, что база данных доступна

### Ошибка "Неверный email или пароль"

1. Проверьте, что администратор создан в базе данных
2. Убедитесь, что используете правильные учетные данные
3. Проверьте логи сервера на наличие ошибок

### Команды для диагностики

```bash
# Подключение к MongoDB и проверка пользователей
mongo beton-crm
db.users.find({email: "crm@betonexpress.pro"})

# Проверка статуса приложения
pm2 status
pm2 logs beton-crm --lines 50
``` 