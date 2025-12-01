#!/bin/bash

set -euo pipefail

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

SERVER_USER=${SERVER_USER:-root}
SERVER_IP=${SERVER_IP:-31.128.39.123}
REMOTE_SCRIPT_PATH=${REMOTE_SCRIPT_PATH:-/usr/local/bin/beton-cleanup-disk}
CRON_FILE=${CRON_FILE:-/etc/cron.d/beton-cleanup-disk}
CRON_SCHEDULE=${CRON_SCHEDULE:-"0 * * * *"}
REMOTE_LOG=${REMOTE_LOG:-/var/log/beton-cleanup-disk.log}
REMOTE_APP_DIR=${REMOTE_APP_DIR:-/var/www/beton-crm}
REMOTE_BACKUPS_DIR=${REMOTE_BACKUPS_DIR:-$REMOTE_APP_DIR/backups}

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOCAL_CLEANUP_SCRIPT="$SCRIPT_DIR/cleanup-disk.sh"

usage() {
	cat <<'EOF'
Устанавливает скрипт очистки диска на удаленном сервере и настраивает cron.

Переменные окружения:
  SERVER_USER           Пользователь SSH (по умолчанию root)
  SERVER_IP             IP адрес сервера
  REMOTE_SCRIPT_PATH    Путь установки скрипта (/usr/local/bin/beton-cleanup-disk)
  CRON_FILE             Файл cron (/etc/cron.d/beton-cleanup-disk)
  CRON_SCHEDULE         Расписание cron (например "0 * * * *")
  REMOTE_LOG            Путь к лог-файлу (/var/log/beton-cleanup-disk.log)
  REMOTE_APP_DIR        Корневая папка проекта (/var/www/beton-crm)
  REMOTE_BACKUPS_DIR    Папка бэкапов ($REMOTE_APP_DIR/backups)
EOF
}

log_info() {
	echo -e "${BLUE}[INFO] $1${NC}"
}

log_error() {
	echo -e "${RED}[ERROR] $1${NC}"
}

log_success() {
	echo -e "${GREEN}[OK] $1${NC}"
}

require_binary() {
	if ! command -v "$1" >/dev/null 2>&1; then
		log_error "Не найден $1. Установите его и повторите попытку."
		exit 1
	fi
}

if [[ "${1:-}" == '--help' ]]; then
	usage
	exit 0
fi

require_binary ssh
require_binary scp

if [ ! -f "$LOCAL_CLEANUP_SCRIPT" ]; then
	log_error "Скрипт $LOCAL_CLEANUP_SCRIPT не найден"
	exit 1
fi

log_info "Копируем cleanup-скрипт на ${SERVER_USER}@${SERVER_IP}:${REMOTE_SCRIPT_PATH}"
scp "$LOCAL_CLEANUP_SCRIPT" "${SERVER_USER}@${SERVER_IP}:${REMOTE_SCRIPT_PATH}"

log_info 'Настраиваем cron и переменные на сервере...'
ssh "${SERVER_USER}@${SERVER_IP}" bash -s <<EOF
set -euo pipefail
chmod +x "$REMOTE_SCRIPT_PATH"
cat <<'CRON' > "$CRON_FILE"
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
APP_DIR=$REMOTE_APP_DIR
BACKUPS_DIR=$REMOTE_BACKUPS_DIR
DISK_THRESHOLD=85
DOCKER_LOG_MAX_MB=200
TMP_RETENTION_DAYS=3
$CRON_SCHEDULE root $REMOTE_SCRIPT_PATH >> $REMOTE_LOG 2>&1
CRON
chmod 644 "$CRON_FILE"
touch "$REMOTE_LOG"
chmod 644 "$REMOTE_LOG"
if command -v systemctl >/dev/null 2>&1; then
	systemctl restart cron 2>/dev/null || systemctl restart crond 2>/dev/null || true
else
	service cron restart 2>/dev/null || service crond restart 2>/dev/null || true
fi
$REMOTE_SCRIPT_PATH --force >> "$REMOTE_LOG" 2>&1 || true
EOF

log_success 'Автоочистка настроена. Cron будет запускать скрипт автоматически.'

