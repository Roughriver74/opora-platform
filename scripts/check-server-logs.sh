#!/bin/bash

# Скрипт для проверки логов на сервере и поиска источника ошибок "Socket connection: ERROR"

# Параметры сервера
SERVER_USER="root"
SERVER_IP="31.128.39.123"

echo "🔍 Подключение к серверу и поиск источника ошибок..."
echo ""

ssh $SERVER_USER@$SERVER_IP << 'ENDSSH'
echo "📦 Список всех контейнеров:"
docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Status}}"
echo ""

echo "🔎 Поиск 'Socket connection' в логах всех контейнеров:"
echo ""

# Ищем в логах всех контейнеров
for container in $(docker ps --format "{{.Names}}"); do
    count=$(docker logs "$container" 2>&1 | grep -c "Socket connection" || echo "0")
    if [ "$count" -gt 0 ]; then
        echo "⚠️  Контейнер: $container - найдено $count ошибок 'Socket connection'"
        echo "Последние 3 ошибки:"
        docker logs "$container" 2>&1 | grep "Socket connection" | tail -3
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
        count=$(docker logs "$container" 2>&1 | grep -c "Socket connection" || echo "0")
        if [ "$count" -gt 0 ]; then
            echo "⚠️  Найдено $count ошибок 'Socket connection'"
            docker logs "$container" 2>&1 | grep "Socket connection" | tail -5
        else
            echo "✅ Ошибок 'Socket connection' не найдено"
        fi
        echo ""
    fi
done

echo ""
echo "🔎 Проверка контейнеров мониторинга (monitoring_deploy):"
echo ""

# Проверяем контейнеры мониторинга
for container in $(docker ps --format "{{.Names}}" | grep -E "monitoring|prometheus|loki|grafana"); do
    echo "--- Контейнер: $container ---"
    count=$(docker logs "$container" 2>&1 | grep -c "Socket connection" || echo "0")
    if [ "$count" -gt 0 ]; then
        echo "⚠️  Найдено $count ошибок 'Socket connection'"
        echo "Последние 5 ошибок:"
        docker logs "$container" 2>&1 | grep "Socket connection" | tail -5
        echo ""
        echo "Контекст (последние 20 строк с ошибками):"
        docker logs "$container" --tail 50 2>&1 | grep -A 2 -B 2 "Socket connection" | head -20
    else
        echo "✅ Ошибок 'Socket connection' не найдено"
    fi
    echo ""
done

echo ""
echo "🔎 Проверка 'Name or service not known' в логах:"
echo ""

for container in $(docker ps --format "{{.Names}}"); do
    count=$(docker logs "$container" 2>&1 | grep -c "Name or service not known" || echo "0")
    if [ "$count" -gt 0 ]; then
        echo "⚠️  Контейнер: $container - найдено $count ошибок"
        docker logs "$container" 2>&1 | grep "Name or service not known" | tail -3
        echo ""
    fi
done

echo ""
echo "✅ Проверка завершена"
ENDSSH

