#!/bin/bash

echo "🚀 Запуск тестирования синхронизации ИНН..."

# Переходим в директорию сервера
cd "$(dirname "$0")/.."

# Запускаем тест
npx ts-node src/scripts/testInnSync.ts

echo "✅ Тест завершен!"


