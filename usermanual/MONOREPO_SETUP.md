# 🚀 Настройка Monorepo для Beton CRM

## ✅ Что уже сделано

### 1. Структура проекта
```
beton-crm/
├── packages/
│   ├── shared/           # 📦 Общий код
│   │   ├── src/
│   │   │   ├── types/    # TypeScript типы
│   │   │   ├── services/ # API сервисы
│   │   │   └── index.ts  # Главный экспорт
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── web/              # 🌐 React веб-приложение
│   │   ├── src/          # Весь текущий код
│   │   └── package.json  # Обновлен с зависимостью на shared
│   └── mobile/           # 📱 React Native приложение
│       ├── src/
│       ├── App.tsx
│       └── package.json
├── server/               # 🖥️ Backend (без изменений)
└── package.json          # Root с workspace настройками
```

### 2. Shared пакет
- ✅ Типы (Form, FormField, User и др.)
- ✅ API клиент с адаптером для разных платформ
- ✅ Сервисы (authService, formService)
- ✅ TypeScript конфигурация

### 3. Web приложение
- ✅ Обновлен package.json с зависимостью на shared
- ✅ Созданы адаптеры для API сервисов
- ✅ Обновлены импорты типов

### 4. Mobile приложение
- ✅ Базовая структура React Native
- ✅ Настройка AsyncStorage для токенов
- ✅ Адаптеры для API сервисов
- ✅ TypeScript конфигурация

## 🛠️ Следующие шаги

### 1. Установка зависимостей
```bash
# Из корневой папки проекта
npm install

# Или установка по отдельности
cd packages/shared && npm install
cd ../web && npm install
cd ../mobile && npm install
```

### 2. Сборка shared пакета
```bash
cd packages/shared
npm run build
```

### 3. Запуск приложений
```bash
# Веб приложение
npm run start:web

# Мобильное приложение (после настройки React Native)
npm run start:mobile

# Все вместе
npm run dev:all
```

## 📱 Настройка React Native

### 1. Установка React Native CLI
```bash
npm install -g @react-native-community/cli
```

### 2. Инициализация Android/iOS
```bash
cd packages/mobile
npx react-native init BetonCRM --template react-native-template-typescript
```

### 3. Настройка зависимостей
```bash
cd packages/mobile
npm install @react-native-async-storage/async-storage
npm install react-native-paper
npm install @react-navigation/native @react-navigation/stack
npm install react-native-gesture-handler react-native-reanimated
```

## 🔧 Преимущества новой структуры

### ✅ Безопасность
- Текущий веб-проект остается полностью рабочим
- Изменения вносятся постепенно
- Можно откатиться на любом этапе

### ✅ Переиспользование кода
- Общие типы и API сервисы в shared пакете
- Изменения в одном месте применяются везде
- Легко добавлять новые платформы

### ✅ Разработка
- Один репозиторий для всего проекта
- Общие зависимости и скрипты
- Единая система тестирования

## 🚀 Готовые команды

```bash
# Установка всех зависимостей
npm run install:all

# Запуск веб-приложения
npm run start:web

# Запуск мобильного приложения
npm run start:mobile

# Сборка всех пакетов
npm run build

# Разработка (все сервисы)
npm run dev:all
```

## 📋 TODO для завершения

1. **Установить зависимости** для всех пакетов
2. **Собрать shared пакет** (npm run build:shared)
3. **Протестировать веб-приложение** с новой структурой
4. **Настроить React Native** окружение
5. **Создать первые экраны** мобильного приложения
6. **Настроить навигацию** между экранами
7. **Адаптировать формы** под мобильные компоненты

## 🎯 Результат

После завершения настройки у вас будет:
- ✅ Рабочий веб-сайт (без изменений)
- ✅ Структура для мобильного приложения
- ✅ Общий код в shared пакете
- ✅ Легкая поддержка и развитие