#!/bin/bash

# Скрипт для запуска cron-синхронизации инкрементальной системы Elasticsearch
# Предназначен для запуска по расписанию (cron)

# Настройки
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
LOG_DIR="$PROJECT_ROOT/logs"
LOG_FILE="$LOG_DIR/incremental-sync-cron.log"
PID_FILE="$PROJECT_ROOT/incremental-sync-cron.pid"

# Создаем директорию для логов если не существует
mkdir -p "$LOG_DIR"

# Функция логирования
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Функция очистки при завершении
cleanup() {
    if [ -f "$PID_FILE" ]; then
        rm -f "$PID_FILE"
    fi
    log "Cron-синхронизация завершена"
}

# Устанавливаем обработчики сигналов
trap cleanup EXIT INT TERM

# Проверяем, не запущена ли уже синхронизация
if [ -f "$PID_FILE" ]; then
    PID=$(cat "$PID_FILE")
    if ps -p "$PID" > /dev/null 2>&1; then
        log "Cron-синхронизация уже запущена (PID: $PID), пропускаем"
        exit 0
    else
        log "Удаляем устаревший PID файл"
        rm -f "$PID_FILE"
    fi
fi

# Записываем PID текущего процесса
echo $$ > "$PID_FILE"

log "🚀 Запуск cron-синхронизации инкрементальной системы Elasticsearch"

# Переходим в директорию проекта
cd "$PROJECT_ROOT"

# Проверяем наличие Node.js
if ! command -v node &> /dev/null; then
    log "❌ Node.js не найден"
    exit 1
fi

# Проверяем наличие ts-node
if ! command -v ts-node &> /dev/null; then
    log "❌ ts-node не найден"
    exit 1
fi

# Проверяем наличие файла .env
if [ ! -f .env ]; then
    log "❌ Файл .env не найден"
    exit 1
fi

# Проверяем доступность базы данных
log "🔍 Проверка доступности базы данных..."
if ! node -e "
const { AppDataSource } = require('./server/dist/database/config/database.config');
AppDataSource.initialize()
  .then(() => {
    console.log('✅ База данных доступна');
    process.exit(0);
  })
  .catch((error) => {
    console.log('❌ База данных недоступна:', error.message);
    process.exit(1);
  });
" 2>> "$LOG_FILE"; then
    log "❌ База данных недоступна"
    exit 1
fi

# Проверяем доступность Elasticsearch
log "🔍 Проверка доступности Elasticsearch..."
if ! node -e "
const { elasticsearchService } = require('./server/dist/services/elasticsearchService');
elasticsearchService.healthCheck()
  .then((isHealthy) => {
    if (isHealthy) {
      console.log('✅ Elasticsearch доступен');
      process.exit(0);
    } else {
      console.log('❌ Elasticsearch недоступен');
      process.exit(1);
    }
  })
  .catch((error) => {
    console.log('❌ Ошибка проверки Elasticsearch:', error.message);
    process.exit(1);
  });
" 2>> "$LOG_FILE"; then
    log "❌ Elasticsearch недоступен"
    exit 1
fi

# Запускаем cron-синхронизацию
log "⚡ Запуск инкрементальной cron-синхронизации..."
if npx ts-node server/src/scripts/incrementalSyncCron.ts 2>&1 | tee -a "$LOG_FILE"; then
    log "✅ Cron-синхронизация завершена успешно"
    exit 0
else
    log "❌ Cron-синхронизация завершена с ошибками"
    exit 1
fi

