#!/bin/bash

echo "🚀 Запуск Beton CRM с полным обновлением..."

# Остановка и удаление старых контейнеров
echo "🛑 Остановка существующих контейнеров..."
docker compose down

# Удаление старых образов
echo "🗑️ Удаление старых образов..."
docker compose down --rmi local

# Очистка неиспользуемых образов
echo "🧹 Очистка неиспользуемых образов..."
docker image prune -f

# Пересборка без кеша
echo "🏗️ Пересборка образов без кеша..."
docker compose build --no-cache

# Запуск обновленных контейнеров
echo "🚀 Запуск обновленных контейнеров..."
docker compose up -d

# Ожидание готовности
echo "⏳ Ожидание готовности сервисов..."
sleep 5

# Проверка статуса
if docker compose ps | grep -q "Up"; then
    echo "✅ Beton CRM успешно запущен!"
    echo ""
    echo "🌐 Доступные сервисы:"
    echo "  - Frontend: http://localhost:3000"
    echo "  - Backend API: http://localhost:5001"
    echo ""
    echo "📋 Полезные команды:"
    echo "  - Логи: docker compose logs -f"
    echo "  - Остановка: docker compose down"
    echo "  - Перезапуск: docker compose restart"
else
    echo "❌ Ошибка запуска. Проверьте логи: docker compose logs"
    exit 1
fi