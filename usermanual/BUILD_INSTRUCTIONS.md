# 🚀 Инструкция по сборке Beton CRM

## 📋 Обзор

Данная инструкция покрывает сборку всех компонентов проекта:
- 🌐 **Web приложение** (React)
- 📱 **Mobile приложение** (React Native)
- 🖥️ **Backend** (Node.js/Express)
- 📦 **Shared пакет** (TypeScript)

## 🛠️ Предварительные требования

### Общие требования
- **Node.js** версии 16 или выше
- **npm** версии 8 или выше
- **Git** для клонирования репозитория

### Для Web приложения
- Современный браузер (Chrome, Firefox, Safari, Edge)
- Никаких дополнительных требований

### Для Mobile приложения

#### Android
- **Java Development Kit (JDK)** 11 или выше
- **Android Studio** с Android SDK
- **Android SDK Build Tools** 30.0.3 или выше
- **Android SDK Platform** API 30 или выше
- Переменные окружения:
  ```bash
  export ANDROID_HOME=$HOME/Android/Sdk
  export PATH=$PATH:$ANDROID_HOME/emulator
  export PATH=$PATH:$ANDROID_HOME/tools
  export PATH=$PATH:$ANDROID_HOME/tools/bin
  export PATH=$PATH:$ANDROID_HOME/platform-tools
  ```

#### iOS (только на macOS)
- **Xcode** 12 или выше
- **CocoaPods** для управления зависимостями
- **iOS Simulator** или физическое устройство

### Для Backend
- **PostgreSQL** 12 или выше
- **Redis** 6 или выше
- **Docker** (опционально, для контейнеризации)

## 🏗️ Пошаговая сборка

### Шаг 1: Подготовка окружения

```bash
# Клонирование репозитория
git clone <repository-url>
cd beton-crm

# Установка зависимостей для всех пакетов
npm run install:all
```

### Шаг 2: Сборка Shared пакета

```bash
# Переход в папку shared
cd packages/shared

# Установка зависимостей
npm install

# Сборка TypeScript
npm run build

# Проверка сборки
ls -la dist/
```

**Ожидаемый результат:**
```
dist/
├── index.js
├── index.d.ts
├── types/
│   ├── index.js
│   ├── index.d.ts
│   ├── user.js
│   └── user.d.ts
└── services/
    ├── api.js
    ├── api.d.ts
    ├── authService.js
    ├── authService.d.ts
    ├── formService.js
    └── formService.d.ts
```

### Шаг 3: Сборка Web приложения

```bash
# Переход в папку web
cd ../web

# Установка зависимостей
npm install

# Сборка для разработки
npm run build

# Или запуск в режиме разработки
npm start
```

**Ожидаемый результат:**
```
build/
├── static/
│   ├── css/
│   ├── js/
│   └── media/
├── index.html
├── manifest.json
└── robots.txt
```

### Шаг 4: Сборка Mobile приложения

#### Android

```bash
# Переход в папку mobile
cd ../mobile

# Установка зависимостей
npm install

# Очистка кэша (если нужно)
npx react-native start --reset-cache

# Сборка для разработки
npx react-native run-android

# Или сборка APK
cd android
./gradlew assembleDebug
```

**Ожидаемый результат:**
```
android/app/build/outputs/apk/debug/app-debug.apk
```

#### iOS (только на macOS)

```bash
# Переход в папку mobile
cd packages/mobile

# Установка зависимостей
npm install

# Установка CocoaPods зависимостей
cd ios
pod install
cd ..

# Сборка для разработки
npx react-native run-ios

# Или сборка через Xcode
npx react-native run-ios --configuration Release
```

**Ожидаемый результат:**
```
ios/build/Build/Products/Debug-iphonesimulator/BetonCRM.app
```

### Шаг 5: Сборка Backend

```bash
# Переход в папку server
cd ../../server

# Установка зависимостей
npm install

# Сборка TypeScript
npm run build

# Или запуск в режиме разработки
npm run dev
```

**Ожидаемый результат:**
```
dist/
├── index.js
├── controllers/
├── services/
├── routes/
└── database/
```

## 🐳 Docker сборка

### Сборка всех сервисов

```bash
# Из корневой папки проекта
docker-compose build

# Запуск всех сервисов
docker-compose up -d

# Просмотр логов
docker-compose logs -f
```

### Отдельная сборка сервисов

```bash
# Backend
docker build -f Dockerfile.backend -t beton-crm-backend .

# Web приложение
docker build -f Dockerfile.frontend -t beton-crm-frontend .

# Mobile (только для тестирования)
docker build -f packages/mobile/Dockerfile -t beton-crm-mobile .
```

## 📱 Сборка для продакшена

### Web приложение

```bash
cd packages/web

# Сборка для продакшена
npm run build

# Результат в папке build/
```

### Mobile приложение

#### Android Release

```bash
cd packages/mobile

# Генерация подписанного APK
cd android
./gradlew assembleRelease

# Или через React Native CLI
npx react-native run-android --variant=release
```

