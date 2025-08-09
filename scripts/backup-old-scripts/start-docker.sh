#!/bin/bash

# Скрипт для запуска Docker окружения

set -e

echo "🚀 Запуск Beton CRM в Docker..."

# Проверка наличия .env файла
if [ ! -f .env ]; then
    echo "⚠️  Файл .env не найден. Копирую .env.example..."
    cp .env.example .env
    echo "✅ Файл .env создан. Пожалуйста, отредактируйте его перед запуском."
    exit 1
fi

# Остановка старых контейнеров
echo "🛑 Остановка существующих контейнеров..."
docker-compose down

# Сборка образов
echo "🔨 Сборка Docker образов..."
docker-compose build --no-cache

# Запуск контейнеров
echo "🐳 Запуск контейнеров..."
docker-compose up -d

# Ожидание готовности PostgreSQL
echo "⏳ Ожидание готовности PostgreSQL..."
sleep 5

# Проверка статуса
echo "📊 Статус контейнеров:"
docker-compose ps

# Проверка логов
echo "📋 Последние логи:"
docker-compose logs --tail=20

echo "✅ Docker окружение запущено!"
echo ""
echo "📌 Доступные сервисы:"
echo "   - Приложение: http://localhost:3000"
echo "   - API: http://localhost:5000"
echo "   - PgAdmin: http://localhost:5050"
echo "   - PostgreSQL: localhost:5432"
echo "   - Redis: localhost:6379"
echo ""
echo "💡 Полезные команды:"
echo "   - Логи: docker-compose logs -f"
echo "   - Остановка: docker-compose down"
echo "   - Перезапуск: docker-compose restart"