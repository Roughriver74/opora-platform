#!/bin/bash

# Скрипт для проверки Promtail на сервере
# Использование: ./scripts/check-promtail-server.sh

echo "🔍 Проверка Promtail на сервере..."
echo ""

# Проверяем, что мы на сервере или подключены по SSH
if [ -z "$SSH_CONNECTION" ] && ! ssh -o ConnectTimeout=5 root@45.146.164.152 "echo 'connected'" >/dev/null 2>&1; then
    echo "⚠️  Подключение к серверу..."
    ssh root@45.146.164.152 << 'ENDSSH'
cd /root/beton-crm || cd /opt/beton-crm || cd ~/beton-crm || pwd

echo "📂 Текущая директория: $(pwd)"
echo ""

# Проверяем контейнер
echo "1. Проверка контейнера beton_promtail:"
if docker ps --format "{{.Names}}" | grep -q "^beton_promtail$"; then
    echo "   ✅ Контейнер запущен"
    docker ps --filter "name=beton_promtail" --format "table {{.Names}}\t{{.Status}}\t{{.Image}}"
else
    echo "   ❌ Контейнер не запущен!"
    echo "   Попытка запуска..."
    docker compose up -d promtail 2>&1
fi
echo ""

# Проверяем конфигурацию
echo "2. Проверка конфигурации:"
if [ -f "promtail-config.yaml" ]; then
    echo "   ✅ Файл promtail-config.yaml найден"
    echo "   Адрес Loki:"
    grep -A 2 "clients:" promtail-config.yaml | grep "url:" | head -1 | sed 's/^/   /'
    echo "   Путь к логам Docker:"
    grep -A 1 "__path__" promtail-config.yaml | grep "replacement:" | sed 's/^/   /'
else
    echo "   ❌ Файл promtail-config.yaml не найден!"
fi
echo ""

# Проверяем логи
echo "3. Последние логи Promtail (последние 30 строк):"
docker logs beton_promtail --tail 30 2>&1 | tail -30
echo ""

# Проверяем ошибки
echo "4. Ошибки и предупреждения:"
errors=$(docker logs beton_promtail 2>&1 | grep -iE "error|warn|fatal" | tail -10)
if [ -n "$errors" ]; then
    echo "$errors"
else
    echo "   ✅ Ошибок не найдено"
fi
echo ""

# Проверяем доступность Loki
echo "5. Проверка доступности Loki:"
if curl -s --max-time 5 http://45.146.164.152:3100/ready >/dev/null 2>&1; then
    echo "   ✅ Loki доступен на 45.146.164.152:3100"
else
    echo "   ❌ Loki недоступен на 45.146.164.152:3100"
fi
echo ""

# Проверяем отправку логов
echo "6. Проверка отправки логов:"
push_info=$(docker logs beton_promtail 2>&1 | grep -iE "push|sent|batch" | tail -5)
if [ -n "$push_info" ]; then
    echo "$push_info"
else
    echo "   ⚠️  Не найдено записей об отправке"
fi
echo ""

# Проверяем доступность путей
echo "7. Проверка доступности путей в контейнере:"
if docker exec beton_promtail test -d /var/lib/docker/containers 2>/dev/null; then
    echo "   ✅ /var/lib/docker/containers доступен"
    container_dirs=$(docker exec beton_promtail ls -1 /var/lib/docker/containers 2>/dev/null | wc -l)
    echo "   Найдено директорий контейнеров: $container_dirs"
else
    echo "   ❌ /var/lib/docker/containers недоступен"
fi

if docker exec beton_promtail test -S /var/run/docker.sock 2>/dev/null; then
    echo "   ✅ /var/run/docker.sock доступен"
else
    echo "   ❌ /var/run/docker.sock недоступен"
fi
echo ""

# Проверяем конфигурацию внутри контейнера
echo "8. Проверка конфигурации внутри контейнера:"
if docker exec beton_promtail test -f /etc/promtail/config.yml 2>/dev/null; then
    echo "   ✅ Конфигурационный файл найден"
    echo "   Проверка пути к логам:"
    docker exec beton_promtail grep -A 1 "__path__" /etc/promtail/config.yml 2>/dev/null | head -2 | sed 's/^/   /'
else
    echo "   ❌ Конфигурационный файл не найден!"
fi
echo ""

echo "✅ Проверка завершена"
ENDSSH
else
    # Если мы уже на сервере
    cd /root/beton-crm || cd /opt/beton-crm || cd ~/beton-crm || pwd
    
    echo "📂 Текущая директория: $(pwd)"
    echo ""
    
    # Запускаем локальную проверку
    if [ -f "scripts/check-promtail-config.sh" ]; then
        bash scripts/check-promtail-config.sh
    else
        echo "❌ Скрипт check-promtail-config.sh не найден"
    fi
fi

