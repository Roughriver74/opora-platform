# Настройка переменных окружения

## 🔧 Серверные переменные (server/.env)

Создайте файл `server/.env` со следующими переменными:

```env
# База данных
MONGODB_URI=mongodb://localhost:27017/beton-crm

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-in-production

# Главный администратор (может войти при любых обстоятельствах)
SUPER_ADMIN_PASSWORD=superadmin123

# Обычный админ (для обратной совместимости)
ADMIN_PASSWORD=admin123

# Админ пользователь (для создания в базе данных)
ADMIN_EMAIL=admin@beton-crm.ru
ADMIN_FIRST_NAME=Администратор
ADMIN_LAST_NAME=Системы

# Битрикс24
BITRIX24_WEBHOOK_URL=https://your-domain.bitrix24.ru/rest/1/your-webhook-key/

# Порт сервера
PORT=5001
```

## 🔑 Типы авторизации

### 1. Главный администратор (SUPER_ADMIN_PASSWORD)
- **Может войти при любых обстоятельствах**
- Не зависит от базы данных
- Используется в критических ситуациях
- Endpoint: `POST /api/auth/super-admin-login`

### 2. Обычный админ (ADMIN_PASSWORD)
- Fallback если главный админ не настроен
- Используется для совместимости
- Endpoint: `POST /api/auth/admin-login`

### 3. Пользователи из базы данных
- Email + пароль
- Роли: admin/user
- Endpoint: `POST /api/auth/user-login`

## 🚀 Быстрый старт

1. Создайте файл `server/.env` с переменными выше
2. Запустите сервер: `npm run dev`
3. Создайте первого админа: `npm run create-admin`
4. Откройте http://localhost:3000
5. Войдите как главный админ используя `SUPER_ADMIN_PASSWORD`

## 🔐 Рекомендации по безопасности

- Используйте сильные пароли (минимум 12 символов)
- Смените `JWT_SECRET` на случайную строку в продакшене
- Храните `.env` в секрете, добавьте в `.gitignore`
- `SUPER_ADMIN_PASSWORD` должен отличаться от `ADMIN_PASSWORD`

## 🐛 Troubleshooting

### Не могу войти
1. Проверьте правильность `SUPER_ADMIN_PASSWORD` в .env
2. Убедитесь что сервер запущен на правильном порту
3. Попробуйте вход через `/api/auth/super-admin-login`

### Ошибка подключения к БД
1. Проверьте `MONGODB_URI`
2. Убедитесь что MongoDB запущен
3. Проверьте права доступа к базе данных

### Ошибки JWT
1. Убедитесь что `JWT_SECRET` установлен
2. Очистите localStorage в браузере
3. Перезапустите сервер 