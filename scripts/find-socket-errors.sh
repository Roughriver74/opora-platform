#!/bin/bash

# Более точный поиск источника ошибок "Socket connection: ERROR"

echo "🔍 Детальный поиск ошибок 'Socket connection: ERROR'..."
echo ""

# Ищем точное совпадение
echo "=== Поиск точного совпадения 'Socket connection: ERROR' ==="
for container in $(docker ps --format "{{.Names}}"); do
    count=$(docker logs "$container" 2>&1 | grep -c "Socket connection: ERROR" 2>/dev/null || echo "0")
    if [ -n "$count" ] && [ "$count" -gt 0 ]; then
        echo ""
        echo "⚠️  Контейнер: $container - найдено $count ошибок"
        echo "Последние 5 ошибок:"
        docker logs "$container" 2>&1 | grep "Socket connection: ERROR" | tail -5
        echo ""
        echo "Контекст (строки вокруг ошибок):"
        docker logs "$container" 2>&1 | grep -A 2 -B 2 "Socket connection: ERROR" | tail -20
        echo ""
        echo "---"
    fi
done

echo ""
echo "=== Поиск '[Errno -2] Name or service not known' ==="
for container in $(docker ps --format "{{.Names}}"); do
    count=$(docker logs "$container" 2>&1 | grep -c "Errno -2" 2>/dev/null || echo "0")
    if [ -n "$count" ] && [ "$count" -gt 0 ]; then
        echo ""
        echo "⚠️  Контейнер: $container - найдено $count ошибок"
        docker logs "$container" 2>&1 | grep "Errno -2" | tail -5
        echo ""
    fi
done

echo ""
echo "=== Проверка Python-процессов (Errno -2 это Python ошибка) ==="
for container in $(docker ps --format "{{.Names}}"); do
    # Проверяем, есть ли Python в контейнере
    if docker exec "$container" which python3 >/dev/null 2>&1 || docker exec "$container" which python >/dev/null 2>&1; then
        echo "🐍 Контейнер $container содержит Python"
        echo "Процессы Python:"
        docker exec "$container" ps aux | grep -E "python|Python" | head -5
        echo ""
    fi
done

echo ""
echo "=== Проверка последних ERROR в логах всех контейнеров ==="
for container in $(docker ps --format "{{.Names}}"); do
    errors=$(docker logs "$container" --tail 100 2>&1 | grep -i "ERROR" | tail -3)
    if [ -n "$errors" ]; then
        echo "--- $container ---"
        echo "$errors"
        echo ""
    fi
done

echo ""
echo "✅ Поиск завершен"

