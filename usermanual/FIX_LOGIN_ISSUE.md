# Исправление проблемы входа в систему

## Найденная проблема

**Причина:** Двойное хеширование пароля при создании администратора по умолчанию.

### Что происходило:
1. В скрипте `createDefaultAdmin.ts` пароль хешировался вручную с помощью `bcrypt.hash()`
2. Затем в модели `User` в `pre('save')` хуке пароль хешировался повторно
3. В результате пароль хешировался дважды и авторизация не работала

## Исправление

### 1. Исправлен скрипт создания админа
```typescript
// ❌ Неправильно (двойное хеширование)
const hashedPassword = await bcrypt.hash('Sacre.net13', 10);
const admin = new User({
  password: hashedPassword, // Будет захеширован еще раз в pre('save')
  // ...
});

// ✅ Правильно (одинарное хеширование)  
const admin = new User({
  password: 'Sacre.net13', // Будет захеширован только в pre('save')
  // ...
});
```

### 2. Пересоздан администратор
- Удален старый администратор с двойным хешем
- Создан новый с правильным хешированием пароля

## Данные для входа

- **Email:** crm@betonexpress.pro
- **Пароль:** Sacre.net13

## Проверка работы

Авторизация теперь работает корректно:

```bash
curl -X POST http://localhost:5001/api/auth/user-login \
  -H "Content-Type: application/json" \
  -d '{"email":"crm@betonexpress.pro","password":"Sacre.net13"}'
```

**Ответ сервера:**
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

## Профилактика

При создании пользователей в будущем помните:
- Передавайте пароли в открытом виде в конструктор User
- Модель автоматически захеширует пароль в `pre('save')` хуке
- Не хешируйте пароли вручную перед сохранением в базу 