# 🧪 Руководство по тестированию Beton CRM

## 📋 Обзор

Данное руководство покрывает все аспекты тестирования системы Beton CRM:
- 🌐 **Web приложение** (React)
- 📱 **Mobile приложение** (React Native)
- 🖥️ **Backend API** (Node.js/Express)
- 🔗 **Интеграции** (Bitrix24, PostgreSQL, Redis)

## 🎯 Стратегия тестирования

### Пирамида тестирования
```
        /\
       /  \
      / E2E \     <- End-to-End тесты (Playwright)
     /______\
    /        \
   /  Integration \  <- Интеграционные тесты
  /________________\
 /                  \
/    Unit Tests      \  <- Модульные тесты (Jest)
/____________________\
```

## 🧪 Типы тестирования

### 1. Модульные тесты (Unit Tests)
- **Цель**: Тестирование отдельных функций и компонентов
- **Инструменты**: Jest, React Testing Library
- **Покрытие**: 80%+ кода

### 2. Интеграционные тесты
- **Цель**: Тестирование взаимодействия между компонентами
- **Инструменты**: Jest, Supertest
- **Покрытие**: API endpoints, database operations

### 3. End-to-End тесты
- **Цель**: Тестирование полных пользовательских сценариев
- **Инструменты**: Playwright
- **Покрытие**: Критические пользовательские пути

### 4. Мобильные тесты
- **Цель**: Тестирование на реальных устройствах
- **Инструменты**: Detox, Appium
- **Покрытие**: Основные функции приложения

## 🚀 Запуск тестов

### Автоматический запуск всех тестов
```bash
# Запуск всех тестов
npm run test:all

# Запуск с интеграционными тестами
npm run test:integration

# Запуск с проверкой безопасности
npm run test:security
```

### Ручной запуск по компонентам

#### Web приложение
```bash
cd packages/web
npm test                    # Jest тесты
npm run test:coverage      # С покрытием кода
npm run test:watch         # В режиме наблюдения
```

#### Mobile приложение
```bash
cd packages/mobile
npm test                   # Jest тесты
npm run test:android       # Android тесты
npm run test:ios           # iOS тесты
```

#### Backend API
```bash
cd server
npm test                   # Jest тесты
npm run test:integration   # Интеграционные тесты
npm run test:coverage      # С покрытием кода
```

#### E2E тесты
```bash
# Из корневой папки
npm test                   # Playwright тесты
npm run test:headed        # С браузером
npm run test:ui            # Интерактивный режим
```

## 📱 Тестирование мобильного приложения

### Настройка тестового окружения

#### Android
```bash
# Установка Android SDK
export ANDROID_HOME=$HOME/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/tools
export PATH=$PATH:$ANDROID_HOME/platform-tools

# Создание эмулятора
avdmanager create avd -n test_emulator -k "system-images;android-30;google_apis;x86_64"
```

#### iOS (только на macOS)
```bash
# Установка Xcode
xcode-select --install

# Установка симулятора
xcrun simctl create "iPhone 14" "iPhone 14" "iOS-16.0"
```

### Запуск мобильных тестов

```bash
# Android
cd packages/mobile
npm run test:android

# iOS
npm run test:ios

# Оба платформы
npm run test:mobile
```

### Тестирование на реальных устройствах

#### Android
```bash
# Подключение устройства
adb devices

# Установка приложения
npx react-native run-android --deviceId=DEVICE_ID

# Запуск тестов
npm run test:device-android
```

#### iOS
```bash
# Подключение устройства через Xcode
# Запуск приложения
npx react-native run-ios --device="iPhone 14"

# Запуск тестов
npm run test:device-ios
```

## 🌐 Тестирование веб-приложения

### Компонентные тесты

```bash
cd packages/web
npm test
```

**Пример теста компонента:**
```typescript
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import LoginScreen from '../screens/LoginScreen'

describe('LoginScreen', () => {
  test('renders login form', () => {
    render(<LoginScreen onLogin={jest.fn()} />)
    
    expect(screen.getByText('Beton CRM')).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByLabelText('Пароль')).toBeInTheDocument()
  })

  test('validates email input', async () => {
    render(<LoginScreen onLogin={jest.fn()} />)
    
    const emailInput = screen.getByLabelText('Email')
    fireEvent.change(emailInput, { target: { value: 'invalid-email' } })
    fireEvent.blur(emailInput)
    
    expect(await screen.findByText('Введите корректный email')).toBeInTheDocument()
  })
})
```

