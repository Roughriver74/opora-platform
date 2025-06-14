# Система авторизации Beton CRM

## 🔐 Обзор

Система авторизации реализована с использованием JWT токенов (access + refresh) и поддерживает две роли пользователей: **admin** и **user**.

## 📁 Структура Backend

```
server/src/
├── controllers/authController.ts   # Контроллеры авторизации
├── middleware/authMiddleware.ts    # Middleware для проверки токенов
├── services/jwtService.ts          # Сервис для работы с JWT
├── models/
│   ├── User.ts                     # Модель пользователя
│   └── AdminToken.ts               # Модель токенов
├── utils/passwordHash.ts           # Утилиты для хеширования паролей
├── routes/authRoutes.ts            # Роуты авторизации
└── scripts/createAdmin.ts          # Скрипт создания админа
```

## 📁 Структура Frontend

```
client/src/
├── contexts/auth/                  # Контекст авторизации
│   ├── index.tsx                   # AuthProvider
│   └── types.ts                    # Типы
├── components/auth/
│   ├── LoginForm/                  # Форма входа
│   │   ├── index.tsx
│   │   ├── hooks/useLogin.ts
│   │   └── validation.ts
│   └── PrivateRoute/               # Защищенные роуты
│       └── index.tsx
└── services/apiService.ts          # API с автоматическим refresh
```

## 🚀 Использование

### Backend API

#### Авторизация администратора (простой пароль)

```bash
POST /api/auth/admin-login
Content-Type: application/json

{
  "password": "admin_password"
}
```

#### Авторизация пользователя (email + password)

```bash
POST /api/auth/user-login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "user_password"
}
```

#### Обновление токена

```bash
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "refresh_token_here"
}
```

#### Проверка токена

```bash
GET /api/auth/check
Authorization: Bearer access_token_here
```

#### Выход

```bash
POST /api/auth/logout
Authorization: Bearer access_token_here
Content-Type: application/json

{
  "refreshToken": "refresh_token_here"
}
```

### Frontend

#### Использование AuthContext

```tsx
import { useAuth } from '../contexts/auth';

const MyComponent = () => {
  const { isAuthenticated, user, login, logout } = useAuth();

  const handleLogin = async () => {
    const success = await login({ password: 'admin123' });
    if (success) {
      console.log('Вход выполнен');
    }
  };

  return (
    <div>
      {isAuthenticated ? (
        <div>
          <p>Добро пожаловать, {user?.role}!</p>
          <button onClick={logout}>Выйти</button>
        </div>
      ) : (
        <button onClick={handleLogin}>Войти</button>
      )}
    </div>
  );
};
```

#### Защищенные роуты

```tsx
import { PrivateRoute } from '../components/auth/PrivateRoute';

<Route 
  path="/admin" 
  element={
    <PrivateRoute>
      <AdminPage />
    </PrivateRoute>
  } 
/>
```

#### Использование API сервиса

```tsx
import { apiService } from '../services/apiService';

// Все запросы автоматически включают токен и обновляют его при необходимости
const response = await apiService.get('/protected-endpoint');
const data = await apiService.post('/create-something', { data: 'value' });
```

## 🛠️ Middleware

### authMiddleware

Добавляет информацию о пользователе в `req.user`:

```ts
req.user = {
  id: 'user_id',           // ID пользователя (только для обычных пользователей)
  role: 'admin' | 'user',  // Роль пользователя
  isAdmin: boolean,        // Является ли админом
  isUser: boolean,         // Является ли обычным пользователем
  tokenType: 'access'      // Тип токена
}
```

### requireAdmin

Проверяет права администратора:

```ts
router.get('/admin-only', authMiddleware, requireAdmin, handler);
```

### requireAuth

Проверяет авторизацию (любая роль):

```ts
router.get('/protected', authMiddleware, requireAuth, handler);
```

### requireRole

Проверяет конкретную роль:

```ts
router.get('/user-only', authMiddleware, requireRole('user'), handler);
```

## 🔧 Настройка

### Переменные окружения

```env
# JWT
JWT_SECRET=your-super-secret-jwt-key

# Админ (для простой авторизации)
ADMIN_PASSWORD=your-admin-password

# Админ пользователь (для создания в базе)
ADMIN_EMAIL=admin@beton-crm.ru
ADMIN_FIRST_NAME=Администратор
ADMIN_LAST_NAME=Системы

# База данных
MONGODB_URI=mongodb://localhost:27017/beton-crm
```

### Создание первого администратора

```bash
cd server
npm run create-admin
```

## 🔒 Безопасность

1. **JWT токены**: Access токены живут 15 минут, refresh токены - 7 дней
2. **Хеширование паролей**: Используется bcrypt с salt rounds = 10
3. **Автоматический refresh**: Клиент автоматически обновляет токены
4. **Отзыв токенов**: Refresh токены сохраняются в базе и могут быть отозваны
5. **Валидация паролей**: Минимум 6 символов, буквы + цифры

## 📋 API Ответы

### Успешная авторизация

```json
{
  "success": true,
  "accessToken": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "refreshToken": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "expiresIn": "15m",
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "role": "user",
    "firstName": "Имя",
    "lastName": "Фамилия",
    "fullName": "Имя Фамилия"
  }
}
```

### Ошибка авторизации

```json
{
  "success": false,
  "message": "Неверный email или пароль"
}
```

## 🧪 Тестирование

Для тестирования системы авторизации:

1. Запустите сервер: `npm run dev`
2. Создайте админа: `npm run create-admin`
3. Откройте `/admin` в браузере
4. Введите пароль администратора
5. Проверьте автоматическое обновление токенов в Network tab

## 🚨 Troubleshooting

### Проблема: Токен не обновляется автоматически

**Решение**: Проверьте, что используете `apiService` вместо обычного axios

### Проблема: "Требуются права администратора"

**Решение**: Убедитесь, что роут защищен правильными middleware:

```ts
// Правильно
router.get('/admin', authMiddleware, requireAdmin, handler);

// Неправильно  
router.get('/admin', requireAdmin, handler); // authMiddleware отсутствует
```

### Проблема: Пользователь не может войти

**Решение**: 
1. Проверьте переменные окружения
2. Убедитесь, что пользователь создан в базе данных
3. Проверьте статус пользователя (`active`)

---

*Система авторизации готова к использованию и расширению для второго этапа разработки (CRUD пользователей).* 