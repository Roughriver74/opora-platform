# Обновление системы авторизации Beton CRM

## Изменения в авторизации

### 1. Универсальный вход в систему
- ✅ Изменены тексты с "Вход в админ-панель" на "Вход в систему"
- ✅ Обновлено описание: "Введите пароль для доступа к системе Beton CRM"
- ✅ Убраны упоминания "администратор" в пользу универсальных терминов

### 2. Вход по email + пароль
- ✅ Добавлено поле email в форму авторизации
- ✅ Обновлены типы `LoginCredentials` для поддержки email
- ✅ Переключен endpoint с `/api/auth/admin-login` на `/api/auth/user-login`
- ✅ Добавлена валидация email в форме

### 3. Администратор по умолчанию
- ✅ Создан скрипт `createDefaultAdmin.ts`
- ✅ Email: `crm@betonexpress.pro`
- ✅ Пароль: `Sacre.net13`
- ✅ Роль: `admin`
- ✅ Статус: `active`

### 4. Улучшения AuthContext
- ✅ Обновлен для использования `user-login` endpoint
- ✅ Сохранение полной информации о пользователе (email, firstName, lastName, etc.)
- ✅ Правильная обработка ролей пользователей

## Команды для работы

### Создание админа по умолчанию
```bash
npm run create-default-admin
```

### Данные для входа
- **Email:** crm@betonexpress.pro
- **Пароль:** Sacre.net13

## API Endpoints

### Авторизация пользователя
```
POST /api/auth/user-login
Content-Type: application/json

{
  "email": "crm@betonexpress.pro",
  "password": "Sacre.net13"
}
```

### Ответ сервера
```json
{
  "success": true,
  "accessToken": "...",
  "refreshToken": "...",
  "expiresIn": "15m",
  "user": {
    "id": "...",
    "email": "crm@betonexpress.pro",
    "role": "admin",
    "firstName": "CRM",
    "lastName": "Administrator",
    "fullName": "CRM Administrator"
  }
}
```

## Файлы изменены

### Frontend
- `client/src/components/auth/LoginForm/index.tsx` - добавлено поле email
- `client/src/components/auth/LoginForm/hooks/useLogin.ts` - поддержка email
- `client/src/contexts/auth/types.ts` - обновлены типы
- `client/src/contexts/auth/index.tsx` - переключен на user-login

### Backend
- `server/src/scripts/createDefaultAdmin.ts` - новый скрипт
- `server/package.json` - добавлена команда create-default-admin

## Примечания

1. **Обратная совместимость:** Сохранены все существующие endpoints для админов
2. **Безопасность:** Сохранена вся логика JWT токенов и refresh
3. **Гибкость:** Система поддерживает как админов, так и обычных пользователей

## Следующие шаги

Система готова к использованию. Пользователи могут входить используя email и пароль, а система автоматически определяет их роль и предоставляет соответствующие права доступа. 