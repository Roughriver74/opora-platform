#!/bin/bash

# Скрипт для поиска реальных источников ошибок "Socket connection" в реальном времени

echo "🔍 Поиск реальных источников ошибок 'Socket connection: ERROR'..."
echo "Проверяем логи за последние 5 минут..."
echo ""

# Проверяем все контейнеры на наличие ошибок за последние 5 минут
for container in $(docker ps --format "{{.Names}}"); do
    echo "=== Контейнер: $container ==="
    
    # Ищем ошибки за последние 5 минут
    recent_errors=$(docker logs "$container" --since 5m 2>&1 | grep -i "Socket connection: ERROR" | wc -l)
    
    if [ "$recent_errors" -gt 0 ]; then
        echo "⚠️  Найдено $recent_errors ошибок за последние 5 минут!"
        echo "Последние ошибки:"
        docker logs "$container" --since 5m 2>&1 | grep -i "Socket connection: ERROR" | tail -3
        echo ""
        echo "Контекст (строки вокруг ошибок):"
        docker logs "$container" --since 5m 2>&1 | grep -A 3 -B 3 -i "Socket connection: ERROR" | head -15
        echo ""
    else
        echo "✅ Ошибок 'Socket connection: ERROR' за последние 5 минут не найдено"
    fi
    
    # Проверяем Errno -2
    errno_errors=$(docker logs "$container" --since 5m 2>&1 | grep -i "Errno -2\|Name or service not known" | wc -l)
    if [ "$errno_errors" -gt 0 ]; then
        echo "⚠️  Найдено $errno_errors ошибок 'Errno -2' или 'Name or service not known'!"
        docker logs "$container" --since 5m 2>&1 | grep -i "Errno -2\|Name or service not known" | tail -3
    fi
    
    echo ""
done

echo ""
echo "📊 Статистика по всем контейнерам:"
echo ""

total_socket=$(docker ps --format "{{.Names}}" | while read container; do
    docker logs "$container" --since 5m 2>&1 | grep -c "Socket connection: ERROR" 2>/dev/null || echo "0"
done | awk '{sum+=$1} END {print sum}')

total_errno=$(docker ps --format "{{.Names}}" | while read container; do
    docker logs "$container" --since 5m 2>&1 | grep -c "Errno -2\|Name or service not known" 2>/dev/null || echo "0"
done | awk '{sum+=$1} END {print sum}')

echo "Всего ошибок 'Socket connection: ERROR' за последние 5 минут: $total_socket"
echo "Всего ошибок 'Errno -2' за последние 5 минут: $total_errno"
echo ""

if [ "$total_socket" -eq 0 ] && [ "$total_errno" -eq 0 ]; then
    echo "✅ Отлично! Ошибки больше не появляются в реальном времени."
    echo "   Это означает, что проблема была исправлена или ошибки были из старых логов."
else
    echo "⚠️  Ошибки все еще появляются! Нужно найти и исправить источник."
fi

echo ""
echo "✅ Проверка завершена"

