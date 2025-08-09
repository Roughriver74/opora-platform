#!/bin/bash

echo "🚀 Запуск Beton CRM в режиме разработки..."

# Проверка Docker
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker не запущен. Запустите Docker и попробуйте снова."
    exit 1
fi

# Остановка и удаление старых контейнеров
echo "🛑 Остановка существующих контейнеров..."
docker compose -f docker-compose.yml -f docker-compose.dev.yml down

# Запуск в dev режиме
echo "🏗️ Запуск контейнеров в dev режиме..."
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d

# Ожидание готовности
echo "⏳ Ожидание готовности сервисов..."
sleep 10

# Проверка статуса
if docker compose -f docker-compose.yml -f docker-compose.dev.yml ps | grep -q "Up"; then
    echo "✅ Beton CRM запущен в режиме разработки!"
    echo ""
    echo "🌐 Доступные сервисы:"
    echo "  - Frontend (React Dev Server): http://localhost:3000"
    echo "  - Backend API (с hot reload): http://localhost:5001"
    echo ""
    echo "📋 Полезные команды:"
    echo "  - Логи: docker compose -f docker-compose.yml -f docker-compose.dev.yml logs -f"
    echo "  - Остановка: docker compose -f docker-compose.yml -f docker-compose.dev.yml down"
    echo "  - Перезапуск: docker compose -f docker-compose.yml -f docker-compose.dev.yml restart"
    echo ""
    echo "💡 Изменения в коде применяются автоматически (hot reload)"
else
    echo "❌ Ошибка запуска. Проверьте логи: docker compose -f docker-compose.yml -f docker-compose.dev.yml logs"
    exit 1
fi