#!/bin/bash

# Скрипт для проверки конфигурации Promtail и отправки логов

echo "🔍 Проверка конфигурации Promtail..."
echo ""

# Проверяем, запущен ли Promtail
if ! docker ps --format "{{.Names}}" | grep -q "^beton_promtail$"; then
    echo "❌ Контейнер beton_promtail не запущен!"
    exit 1
fi

echo "✅ Контейнер beton_promtail запущен"
echo ""

# Проверяем конфигурацию
echo "📋 Проверка конфигурации Promtail:"
echo ""

# Проверяем адрес Loki
echo "1. Адрес Loki:"
grep -A 2 "clients:" promtail-config.yaml | grep "url:" | head -1
echo ""

# Проверяем метки
echo "2. Метки:"
echo "   - host: $(grep -A 1 "external_labels:" promtail-config.yaml | grep "host:" | awk '{print $2}')"
echo "   - container_name: $(grep "target_label: 'container_name'" promtail-config.yaml | wc -l) раз(а) найдено"
echo ""

# Проверяем логи Promtail
echo "3. Последние логи Promtail (последние 10 строк):"
docker logs beton_promtail --tail 10 2>&1
echo ""

# Проверяем ошибки в логах
echo "4. Ошибки в логах Promtail:"
errors=$(docker logs beton_promtail 2>&1 | grep -i "error\|warn" | tail -5)
if [ -n "$errors" ]; then
    echo "$errors"
else
    echo "   ✅ Ошибок не найдено"
fi
echo ""

# Проверяем доступность Loki
echo "5. Проверка доступности Loki (45.146.164.152:3100):"
if curl -s --max-time 5 http://45.146.164.152:3100/ready >/dev/null 2>&1; then
    echo "   ✅ Loki доступен"
else
    echo "   ⚠️  Loki недоступен или не готов"
fi
echo ""

# Проверяем, отправляются ли логи
echo "6. Проверка отправки логов (последние 20 строк с упоминанием push/url):"
docker logs beton_promtail 2>&1 | grep -i "push\|url\|client" | tail -5
echo ""

echo "✅ Проверка завершена"

