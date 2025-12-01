#!/bin/bash

set -euo pipefail

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

DISK_THRESHOLD=${DISK_THRESHOLD:-85}
TARGET_PATH=${TARGET_PATH:-/}
APP_DIR=${APP_DIR:-/var/www/beton-crm}
BACKUPS_DIR=${BACKUPS_DIR:-$APP_DIR/backups}
BACKUP_RETENTION_DAYS=${BACKUP_RETENTION_DAYS:-30}
DOCKER_LOG_MAX_MB=${DOCKER_LOG_MAX_MB:-200}
TMP_RETENTION_DAYS=${TMP_RETENTION_DAYS:-3}

FORCE_CLEAN=0
DRY_RUN=0

usage() {
	cat <<'EOF'
Скрипт чистит Docker-кеш, контейнерные логи, старые бэкапы и временные файлы.

Параметры:
  --force         Выполнить очистку независимо от заполнения диска
  --dry-run       Только показать шаги без фактического удаления
  --target=PATH   Раздел/путь для проверки заполнения (по умолчанию /)
  --help          Показать эту справку

Переменные окружения:
  DISK_THRESHOLD           Порог заполнения диска в % (85)
  APP_DIR                  Корневая директория проекта (/var/www/beton-crm)
  BACKUPS_DIR              Папка с бэкапами ($APP_DIR/backups)
  BACKUP_RETENTION_DAYS    Сколько дней хранить бэкапы (30)
  DOCKER_LOG_MAX_MB        Максимальный размер контейнерного лога (200)
  TMP_RETENTION_DAYS       Сколько дней хранить файлы в /tmp (3)
EOF
}

log_info() {
	echo -e "${BLUE}ℹ️  $1${NC}"
}

log_warn() {
	echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
	echo -e "${RED}❌ $1${NC}"
}

log_success() {
	echo -e "${GREEN}✅ $1${NC}"
}

while [[ $# -gt 0 ]]; do
	case "$1" in
	--force)
		FORCE_CLEAN=1
		;;
	--dry-run)
		DRY_RUN=1
		;;
	--target=*)
		TARGET_PATH="${1#*=}"
		;;
	--help)
		usage
		exit 0
		;;
	*)
		log_error "Неизвестный параметр: $1"
		usage
		exit 1
		;;
	esac
	shift
done

get_disk_usage() {
	df -P "$TARGET_PATH" | awk 'NR==2 {gsub(/%/, "", $5); print $5}'
}

run_or_print() {
	if [ "$DRY_RUN" -eq 1 ]; then
		echo -e "${YELLOW}[dry-run] $*${NC}"
	else
		set +e
		"$@"
		local exit_code=$?
		set -e
		return $exit_code
	fi
}

cleanup_docker() {
	if ! command -v docker >/dev/null 2>&1; then
		log_warn 'Docker недоступен, пропускаем очистку образов'
		return
	fi

	log_info 'Очистка Docker объектов...'
	if ! run_or_print docker system prune -af --volumes; then
		log_warn 'docker system prune завершился с ошибкой'
	fi

	if ! run_or_print docker builder prune -af; then
		log_warn 'docker builder prune завершился с ошибкой'
	fi
}

truncate_docker_logs() {
	local logs_dir='/var/lib/docker/containers'

	if [ ! -d "$logs_dir" ]; then
		return
	fi

	log_info "Сжатие логов контейнеров > ${DOCKER_LOG_MAX_MB}MB..."
	local files
	mapfile -t files < <(
		find "$logs_dir" -name '*-json.log' -type f -size +"${DOCKER_LOG_MAX_MB}"M 2>/dev/null
	)

	if [ ${#files[@]} -eq 0 ]; then
		log_info 'Крупные логи не найдены'
		return
	fi

	for file in "${files[@]}"; do
		if [ "$DRY_RUN" -eq 1 ]; then
			echo -e "${YELLOW}[dry-run] truncate -s 0 $file${NC}"
		else
			: >"$file" || log_warn "Не удалось очистить $file"
		fi
	done
}

cleanup_backups() {
	if [ ! -d "$BACKUPS_DIR" ]; then
		log_warn "Папка бэкапов $BACKUPS_DIR не найдена, пропускаем"
		return
	fi

	log_info "Удаление бэкапов старше ${BACKUP_RETENTION_DAYS} дней..."
	if [ "$DRY_RUN" -eq 1 ]; then
		find "$BACKUPS_DIR" -mindepth 1 -mtime +"$BACKUP_RETENTION_DAYS" -print
	else
		find "$BACKUPS_DIR" -type f -mtime +"$BACKUP_RETENTION_DAYS" -print -delete
		find "$BACKUPS_DIR" -type d -empty -delete
	fi
}

cleanup_tmp() {
	log_info "Очистка /tmp старше ${TMP_RETENTION_DAYS} дней..."
	if [ "$DRY_RUN" -eq 1 ]; then
		find /tmp -maxdepth 1 -type f -mtime +"$TMP_RETENTION_DAYS" -print
	else
		find /tmp -maxdepth 1 -type f -mtime +"$TMP_RETENTION_DAYS" -print -delete
	fi
}

main() {
	local disk_usage
	disk_usage=$(get_disk_usage || echo 0)

	if [ "$disk_usage" -eq 0 ]; then
		log_warn 'Не удалось определить заполнение диска, продолжаем с осторожностью'
	else
		log_info "Текущая заполненность $TARGET_PATH: ${disk_usage}%"
	fi

	if [ "$FORCE_CLEAN" -ne 1 ] && [ "$disk_usage" -lt "$DISK_THRESHOLD" ]; then
		log_success "Заполненность ниже порога ${DISK_THRESHOLD}%, очистка не требуется"
		exit 0
	fi

	if [ "$FORCE_CLEAN" -eq 1 ]; then
		log_warn 'Режим --force: запускаем очистку вне зависимости от заполнения'
	else
		log_warn "Заполненность выше ${DISK_THRESHOLD}%, запускаем очистку"
	fi

	cleanup_docker
	truncate_docker_logs
	cleanup_backups
	cleanup_tmp

	log_success 'Очистка завершена'
}

main