### E2E тесты с Playwright

```bash
# Запуск всех E2E тестов
npm test

# Запуск конкретного теста
npx playwright test auth.spec.ts

# Запуск в headed режиме
npm run test:headed

# Интерактивный режим
npm run test:ui
```

**Пример E2E теста:**
```typescript
import { test, expect } from '@playwright/test'

test('user can login and create submission', async ({ page }) => {
  // Переход на страницу входа
  await page.goto('http://localhost:3000')
  
  // Ввод данных для входа
  await page.fill('[data-testid="email-input"]', 'test@example.com')
  await page.fill('[data-testid="password-input"]', 'password123')
  
  // Нажатие кнопки входа
  await page.click('[data-testid="login-button"]')
  
  // Проверка успешного входа
  await expect(page).toHaveURL('http://localhost:3000/')
  
  // Создание заявки
  await page.fill('[data-testid="company-name"]', 'Тестовая компания')
  await page.fill('[data-testid="contact-person"]', 'Иван Иванов')
  await page.fill('[data-testid="phone"]', '+7 (999) 123-45-67')
  
  // Отправка формы
  await page.click('[data-testid="submit-button"]')
  
  // Проверка успешной отправки
  await expect(page.locator('[data-testid="success-message"]')).toBeVisible()
})
```

## 🖥️ Тестирование Backend API

### Модульные тесты

```bash
cd server
npm test
```

**Пример теста API:**
```typescript
import request from 'supertest'
import app from '../src/app'

describe('Auth API', () => {
  test('POST /api/auth/user-login - successful login', async () => {
    const response = await request(app)
      .post('/api/auth/user-login')
      .send({
        email: 'test@example.com',
        password: 'password123'
      })
      .expect(200)

    expect(response.body.success).toBe(true)
    expect(response.body.accessToken).toBeDefined()
    expect(response.body.user).toBeDefined()
  })

  test('POST /api/auth/user-login - invalid credentials', async () => {
    const response = await request(app)
      .post('/api/auth/user-login')
      .send({
        email: 'test@example.com',
        password: 'wrongpassword'
      })
      .expect(401)

    expect(response.body.success).toBe(false)
    expect(response.body.message).toContain('Неверные учетные данные')
  })
})
```

### Интеграционные тесты

```bash
cd server
npm run test:integration
```

**Пример интеграционного теста:**
```typescript
import { createConnection, getConnection } from 'typeorm'
import { User } from '../src/entities/User'
import { authService } from '../src/services/authService'

describe('Auth Integration', () => {
  beforeAll(async () => {
    await createConnection({
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      username: 'test_user',
      password: 'test_password',
      database: 'beton_crm_test',
      entities: [User],
      synchronize: true,
    })
  })

  afterAll(async () => {
    await getConnection().close()
  })

  test('user registration and login flow', async () => {
    // Создание пользователя
    const user = await User.create({
      email: 'test@example.com',
      password: 'password123',
      role: 'user'
    }).save()

    // Вход пользователя
    const result = await authService.login({
      email: 'test@example.com',
      password: 'password123'
    })

    expect(result.success).toBe(true)
    expect(result.user.id).toBe(user.id)
  })
})
```

## 🔗 Тестирование интеграций

### Bitrix24 API

```typescript
import { bitrix24Service } from '../src/services/bitrix24Service'

describe('Bitrix24 Integration', () => {
  test('creates deal successfully', async () => {
    const dealData = {
      TITLE: 'Тестовая сделка',
      STAGE_ID: 'NEW',
      CURRENCY_ID: 'RUB'
    }

    const result = await bitrix24Service.createDeal(dealData)
    
    expect(result.success).toBe(true)
    expect(result.dealId).toBeDefined()
  })

  test('handles API errors gracefully', async () => {
    const invalidData = {
      TITLE: '', // Пустое название
      STAGE_ID: 'INVALID'
    }

    await expect(bitrix24Service.createDeal(invalidData))
      .rejects.toThrow('Invalid deal data')
  })
})
```

### Database тесты

```typescript
import { getConnection } from 'typeorm'
import { Form } from '../src/entities/Form'

describe('Database Operations', () => {
  test('creates and retrieves form', async () => {
    const form = await Form.create({
      name: 'test-form',
      title: 'Тестовая форма',
      description: 'Описание тестовой формы',
      isActive: true
    }).save()

    const retrievedForm = await Form.findOne({ where: { id: form.id } })
    
    expect(retrievedForm).toBeDefined()
    expect(retrievedForm.title).toBe('Тестовая форма')
  })
})
```

