#!/bin/bash

# Скрипт для проверки конфигурации Promtail и отправки логов

echo "🔍 Проверка конфигурации Promtail..."
echo ""

# Проверяем, запущен ли Promtail
if ! docker ps --format "{{.Names}}" | grep -q "^beton_promtail$"; then
    echo "❌ Контейнер beton_promtail не запущен!"
    echo "   Запустите: docker compose up -d promtail"
    exit 1
fi

echo "✅ Контейнер beton_promtail запущен"
echo ""

# Проверяем статус контейнера
echo "📊 Статус контейнера:"
docker ps --filter "name=beton_promtail" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo ""

# Проверяем конфигурацию
echo "📋 Проверка конфигурации Promtail:"
echo ""

# Проверяем, существует ли конфиг файл
if [ ! -f "promtail-config.yaml" ]; then
    echo "❌ Файл promtail-config.yaml не найден в текущей директории!"
    echo "   Убедитесь, что вы находитесь в корне проекта"
else
    echo "✅ Файл promtail-config.yaml найден"
fi
echo ""

# Проверяем адрес Loki
echo "1. Адрес Loki:"
if [ -f "promtail-config.yaml" ]; then
    loki_url=$(grep -A 2 "clients:" promtail-config.yaml | grep "url:" | head -1 | awk '{print $2}')
    echo "   $loki_url"
else
    echo "   ⚠️  Не удалось определить (файл конфигурации не найден)"
fi
echo ""

# Проверяем конфигурацию внутри контейнера
echo "2. Проверка конфигурации внутри контейнера:"
if docker exec beton_promtail test -f /etc/promtail/config.yml; then
    echo "   ✅ Конфигурационный файл найден в контейнере"
    echo "   Проверка пути к логам Docker:"
    docker exec beton_promtail cat /etc/promtail/config.yml | grep -A 1 "__path__" | head -2
else
    echo "   ❌ Конфигурационный файл не найден в контейнере!"
fi
echo ""

# Проверяем доступность путей к логам
echo "3. Проверка доступности путей к логам:"
if docker exec beton_promtail test -d /var/lib/docker/containers; then
    echo "   ✅ /var/lib/docker/containers доступен"
    container_count=$(docker exec beton_promtail ls -1 /var/lib/docker/containers 2>/dev/null | wc -l)
    echo "   Найдено контейнеров: $container_count"
else
    echo "   ❌ /var/lib/docker/containers недоступен!"
fi

if docker exec beton_promtail test -S /var/run/docker.sock; then
    echo "   ✅ /var/run/docker.sock доступен"
else
    echo "   ❌ /var/run/docker.sock недоступен!"
fi
echo ""

# Проверяем метки
echo "4. Метки конфигурации:"
if [ -f "promtail-config.yaml" ]; then
    host_label=$(grep -A 1 "external_labels:" promtail-config.yaml | grep "host:" | awk '{print $2}')
    echo "   - host: $host_label"
    container_name_count=$(grep "target_label: 'container_name'" promtail-config.yaml | wc -l)
    echo "   - container_name используется: $container_name_count раз(а)"
else
    echo "   ⚠️  Не удалось проверить (файл конфигурации не найден)"
fi
echo ""

# Проверяем логи Promtail
echo "5. Последние логи Promtail (последние 20 строк):"
docker logs beton_promtail --tail 20 2>&1
echo ""

# Проверяем ошибки в логах
echo "6. Ошибки и предупреждения в логах Promtail:"
errors=$(docker logs beton_promtail 2>&1 | grep -iE "error|warn|fatal" | tail -10)
if [ -n "$errors" ]; then
    echo "$errors"
else
    echo "   ✅ Ошибок не найдено"
fi
echo ""

# Проверяем доступность Loki
echo "7. Проверка доступности Loki (45.146.164.152:3100):"
if curl -s --max-time 5 http://45.146.164.152:3100/ready >/dev/null 2>&1; then
    echo "   ✅ Loki доступен"
    # Проверяем метрики
    if curl -s --max-time 5 http://45.146.164.152:3100/metrics >/dev/null 2>&1; then
        echo "   ✅ Метрики Loki доступны"
    fi
else
    echo "   ⚠️  Loki недоступен или не готов"
    echo "   Проверьте, запущен ли Loki на сервере 45.146.164.152:3100"
fi
echo ""

# Проверяем, отправляются ли логи
echo "8. Проверка отправки логов (последние строки с упоминанием push/url/client):"
push_logs=$(docker logs beton_promtail 2>&1 | grep -iE "push|url|client|sent|batch" | tail -10)
if [ -n "$push_logs" ]; then
    echo "$push_logs"
else
    echo "   ⚠️  Не найдено записей об отправке логов"
fi
echo ""

# Проверяем HTTP endpoint Promtail
echo "9. Проверка HTTP endpoint Promtail (localhost:9080):"
if curl -s --max-time 3 http://localhost:9080/ready >/dev/null 2>&1; then
    echo "   ✅ Promtail HTTP endpoint доступен"
    # Получаем метрики
    metrics=$(curl -s --max-time 3 http://localhost:9080/metrics 2>/dev/null | grep -E "promtail_read_lines_total|promtail_sent_bytes_total" | head -5)
    if [ -n "$metrics" ]; then
        echo "   Метрики Promtail:"
        echo "$metrics" | sed 's/^/   /'
    fi
else
    echo "   ⚠️  Promtail HTTP endpoint недоступен (возможно, порт не проброшен)"
fi
echo ""

echo "✅ Проверка завершена"

