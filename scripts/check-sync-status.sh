#!/bin/bash

# Скрипт для проверки статуса инкрементальной синхронизации

echo "📊 Проверка статуса инкрементальной синхронизации..."

# Проверяем, что контейнеры запущены
if ! docker compose ps | grep -q "Up"; then
    echo "❌ Контейнеры не запущены. Запустите сначала: ./scripts/start.sh"
    exit 1
fi

# Проверяем доступность API
echo "🔍 Проверка доступности API..."
API_CHECK=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5001/health 2>/dev/null || echo "000")

if [ "$API_CHECK" != "200" ]; then
    echo "❌ API недоступен. Проверьте статус контейнеров: docker compose ps"
    exit 1
fi

echo "✅ API доступен"

# Получаем статус синхронизации
echo "📋 Статус синхронизации:"
docker compose exec -T backend curl -s http://localhost:3000/api/incremental-sync/status | jq '.' 2>/dev/null || echo "Статус недоступен"

echo ""
echo "📈 Статистика индекса Elasticsearch:"
docker compose exec -T backend curl -s http://localhost:3000/api/incremental-sync/stats | jq '.' 2>/dev/null || echo "Статистика недоступна"

echo ""
echo "📝 Логи cron-синхронизации (последние 20 строк):"
docker compose exec -T backend tail -20 logs/incremental-sync-cron.log 2>/dev/null || echo "Логи недоступны"