## 📊 Покрытие кода

### Генерация отчета о покрытии

```bash
# Web приложение
cd packages/web
npm run test:coverage

# Backend
cd server
npm run test:coverage

# Все компоненты
npm run test:coverage:all
```

### Анализ покрытия

```bash
# Просмотр отчета
open packages/web/coverage/lcov-report/index.html
open server/coverage/lcov-report/index.html
```

### Цели покрытия
- **Общее покрытие**: 80%+
- **Критические функции**: 95%+
- **Утилиты**: 90%+
- **Компоненты**: 75%+

## 🚨 Тестирование производительности

### Load тестирование API

```bash
# Установка Artillery
npm install -g artillery

# Запуск load тестов
artillery run tests/load/api-load-test.yml
```

**Пример load теста:**
```yaml
config:
  target: 'http://localhost:5001'
  phases:
    - duration: 60
      arrivalRate: 10
scenarios:
  - name: "API Load Test"
    requests:
      - get:
          url: "/api/forms"
      - post:
          url: "/api/submissions"
          json:
            formId: "test-form"
            formData: {}
```

### Мобильная производительность

```bash
# Профилирование React Native
cd packages/mobile
npx react-native run-android --variant=release
# Используйте Flipper для профилирования
```

## 🔒 Тестирование безопасности

### Проверка уязвимостей

```bash
# Проверка зависимостей
npm audit

# Проверка с исправлениями
npm audit fix

# Детальная проверка
npm audit --audit-level=moderate
```

### Тестирование авторизации

```typescript
describe('Security Tests', () => {
  test('prevents unauthorized access', async () => {
    const response = await request(app)
      .get('/api/forms')
      .expect(401)
    
    expect(response.body.error).toContain('Unauthorized')
  })

  test('validates JWT tokens', async () => {
    const response = await request(app)
      .get('/api/forms')
      .set('Authorization', 'Bearer invalid-token')
      .expect(401)
  })
})
```

## 📱 Тестирование на устройствах

### Android устройства

```bash
# Список устройств
adb devices

# Установка приложения
adb install -r android/app/build/outputs/apk/debug/app-debug.apk

# Запуск тестов
adb shell am instrument -w com.betoncrm.test/androidx.test.runner.AndroidJUnitRunner
```

### iOS устройства

```bash
# Список симуляторов
xcrun simctl list devices

# Запуск на симуляторе
npx react-native run-ios --simulator="iPhone 14"

# Запуск тестов
npx react-native test --platform=ios
```

## 🐛 Отладка тестов

### Общие проблемы

1. **Тесты не запускаются**
   ```bash
   # Очистка кэша
   npm cache clean --force
   rm -rf node_modules package-lock.json
   npm install
   ```

2. **Ошибки TypeScript**
   ```bash
   # Проверка типов
   npx tsc --noEmit
   ```

3. **Ошибки Metro bundler**
   ```bash
   # Сброс кэша
   npx react-native start --reset-cache
   ```

### Отладка E2E тестов

```bash
# Запуск в debug режиме
npx playwright test --debug

# Запуск с видео
npx playwright test --video=on

# Запуск с трассировкой
npx playwright test --trace=on
```

## 📈 Непрерывная интеграция

### GitHub Actions

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v2
    
    - name: Setup Node.js
      uses: actions/setup-node@v2
      with:
        node-version: '18'
    
    - name: Install dependencies
      run: npm run install:all
    
    - name: Run tests
      run: npm run test:all
    
    - name: Upload coverage
      uses: codecov/codecov-action@v1
```

## 📝 Отчеты о тестировании

### Генерация отчетов

```bash
# HTML отчет
npm run test:report

# JSON отчет
npm run test:json

# JUnit отчет
npm run test:junit
```

### Метрики качества

- **Покрытие кода**: 80%+
- **Прохождение тестов**: 100%
- **Время выполнения**: < 5 минут
- **Критические баги**: 0

## 🎯 Заключение

Это руководство покрывает все аспекты тестирования системы Beton CRM. Следуйте рекомендациям для обеспечения высокого качества кода и надежности приложения.

Для получения помощи обращайтесь к документации тестовых фреймворков или создавайте issue в репозитории проекта.