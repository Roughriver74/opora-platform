#!/bin/bash

# Скрипт для запуска тестирования инкрементальной синхронизации

echo "🚀 Запуск тестирования инкрементальной синхронизации..."

# Переходим в директорию сервера
cd "$(dirname "$0")/.."

# Проверяем наличие Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js не найден. Установите Node.js для продолжения."
    exit 1
fi

# Проверяем наличие TypeScript
if ! command -v ts-node &> /dev/null; then
    echo "❌ ts-node не найден. Установите ts-node для продолжения."
    echo "Выполните: npm install -g ts-node"
    exit 1
fi

# Проверяем наличие переменных окружения
if [ ! -f .env ]; then
    echo "❌ Файл .env не найден. Создайте файл .env с необходимыми переменными."
    exit 1
fi

echo "✅ Проверки пройдены. Запускаем тестирование..."

# Запускаем тестирование
npx ts-node src/scripts/testIncrementalSync.ts

echo "✅ Тестирование завершено!"

