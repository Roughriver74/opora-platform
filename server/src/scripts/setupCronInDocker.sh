#!/bin/bash

# Скрипт для настройки cron-задач инкрементальной синхронизации в Docker контейнере

echo "🕐 Настройка cron-задач для инкрементальной синхронизации..."

# Создаем директорию для логов
mkdir -p /app/logs

# Создаем cron-задачу для инкрементальной синхронизации
cat > /tmp/incremental-sync-cron << 'EOF'
# Инкрементальная синхронизация Elasticsearch
# Каждые 2 часа
0 */2 * * * cd /app && node dist/scripts/incrementalSyncCron.js >> logs/incremental-sync-cron.log 2>&1

# Ежедневно в 2:00 ночи (полная синхронизация)
0 2 * * * cd /app && node dist/scripts/incrementalSyncCron.js >> logs/incremental-sync-cron.log 2>&1
EOF

# Устанавливаем cron-задачу
crontab /tmp/incremental-sync-cron

# Удаляем временный файл
rm /tmp/incremental-sync-cron

# Запускаем cron демон
service cron start

echo "✅ Cron-задачи настроены:"
echo "  - Каждые 2 часа: инкрементальная синхронизация"
echo "  - Ежедневно в 2:00: полная синхронизация"
echo "  - Логи: /app/logs/incremental-sync-cron.log"

# Показываем текущие cron-задачи
echo "📋 Текущие cron-задачи:"
crontab -l