**Настройка подписи APK:**
1. Создайте keystore файл
2. Настройте `android/app/build.gradle`
3. Добавьте переменные окружения

#### iOS Release

```bash
cd packages/mobile

# Сборка через Xcode
npx react-native run-ios --configuration Release

# Или через командную строку
xcodebuild -workspace ios/BetonCRM.xcworkspace -scheme BetonCRM -configuration Release -destination generic/platform=iOS -archivePath BetonCRM.xcarchive archive
```

## 🔧 Скрипты сборки

### Root package.json

```json
{
  "scripts": {
    "build:all": "npm run build:shared && npm run build:web && npm run build:mobile && npm run build:server",
    "build:shared": "cd packages/shared && npm run build",
    "build:web": "cd packages/web && npm run build",
    "build:mobile": "cd packages/mobile && npm run build",
    "build:server": "cd server && npm run build",
    "build:docker": "docker-compose build",
    "start:all": "concurrently \"npm run start:server\" \"npm run start:web\"",
    "start:web": "cd packages/web && npm start",
    "start:mobile": "cd packages/mobile && npm start",
    "start:server": "cd server && npm run dev"
  }
}
```

### Mobile package.json

```json
{
  "scripts": {
    "android": "react-native run-android",
    "ios": "react-native run-ios",
    "build:android": "cd android && ./gradlew assembleRelease",
    "build:ios": "cd ios && xcodebuild -workspace BetonCRM.xcworkspace -scheme BetonCRM -configuration Release",
    "build:bundle-android": "react-native bundle --platform android --dev false --entry-file index.js --bundle-output android/app/src/main/assets/index.android.bundle",
    "build:bundle-ios": "react-native bundle --platform ios --dev false --entry-file index.js --bundle-output ios/main.jsbundle"
  }
}
```

## 🚀 Автоматизированная сборка

### GitHub Actions

Создайте `.github/workflows/build.yml`:

```yaml
name: Build and Test

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  build-shared:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '16'
      - run: cd packages/shared && npm install && npm run build

  build-web:
    runs-on: ubuntu-latest
    needs: build-shared
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '16'
      - run: cd packages/web && npm install && npm run build

  build-mobile-android:
    runs-on: ubuntu-latest
    needs: build-shared
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '16'
      - uses: actions/setup-java@v2
        with:
          java-version: '11'
      - run: cd packages/mobile && npm install
      - run: cd packages/mobile/android && ./gradlew assembleDebug
```

## 🐛 Решение проблем

### Общие проблемы

1. **Ошибка "Module not found"**
   ```bash
   # Очистка кэша
   npm cache clean --force
   rm -rf node_modules package-lock.json
   npm install
   ```

2. **Ошибка TypeScript**
   ```bash
   # Пересборка shared пакета
   cd packages/shared
   npm run clean
   npm run build
   ```

3. **Ошибка Metro bundler**
   ```bash
   # Сброс кэша Metro
   npx react-native start --reset-cache
   ```

### Android проблемы

1. **Ошибка "SDK location not found"**
   ```bash
   # Создание local.properties
   echo "sdk.dir=$ANDROID_HOME" > android/local.properties
   ```

2. **Ошибка "Gradle build failed"**
   ```bash
   # Очистка Gradle кэша
   cd android
   ./gradlew clean
   ```

### iOS проблемы

1. **Ошибка "Pod install failed"**
   ```bash
   # Очистка CocoaPods кэша
   cd ios
   pod deintegrate
   pod install
   ```

2. **Ошибка "Build failed"**
   ```bash
   # Очистка Xcode кэша
   rm -rf ~/Library/Developer/Xcode/DerivedData
   ```

## 📊 Проверка сборки

### Web приложение
```bash
# Проверка размера сборки
du -sh packages/web/build/

# Проверка файлов
ls -la packages/web/build/static/
```

### Mobile приложение
```bash
# Проверка APK
ls -la packages/mobile/android/app/build/outputs/apk/

# Проверка размера APK
du -sh packages/mobile/android/app/build/outputs/apk/*.apk
```

### Backend
```bash
# Проверка сборки
ls -la server/dist/

# Проверка размера
du -sh server/dist/
```

## 🎯 Оптимизация сборки

### Web приложение
- Минификация JavaScript и CSS
- Оптимизация изображений
- Tree shaking для удаления неиспользуемого кода
- Code splitting для ленивой загрузки

### Mobile приложение
- ProGuard для Android (минификация)
- Dead code elimination
- Оптимизация изображений
- Bundle splitting

### Backend
- TypeScript компиляция с оптимизацией
- Минификация для продакшена
- Кэширование статических файлов

## 📝 Заключение

Эта инструкция покрывает все аспекты сборки проекта Beton CRM. Следуйте шагам последовательно, и вы сможете собрать все компоненты проекта для разработки и продакшена.

Для получения помощи обращайтесь к документации конкретных инструментов или создавайте issue в репозитории проекта.