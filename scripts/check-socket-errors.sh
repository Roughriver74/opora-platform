#!/bin/bash

# Скрипт для проверки источника ошибок "Socket connection: ERROR" на сервере

echo "🔍 Поиск источника ошибок 'Socket connection: ERROR'..."
echo ""

# Проверяем все контейнеры
echo "📦 Проверка всех контейнеров:"
docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Status}}"
echo ""

# Ищем ошибки в логах всех контейнеров
echo "🔎 Поиск 'Socket connection' в логах всех контейнеров:"
echo ""

for container in $(docker ps --format "{{.Names}}"); do
    errors=$(docker logs "$container" 2>&1 | grep -i "Socket connection" | head -5)
    if [ -n "$errors" ]; then
        echo "⚠️  === Контейнер: $container ==="
        echo "$errors"
        echo ""
        echo "Контекст (последние 10 строк с ошибками):"
        docker logs "$container" 2>&1 | grep -A 3 -B 3 -i "Socket connection" | head -15
        echo ""
        echo "---"
        echo ""
    fi
done

echo ""
echo "🔎 Поиск 'Name or service not known' в логах:"
echo ""

for container in $(docker ps --format "{{.Names}}"); do
    errors=$(docker logs "$container" 2>&1 | grep -i "Name or service not known" | head -3)
    if [ -n "$errors" ]; then
        echo "⚠️  === Контейнер: $container ==="
        echo "$errors"
        echo ""
    fi
done

echo ""
echo "🔎 Проверка контейнеров beton-crm:"
echo ""

# Проверяем конкретно наши контейнеры
for container in beton_backend beton_frontend beton_redis beton_postgres beton_elasticsearch beton_promtail; do
    if docker ps --format "{{.Names}}" | grep -q "^${container}$"; then
        echo "--- Контейнер: $container ---"
        echo "Последние 10 строк логов:"
        docker logs "$container" --tail 10 2>&1
        echo ""
    fi
done

echo ""
echo "🔎 Проверка контейнеров мониторинга (если есть):"
echo ""

# Проверяем контейнеры мониторинга
for container in $(docker ps --format "{{.Names}}" | grep -E "monitoring|prometheus|loki|grafana"); do
    echo "--- Контейнер: $container ---"
    echo "Последние 10 строк логов:"
    docker logs "$container" --tail 10 2>&1 | head -20
    echo ""
done

echo ""
echo "✅ Проверка завершена"

