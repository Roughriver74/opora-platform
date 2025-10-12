# 🎉 Beton CRM - Полная документация

## 📋 Обзор проекта

Beton CRM - это полнофункциональная система управления заявками на покупку бетона с интеграцией Битрикс24. Проект включает веб-приложение, мобильное приложение и backend API.

## 🏗️ Архитектура

### Monorepo структура
```
beton-crm/
├── packages/
│   ├── shared/           # 📦 Общий код (TypeScript)
│   ├── web/              # 🌐 React веб-приложение
│   └── mobile/           # 📱 React Native приложение
├── server/               # 🖥️ Backend API (Node.js/Express)
├── scripts/              # 🚀 Скрипты автоматизации
└── docs/                 # 📚 Документация
```

### Технологический стек

#### Frontend (Web)
- **React 19** + TypeScript
- **Material-UI** для компонентов
- **React Query** для управления состоянием
- **React Router** для навигации
- **Formik + Yup** для форм и валидации

#### Mobile
- **React Native 0.75** + TypeScript
- **React Native Paper** для UI
- **React Navigation** для навигации
- **AsyncStorage** для локального хранения
- **React Hook Form** для управления формами

#### Backend
- **Node.js** + Express + TypeScript
- **PostgreSQL** с TypeORM
- **Redis** для кэширования
- **JWT** для аутентификации
- **Bitrix24 API** интеграция

## 🚀 Быстрый старт

### 1. Клонирование и установка
```bash
git clone <repository-url>
cd beton-crm
npm run install:all
```

### 2. Настройка окружения
```bash
# Backend
cp server/.env.example server/.env
# Отредактируйте server/.env с вашими настройками

# Web
cp packages/web/.env.example packages/web/.env
# Отредактируйте packages/web/.env
```

### 3. Запуск в режиме разработки
```bash
# Все сервисы
npm run dev

# Или по отдельности
npm run dev:web      # Web приложение
npm run dev:mobile   # Mobile приложение
npm run start:server # Backend API
```

### 4. Сборка для продакшена
```bash
# Сборка всех компонентов
npm run build:all

# Создание архива
npm run build:archive
```

## 📱 Мобильное приложение

### Функциональность
- ✅ **Авторизация** с JWT токенами
- ✅ **Динамические формы** с 7 типами полей
- ✅ **Date Picker** для выбора дат
- ✅ **Push уведомления** с настройками
- ✅ **Управление заявками** с фильтрацией
- ✅ **Навигация** с Tab + Stack
- ✅ **Офлайн поддержка** через AsyncStorage

### Экраны
1. **LoginScreen** - Авторизация пользователей
2. **HomeScreen** - Главный экран с формой заказа
3. **FormScreen** - Пошаговое заполнение формы
4. **SubmissionsScreen** - Список заявок пользователя
5. **NotificationsScreen** - Управление уведомлениями
6. **ProfileScreen** - Профиль пользователя

### Компоненты
- **FormField** - Универсальный компонент поля формы
- **FormSection** - Компонент секции формы
- **DatePicker** - Компонент выбора даты
- **AppNavigator** - Настройка навигации

### Типы полей форм
- `text` - Текстовые поля
- `number` - Числовые поля
- `textarea` - Многострочные поля
- `select` - Выпадающие списки
- `radio` - Радио кнопки
- `checkbox` - Чекбоксы
- `date` - Выбор даты

## 🌐 Веб-приложение

### Функциональность
- ✅ **Полная совместимость** с существующим кодом
- ✅ **Использует shared пакет** для общего кода
- ✅ **Все функции сохранены** без изменений
- ✅ **Material-UI компоненты**
- ✅ **Адаптивный дизайн**

### Особенности
- Динамические формы с drag & drop редактором
- Интеграция с Bitrix24
- Управление пользователями
- Система уведомлений
- Экспорт данных

## 🖥️ Backend API

### Функциональность
- ✅ **RESTful API** с Express
- ✅ **JWT аутентификация** с refresh токенами
- ✅ **PostgreSQL** с TypeORM
- ✅ **Redis кэширование**
- ✅ **Bitrix24 интеграция**
- ✅ **Валидация данных** с class-validator

### API Endpoints
```
POST   /api/auth/user-login     # Вход пользователя
POST   /api/auth/refresh        # Обновление токена
GET    /api/forms               # Список форм
POST   /api/submissions         # Создание заявки
GET    /api/submissions         # Список заявок
PUT    /api/submissions/:id     # Обновление заявки
GET    /api/users               # Список пользователей
POST   /api/users               # Создание пользователя
```

## 📦 Shared пакет

### Содержимое
- **Типы** - TypeScript интерфейсы
- **API клиент** - Адаптер для разных платформ
- **Сервисы** - Бизнес-логика
- **Утилиты** - Общие функции

### Использование
```typescript
// Импорт типов
import { User, Form, FormField } from '@beton-crm/shared'

// Импорт API клиента
import { createApiClient } from '@beton-crm/shared'

// Импорт сервисов
import { createAuthService } from '@beton-crm/shared'
```

## 🚀 Скрипты автоматизации

