#!/bin/bash

# Скрипт для ручного запуска инкрементальной синхронизации в Docker

echo "🔄 Запуск инкрементальной синхронизации в Docker..."

# Проверяем, что контейнеры запущены
if ! docker compose ps | grep -q "Up"; then
    echo "❌ Контейнеры не запущены. Запустите сначала: ./scripts/start.sh"
    exit 1
fi

# Проверяем доступность Elasticsearch
echo "🔍 Проверка доступности Elasticsearch..."
ELASTICSEARCH_CHECK=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:9200/_cluster/health 2>/dev/null || echo "000")

if [ "$ELASTICSEARCH_CHECK" != "200" ]; then
    echo "❌ Elasticsearch недоступен. Проверьте статус контейнеров: docker compose ps"
    exit 1
fi

echo "✅ Elasticsearch доступен"

# Проверяем доступность API
echo "🔍 Проверка доступности API..."
API_CHECK=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5001/health 2>/dev/null || echo "000")

if [ "$API_CHECK" != "200" ]; then
    echo "❌ API недоступен. Проверьте статус контейнеров: docker compose ps"
    exit 1
fi

echo "✅ API доступен"

# Инициализируем алиас если нужно
echo "🔧 Инициализация алиаса Elasticsearch..."
docker compose exec -T backend curl -X POST http://localhost:3000/api/incremental-sync/initialize-alias

# Запускаем инкрементальную синхронизацию
echo "📦 Выполнение инкрементальной синхронизации..."

# Получаем параметры из командной строки
FORCE_FULL_SYNC=${1:-false}
BATCH_SIZE=${2:-200}

echo "⚙️  Параметры: forceFullSync=$FORCE_FULL_SYNC, batchSize=$BATCH_SIZE"

# Выполняем синхронизацию
docker compose exec -T backend curl -X POST http://localhost:3000/api/incremental-sync/all \
    -H "Content-Type: application/json" \
    -d "{\"forceFullSync\": $FORCE_FULL_SYNC, \"batchSize\": $BATCH_SIZE}"

if [ $? -eq 0 ]; then
    echo "✅ Инкрементальная синхронизация завершена успешно"
    
    # Показываем статус
    echo "📊 Статус синхронизации:"
    docker compose exec -T backend curl -s http://localhost:3000/api/incremental-sync/status | jq '.' 2>/dev/null || echo "Статус недоступен"
else
    echo "❌ Ошибка при выполнении инкрементальной синхронизации"
    exit 1
fi