### Основные команды
```bash
# Разработка
npm run dev                    # Запуск всех сервисов
npm run dev:mobile            # С мобильным приложением

# Сборка
npm run build:all             # Сборка всех компонентов
npm run build:clean           # С очисткой
npm run build:archive         # С созданием архива

# Тестирование
npm run test:all              # Все тесты
npm run test:integration      # Интеграционные тесты
npm run test:security         # Проверка безопасности

# Очистка
npm run clean                 # Очистка сборок
npm run clean:all             # Полная очистка
```

### Скрипты в папке scripts/
- `build.sh` - Автоматизированная сборка
- `dev.sh` - Запуск разработки
- `test.sh` - Запуск тестов

## 📚 Документация

### Основные руководства
- [BUILD_INSTRUCTIONS.md](./BUILD_INSTRUCTIONS.md) - Инструкция по сборке
- [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) - Руководство по развертыванию
- [TESTING_GUIDE.md](./TESTING_GUIDE.md) - Руководство по тестированию
- [MONOREPO_SETUP.md](./MONOREPO_SETUP.md) - Настройка monorepo

### Специфичная документация
- `packages/mobile/README.md` - Мобильное приложение
- `packages/web/README.md` - Веб-приложение
- `server/README.md` - Backend API

## 🔧 Разработка

### Требования
- **Node.js** 16+
- **npm** 8+
- **PostgreSQL** 12+
- **Redis** 6+
- **Android Studio** (для мобильного)
- **Xcode** (для iOS, только macOS)

### Настройка окружения
1. Установите зависимости: `npm run install:all`
2. Настройте базу данных PostgreSQL
3. Настройте Redis
4. Скопируйте и настройте .env файлы
5. Запустите миграции: `cd server && npm run migration:run`

### Структура кода
- Следуйте принципам из `coding-standards.md`
- Максимум 200 строк на файл
- Разбивайте большие компоненты
- Используйте TypeScript везде
- Пишите тесты для новой функциональности

## 🧪 Тестирование

### Типы тестов
- **Unit тесты** - Jest + React Testing Library
- **Integration тесты** - Supertest для API
- **E2E тесты** - Playwright для веб
- **Mobile тесты** - Detox для мобильного

### Запуск тестов
```bash
# Все тесты
npm run test:all

# По компонентам
cd packages/web && npm test
cd packages/mobile && npm test
cd server && npm test

# E2E тесты
npm test
```

## 🚀 Развертывание

### Продакшен
1. Соберите приложение: `npm run build:all`
2. Настройте сервер (Ubuntu/CentOS)
3. Установите PostgreSQL и Redis
4. Настройте Nginx
5. Запустите через PM2

### Docker
```bash
# Сборка всех сервисов
docker-compose build

# Запуск
docker-compose up -d
```

### Мобильные приложения
- **Android**: Соберите APK и загрузите в Google Play
- **iOS**: Соберите через Xcode и загрузите в App Store

## 📊 Мониторинг

### Логирование
- **Backend**: PM2 logs
- **Web**: Nginx access/error logs
- **Mobile**: React Native logs

### Метрики
- **Производительность**: Response time < 200ms
- **Доступность**: 99.9% uptime
- **Ошибки**: < 0.1% error rate

## 🔒 Безопасность

### Меры безопасности
- JWT токены с истечением
- Валидация всех входных данных
- HTTPS в продакшене
- Регулярные обновления зависимостей
- Аудит безопасности: `npm audit`

## 🤝 Участие в разработке

### Workflow
1. Форкните репозиторий
2. Создайте ветку для новой функции
3. Внесите изменения
4. Напишите тесты
5. Создайте Pull Request

### Code Review
- Проверяйте код на соответствие стандартам
- Убедитесь, что тесты проходят
- Проверяйте покрытие кода
- Тестируйте на разных платформах

## 📈 Roadmap

### Ближайшие планы
- [ ] Темная тема для мобильного приложения
- [ ] Push уведомления через Firebase
- [ ] Офлайн режим с синхронизацией
- [ ] Анимации и переходы
- [ ] Админ-панель для мобильного

### Долгосрочные планы
- [ ] Desktop приложение (Electron)
- [ ] API версионирование
- [ ] Микросервисная архитектура
- [ ] Машинное обучение для аналитики

## 🆘 Поддержка

### Получение помощи
- Создайте issue в репозитории
- Обратитесь к документации
- Проверьте FAQ
- Свяжитесь с командой разработки

### Полезные ссылки
- [React Native документация](https://reactnative.dev/)
- [Material-UI документация](https://mui.com/)
- [TypeORM документация](https://typeorm.io/)
- [Bitrix24 API](https://dev.1c-bitrix.ru/rest_help/)

## 📄 Лицензия

ISC License - см. файл LICENSE для деталей.

## 🎉 Заключение

Beton CRM - это современная, масштабируемая система для управления заявками на бетон. Проект использует лучшие практики разработки и обеспечивает отличный пользовательский опыт на всех платформах.

**Готовы начать разработку?** Следуйте инструкциям в этом README и начинайте создавать удивительные функции! 🚀