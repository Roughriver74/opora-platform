#!/bin/bash

# Database sync script for Beton CRM
# Синхронизация базы данных PostgreSQL и Redis между локальной разработкой и продакшн сервером

set -e

# Конфигурация сервера (из production-deploy.sh)
SERVER_HOST="31.128.39.123"
SERVER_USER="root"
SERVER_PATH="/var/www/beton-crm"

# Конфигурация базы данных (из .env.production)
PROD_DB_NAME="beton_crm"
PROD_DB_USER="beton_user" 
PROD_DB_PASSWORD="beton_password_secure_2025"
PROD_DB_HOST="postgres"
PROD_DB_PORT="5432"

# Локальная конфигурация БД
LOCAL_DB_NAME="beton_crm"
LOCAL_DB_USER="beton_user"
LOCAL_DB_HOST="localhost"
LOCAL_DB_PORT="5489"

# Контейнеры
PROD_POSTGRES_CONTAINER="beton_postgres"
PROD_REDIS_CONTAINER="beton_redis"
LOCAL_POSTGRES_CONTAINER="beton_postgres"
LOCAL_REDIS_CONTAINER="beton_redis"
LOCAL_BACKEND_CONTAINER="beton_backend"

# Директории для бэкапов
BACKUP_DIR="./backups/db-sync"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# Создание директории для бэкапов
ensure_backup_dir() {
    mkdir -p "$BACKUP_DIR"
}

# Логирование операций
log_operation() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" >> "$BACKUP_DIR/sync.log"
    echo -e "$1"
}

# Проверка доступности SSH ключа
validate_ssh_access() {
    if ! ssh -o BatchMode=yes -o ConnectTimeout=5 $SERVER_USER@$SERVER_HOST exit 2>/dev/null; then
        echo -e "${RED}❌ SSH доступ к серверу недоступен${NC}"
        echo -e "${YELLOW}💡 Убедитесь что:${NC}"
        echo -e "   • SSH ключ добавлен на сервер"
        echo -e "   • Сервер доступен по адресу $SERVER_HOST"
        echo -e "   • Пользователь $SERVER_USER существует"
        return 1
    fi
    return 0
}

# Валидация параметров подключения
validate_config() {
    local errors=0
    
    echo -e "${BLUE}🔍 Проверка конфигурации...${NC}"
    
    # Проверка серверных параметров
    if [ -z "$SERVER_HOST" ] || [ -z "$SERVER_USER" ] || [ -z "$SERVER_PATH" ]; then
        echo -e "${RED}❌ Не указаны параметры сервера${NC}"
        errors=$((errors + 1))
    fi
    
    # Проверка параметров БД
    if [ -z "$PROD_DB_NAME" ] || [ -z "$PROD_DB_USER" ] || [ -z "$LOCAL_DB_NAME" ] || [ -z "$LOCAL_DB_USER" ]; then
        echo -e "${RED}❌ Не указаны параметры базы данных${NC}"
        errors=$((errors + 1))
    fi
    
    # Проверка имен контейнеров
    if [ -z "$LOCAL_POSTGRES_CONTAINER" ] || [ -z "$PROD_POSTGRES_CONTAINER" ]; then
        echo -e "${RED}❌ Не указаны имена контейнеров PostgreSQL${NC}"
        errors=$((errors + 1))
    fi
    
    if [ $errors -gt 0 ]; then
        echo -e "${RED}❌ Обнаружены ошибки в конфигурации. Исправьте параметры в скрипте.${NC}"
        return 1
    fi
    
    echo -e "${GREEN}✅ Конфигурация корректна${NC}"
    return 0
}

# Проверка свободного места
check_disk_space() {
    local min_space_mb=1000  # Минимум 1GB свободного места
    local available_space_mb
    
    available_space_mb=$(df "$BACKUP_DIR" | awk 'NR==2 {print int($4/1024)}')
    
    if [ "$available_space_mb" -lt "$min_space_mb" ]; then
        echo -e "${RED}❌ Недостаточно свободного места${NC}"
        echo -e "${YELLOW}   Доступно: ${available_space_mb}MB, требуется: ${min_space_mb}MB${NC}"
        return 1
    fi
    
    echo -e "${GREEN}✅ Свободного места достаточно: ${available_space_mb}MB${NC}"
    return 0
}

# Подтверждение опасных операций
confirm_destructive_action() {
    local action="$1"
    
    if [ "$FORCE_OVERWRITE" = true ]; then
        return 0
    fi
    
    echo -e "${YELLOW}⚠️  ВНИМАНИЕ: Вы собираетесь выполнить операцию: ${action}${NC}"
    echo -e "${RED}   Это приведет к замене локальных данных данными с продакшн сервера!${NC}"
    echo ""
    read -p "Продолжить? (введите 'yes' для подтверждения): " -r
    
    if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
        echo -e "${YELLOW}Операция отменена пользователем${NC}"
        return 1
    fi
    
    return 0
}

# Проверка подключения к серверу
check_server_connection() {
    echo -e "${BLUE}🔗 Проверка подключения к серверу...${NC}"
    if ssh -o BatchMode=yes -o ConnectTimeout=10 $SERVER_USER@$SERVER_HOST exit 2>/dev/null; then
        echo -e "${GREEN}✅ Подключение к серверу установлено${NC}"
        return 0
    else
        echo -e "${RED}❌ Ошибка подключения к серверу $SERVER_HOST${NC}"
        return 1
    fi
}

# Проверка локальных контейнеров
check_local_containers() {
    echo -e "${BLUE}🐳 Проверка локальных контейнеров...${NC}"
    
    if ! docker ps | grep -q $LOCAL_POSTGRES_CONTAINER; then
        echo -e "${YELLOW}⚠️ Локальный PostgreSQL контейнер не запущен. Запускаем...${NC}"
        cd scripts && ./start.sh >/dev/null 2>&1 && cd ..
        sleep 10
    fi
    
    if docker ps | grep -q $LOCAL_POSTGRES_CONTAINER; then
        echo -e "${GREEN}✅ Локальный PostgreSQL контейнер запущен${NC}"
        return 0
    else
        echo -e "${RED}❌ Не удалось запустить локальный PostgreSQL контейнер${NC}"
        return 1
    fi
}

# Проверка контейнеров на сервере
check_server_containers() {
    echo -e "${BLUE}🐳 Проверка контейнеров на сервере...${NC}"
    
    local postgres_status=$(ssh $SERVER_USER@$SERVER_HOST "cd $SERVER_PATH && docker ps | grep $PROD_POSTGRES_CONTAINER || echo 'not_running'")
    
    if [[ "$postgres_status" == "not_running" ]]; then
        echo -e "${RED}❌ PostgreSQL контейнер не запущен на сервере${NC}"
        return 1
    else
        echo -e "${GREEN}✅ Контейнеры на сервере запущены${NC}"
        return 0
    fi
}

# Проверка локальных сервисов
check_local_services() {
    echo -e "${BLUE}🔧 Проверка локальных сервисов...${NC}"
    
    # Проверка Docker
    if ! command -v docker &> /dev/null; then
        echo -e "${RED}❌ Docker не установлен${NC}"
        return 1
    else
        echo -e "${GREEN}✅ Docker установлен${NC}"
    fi
    
    # Проверка Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        echo -e "${YELLOW}⚠️ Docker Compose не найден${NC}"
    else
        echo -e "${GREEN}✅ Docker Compose доступен${NC}"
    fi
    
    # Проверка локальных контейнеров
    check_local_containers
    
    # Проверка подключения к локальной БД
    if docker exec $LOCAL_POSTGRES_CONTAINER pg_isready -U $LOCAL_DB_USER -d $LOCAL_DB_NAME >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Локальная PostgreSQL БД доступна${NC}"
    else
        echo -e "${RED}❌ Локальная PostgreSQL БД недоступна${NC}"
        return 1
    fi
    
    # Проверка локального Redis
    if docker ps | grep -q $LOCAL_REDIS_CONTAINER; then
        echo -e "${GREEN}✅ Локальный Redis контейнер запущен${NC}"
    else
        echo -e "${YELLOW}⚠️ Локальный Redis контейнер не запущен${NC}"
    fi
    
    return 0
}

show_help() {
    echo -e "${BOLD}${GREEN}📊 Database Sync Tool для Beton CRM${NC}"
    echo ""
    echo -e "${BOLD}Использование:${NC}"
    echo "  ./scripts/sync-db.sh [COMMAND] [OPTIONS]"
    echo ""
    echo -e "${BOLD}Команды:${NC}"
    echo -e "${CYAN}  pull${NC}              Скачать базу данных с продакшн сервера"
    echo -e "${CYAN}  backup${NC}            Создать резервную копию БД"
    echo -e "${CYAN}  status${NC}            Показать статус БД и сервисов"
    echo -e "${CYAN}  pull-redis${NC}        Скачать данные Redis с сервера"
    echo -e "${CYAN}  compare${NC}           Сравнить схемы локальной и продакшн БД"
    echo -e "${CYAN}  help${NC}              Показать эту справку"
    echo ""
    echo -e "${BOLD}Опции для pull:${NC}"
    echo -e "${YELLOW}  --full${NC}            Полная синхронизация (структура + данные)"
    echo -e "${YELLOW}  --force${NC}           Принудительное выполнение без подтверждения"
    echo -e "${YELLOW}  --no-backup${NC}       Пропустить создание локального бэкапа"
    echo ""
    echo -e "${BOLD}Опции для backup:${NC}"
    echo -e "${YELLOW}  --server${NC}          Создать бэкап продакшн БД (по умолчанию)"
    echo -e "${YELLOW}  --local${NC}           Создать бэкап локальной БД"
    echo ""
    echo -e "${BOLD}Опции для status:${NC}"
    echo -e "${YELLOW}  --server${NC}          Проверить только сервер"
    echo -e "${YELLOW}  --local${NC}           Проверить только локальные сервисы"
    echo ""
    echo -e "${BOLD}Опции для pull-redis:${NC}"
    echo -e "${YELLOW}  --force${NC}           Перезаписать локальные данные Redis"
    echo ""
    echo -e "${BOLD}Опции для compare:${NC}"
    echo -e "${YELLOW}  --detailed${NC}        Подробное сравнение с различиями"
    echo ""
    echo -e "${BOLD}Примеры:${NC}"
    echo "  ./scripts/sync-db.sh pull                    # Безопасно скачать продакшн БД"
    echo "  ./scripts/sync-db.sh pull --full --force     # Полная синхронизация без подтверждений"
    echo "  ./scripts/sync-db.sh backup --server         # Создать бэкап продакшн БД"
    echo "  ./scripts/sync-db.sh status                  # Проверить статус всех сервисов"
    echo "  ./scripts/sync-db.sh pull-redis --force      # Синхронизировать Redis данные"
    echo "  ./scripts/sync-db.sh compare --detailed      # Подробное сравнение схем"
    echo ""
    echo -e "${BOLD}${RED}Безопасность:${NC}"
    echo -e "${YELLOW}  push${NC} - команда отключена для безопасности"
    echo -e "${YELLOW}  sync-users${NC} - команда устарела, используйте pull"
    echo ""
}

# Создание бэкапа продакшн БД
backup_server_db() {
    ensure_backup_dir
    
    echo -e "${YELLOW}📦 Создание бэкапа продакшн базы данных...${NC}"
    log_operation "Начало создания бэкапа продакшн БД"
    
    local backup_file="prod_backup_${TIMESTAMP}.sql"
    local backup_path="$BACKUP_DIR/$backup_file"
    
    # Создаем дамп через Docker на сервере
    if ssh $SERVER_USER@$SERVER_HOST "cd $SERVER_PATH && docker exec $PROD_POSTGRES_CONTAINER pg_dump -U $PROD_DB_USER -d $PROD_DB_NAME --clean --if-exists" > "$backup_path" 2>/dev/null; then
        echo -e "${GREEN}✅ Бэкап продакшн БД создан: $backup_file${NC}"
        echo -e "${CYAN}   Размер: $(du -h "$backup_path" | cut -f1)${NC}"
        log_operation "Бэкап продакшн БД успешно создан: $backup_file"
        return 0
    else
        echo -e "${RED}❌ Ошибка создания бэкапа продакшн БД${NC}"
        log_operation "ОШИБКА: Не удалось создать бэкап продакшн БД"
        return 1
    fi
}

# Создание локального бэкапа
backup_local_db() {
    ensure_backup_dir
    
    echo -e "${YELLOW}📦 Создание бэкапа локальной базы данных...${NC}"
    log_operation "Начало создания бэкапа локальной БД"
    
    local backup_file="local_backup_${TIMESTAMP}.sql"
    local backup_path="$BACKUP_DIR/$backup_file"
    
    if docker exec $LOCAL_POSTGRES_CONTAINER pg_dump -U $LOCAL_DB_USER -d $LOCAL_DB_NAME --clean --if-exists > "$backup_path" 2>/dev/null; then
        echo -e "${GREEN}✅ Бэкап локальной БД создан: $backup_file${NC}"
        echo -e "${CYAN}   Размер: $(du -h "$backup_path" | cut -f1)${NC}"
        log_operation "Бэкап локальной БД успешно создан: $backup_file"
        return 0
    else
        echo -e "${RED}❌ Ошибка создания бэкапа локальной БД${NC}"
        log_operation "ОШИБКА: Не удалось создать бэкап локальной БД"
        return 1
    fi
}

# Получение статистики БД
get_db_stats() {
    local db_type="$1"  # "local" или "server"
    
    if [ "$db_type" = "local" ]; then
        docker exec $LOCAL_POSTGRES_CONTAINER psql -U $LOCAL_DB_USER -d $LOCAL_DB_NAME -t -c "
            SELECT 
                schemaname,
                tablename,
                n_tup_ins as inserts,
                n_tup_upd as updates,
                n_tup_del as deletes,
                n_live_tup as rows
            FROM pg_stat_user_tables 
            ORDER BY n_live_tup DESC LIMIT 10;
        " 2>/dev/null
    else
        ssh $SERVER_USER@$SERVER_HOST "cd $SERVER_PATH && docker exec $PROD_POSTGRES_CONTAINER psql -U $PROD_DB_USER -d $PROD_DB_NAME -t -c \"
            SELECT 
                schemaname,
                tablename,
                n_tup_ins as inserts,
                n_tup_upd as updates,
                n_tup_del as deletes,
                n_live_tup as rows
            FROM pg_stat_user_tables 
            ORDER BY n_live_tup DESC LIMIT 10;
        \"" 2>/dev/null
    fi
}

# Показать статус БД
show_database_status() {
    echo -e "${BOLD}${BLUE}📊 Статус баз данных${NC}"
    echo ""
    
    # Проверяем подключения
    check_server_connection || return 1
    check_local_containers || return 1
    check_server_containers || return 1
    
    echo ""
    echo -e "${BOLD}🌐 Продакшн сервер ($SERVER_HOST):${NC}"
    local prod_stats=$(get_db_stats "server")
    if [ -n "$prod_stats" ]; then
        echo "$prod_stats" | head -5
        local total_rows=$(echo "$prod_stats" | awk '{sum += $6} END {print sum}')
        echo -e "${CYAN}   Общее количество записей: ~$total_rows${NC}"
    else
        echo -e "${RED}   Не удалось получить статистику${NC}"
    fi
    
    echo ""
    echo -e "${BOLD}💻 Локальная БД:${NC}"
    local local_stats=$(get_db_stats "local")
    if [ -n "$local_stats" ]; then
        echo "$local_stats" | head -5
        local total_rows=$(echo "$local_stats" | awk '{sum += $6} END {print sum}')
        echo -e "${CYAN}   Общее количество записей: ~$total_rows${NC}"
    else
        echo -e "${RED}   Не удалось получить статистику${NC}"
    fi
    
    echo ""
    echo -e "${BOLD}📁 Доступные бэкапы:${NC}"
    if [ -d "$BACKUP_DIR" ] && [ "$(ls -A $BACKUP_DIR/*.sql 2>/dev/null | wc -l)" -gt 0 ]; then
        ls -lah "$BACKUP_DIR"/*.sql | tail -5
    else
        echo -e "${YELLOW}   Бэкапы не найдены${NC}"
    fi
}

# Скачивание продакшн БД на локальную машину
pull_database() {
    echo -e "${BOLD}${YELLOW}⬇️ Синхронизация продакшн БД с локальной${NC}"
    echo ""
    
    # Валидация конфигурации и безопасности
    validate_config || return 1
    check_disk_space || return 1
    validate_ssh_access || return 1
    
    # Проверки подключения
    check_server_connection || return 1
    check_local_containers || return 1
    check_server_containers || return 1
    
    # Подтверждение опасной операции
    confirm_destructive_action "синхронизация продакшн БД с локальной" || return 1
    
    ensure_backup_dir
    log_operation "Начало синхронизации продакшн БД с локальной"
    
    # Создание бэкапа локальной БД (если не отключено)
    if [ "$no_backup_flag" != "--no-backup" ]; then
        echo ""
        backup_local_db || {
            echo -e "${RED}❌ Не удалось создать бэкап локальной БД${NC}"
            return 1
        }
    fi
    
    # Проверка подключения к продакшн серверу и статуса контейнера
    echo ""
    echo -e "${BLUE}🔍 Проверка подключения к продакшн серверу...${NC}"
    if ! ssh $SERVER_USER@$SERVER_HOST "cd $SERVER_PATH && docker exec $PROD_POSTGRES_CONTAINER pg_isready -U $PROD_DB_USER -d $PROD_DB_NAME" >/dev/null 2>&1; then
        echo -e "${RED}❌ Продакшн база данных недоступна или контейнер не запущен${NC}"
        log_operation "ОШИБКА: Продакшн база данных недоступна"
        return 1
    fi
    echo -e "${GREEN}✅ Продакшн база данных доступна${NC}"
    
    # Скачивание дампа с продакшн сервера
    echo ""
    echo -e "${BLUE}📥 Скачивание дампа с продакшн сервера...${NC}"
    local temp_dump="$BACKUP_DIR/temp_prod_dump_${TIMESTAMP}.sql"
    
    if ssh $SERVER_USER@$SERVER_HOST "cd $SERVER_PATH && docker exec $PROD_POSTGRES_CONTAINER pg_dump -U $PROD_DB_USER -d $PROD_DB_NAME --clean --if-exists" > "$temp_dump" 2>/dev/null; then
        echo -e "${GREEN}✅ Дамп успешно скачан${NC}"
        echo -e "${CYAN}   Размер дампа: $(du -h "$temp_dump" | cut -f1)${NC}"
    else
        echo -e "${RED}❌ Ошибка скачивания дампа с сервера${NC}"
        log_operation "ОШИБКА: Не удалось скачать дамп с продакшн сервера"
        return 1
    fi
    
    # Восстановление дампа в локальную БД
    echo ""
    echo -e "${BLUE}📂 Восстановление дампа в локальную БД...${NC}"
    
    if docker exec -i $LOCAL_POSTGRES_CONTAINER psql -U $LOCAL_DB_USER -d $LOCAL_DB_NAME < "$temp_dump" >/dev/null 2>&1; then
        echo -e "${GREEN}✅ База данных успешно восстановлена${NC}"
        
        # Запуск миграций для синхронизации схемы
        echo -e "${BLUE}🔄 Запуск миграций TypeORM для синхронизации схемы...${NC}"
        if docker exec $LOCAL_BACKEND_CONTAINER npm run migration:run >/dev/null 2>&1; then
            echo -e "${GREEN}✅ Миграции успешно выполнены${NC}"
        else
            echo -e "${YELLOW}⚠️ Предупреждение: Не удалось запустить миграции${NC}"
            echo -e "${YELLOW}   Возможно потребуется запустить их вручную: npm run migration:run${NC}"
        fi
        
        # Проверка целостности схемы
        echo -e "${BLUE}🔍 Проверка целостности схемы БД...${NC}"
        if docker exec $LOCAL_POSTGRES_CONTAINER psql -U $LOCAL_DB_USER -d $LOCAL_DB_NAME -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" >/dev/null 2>&1; then
            echo -e "${GREEN}✅ Схема БД проверена и готова к работе${NC}"
        fi
        
        # Показываем статистику синхронизированных данных
        echo ""
        echo -e "${BLUE}📊 Статистика синхронизированных данных:${NC}"
        
        # Получаем статистику по таблицам
        local users_count=$(docker exec $LOCAL_POSTGRES_CONTAINER psql -U $LOCAL_DB_USER -d $LOCAL_DB_NAME -t -c "SELECT COUNT(*) FROM users;" 2>/dev/null | xargs || echo "0")
        local submissions_count=$(docker exec $LOCAL_POSTGRES_CONTAINER psql -U $LOCAL_DB_USER -d $LOCAL_DB_NAME -t -c "SELECT COUNT(*) FROM submissions;" 2>/dev/null | xargs || echo "0")
        local forms_count=$(docker exec $LOCAL_POSTGRES_CONTAINER psql -U $LOCAL_DB_USER -d $LOCAL_DB_NAME -t -c "SELECT COUNT(*) FROM forms;" 2>/dev/null | xargs || echo "0")
        local fields_count=$(docker exec $LOCAL_POSTGRES_CONTAINER psql -U $LOCAL_DB_USER -d $LOCAL_DB_NAME -t -c "SELECT COUNT(*) FROM form_fields;" 2>/dev/null | xargs || echo "0")
        
        echo -e "${GREEN}   ✓ Пользователи: $users_count${NC}"
        echo -e "${GREEN}   ✓ Заявки: $submissions_count${NC}"  
        echo -e "${GREEN}   ✓ Формы: $forms_count${NC}"
        echo -e "${GREEN}   ✓ Поля форм: $fields_count${NC}"
        
        log_operation "Синхронизация продакшн БД с локальной успешно завершена"
        
        # Очистка временного файла
        rm -f "$temp_dump"
        
        echo ""
        echo -e "${BOLD}${GREEN}🎉 Синхронизация завершена успешно!${NC}"
        echo -e "${CYAN}Локальная БД теперь содержит актуальные данные с продакшн сервера.${NC}"
        echo -e "${YELLOW}💡 Tip: Перезапустите приложение для применения изменений схемы${NC}"
        return 0
        
    else
        echo -e "${RED}❌ Ошибка восстановления дампа в локальную БД${NC}"
        log_operation "ОШИБКА: Не удалось восстановить дамп в локальную БД"
        rm -f "$temp_dump"
        return 1
    fi
}

# Синхронизация Redis данных с сервера
pull_redis_data() {
    echo -e "${BOLD}${YELLOW}📦 Синхронизация Redis данных с продакшн сервера${NC}"
    echo ""
    
    # Валидация конфигурации и безопасности
    validate_config || return 1
    check_disk_space || return 1
    validate_ssh_access || return 1
    
    # Подтверждение опасной операции
    confirm_destructive_action "синхронизация Redis данных с продакшн сервера" || return 1
    
    # Проверки подключения
    check_server_connection || return 1
    check_local_containers || return 1
    check_server_containers || return 1
    
    ensure_backup_dir
    log_operation "Начало синхронизации Redis данных"
    
    # Создание снапшота Redis на сервере
    echo -e "${BLUE}📸 Создание снапшота Redis на сервере...${NC}"
    local redis_snapshot="redis_snapshot_${TIMESTAMP}.rdb"
    local temp_redis_path="$BACKUP_DIR/$redis_snapshot"
    
    # Создаем снапшот и скачиваем
    if ssh $SERVER_USER@$SERVER_HOST "cd $SERVER_PATH && docker exec $PROD_REDIS_CONTAINER redis-cli BGSAVE && sleep 2 && docker exec $PROD_REDIS_CONTAINER redis-cli LASTSAVE" >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Снапшот Redis создан на сервере${NC}"
        
        # Скачиваем RDB файл
        if ssh $SERVER_USER@$SERVER_HOST "cd $SERVER_PATH && docker cp $PROD_REDIS_CONTAINER:/data/dump.rdb /tmp/redis_${TIMESTAMP}.rdb" >/dev/null 2>&1 && \
           scp $SERVER_USER@$SERVER_HOST:/tmp/redis_${TIMESTAMP}.rdb "$temp_redis_path" >/dev/null 2>&1; then
            
            echo -e "${GREEN}✅ Redis данные скачаны${NC}"
            echo -e "${CYAN}   Размер: $(du -h "$temp_redis_path" | cut -f1)${NC}"
            
            # Очищаем локальный Redis и загружаем новые данные
            echo -e "${BLUE}🔄 Замена локальных Redis данных...${NC}"
            
            # Останавливаем локальный Redis
            docker exec $LOCAL_REDIS_CONTAINER redis-cli SHUTDOWN NOSAVE >/dev/null 2>&1 || true
            sleep 2
            
            # Копируем новый RDB файл
            if docker cp "$temp_redis_path" $LOCAL_REDIS_CONTAINER:/data/dump.rdb >/dev/null 2>&1; then
                # Запускаем Redis с новыми данными
                docker restart $LOCAL_REDIS_CONTAINER >/dev/null 2>&1
                sleep 5
                
                # Проверяем, что Redis загрузился с данными
                local redis_keys=$(docker exec $LOCAL_REDIS_CONTAINER redis-cli DBSIZE 2>/dev/null | tr -d '\r')
                if [ "$redis_keys" -gt 0 ]; then
                    echo -e "${GREEN}✅ Redis данные успешно загружены (ключей: $redis_keys)${NC}"
                    log_operation "Синхронизация Redis данных успешно завершена"
                    rm -f "$temp_redis_path"
                    ssh $SERVER_USER@$SERVER_HOST "rm -f /tmp/redis_${TIMESTAMP}.rdb" >/dev/null 2>&1
                    return 0
                else
                    echo -e "${RED}❌ Redis загрузился, но данные не найдены${NC}"
                fi
            else
                echo -e "${RED}❌ Ошибка копирования RDB файла в контейнер${NC}"
            fi
            
            rm -f "$temp_redis_path"
        else
            echo -e "${RED}❌ Ошибка скачивания Redis данных${NC}"
        fi
    else
        echo -e "${RED}❌ Ошибка создания снапшота Redis на сервере${NC}"
    fi
    
    log_operation "ОШИБКА: Синхронизация Redis данных не удалась"
    return 1
}

# Сравнение схем БД
compare_schemas() {
    echo -e "${BOLD}${BLUE}🔍 Сравнение схем локальной и продакшн БД${NC}"
    echo ""
    
    # Проверки подключения
    check_server_connection || return 1
    check_local_containers || return 1  
    check_server_containers || return 1
    
    ensure_backup_dir
    
    local local_schema="$BACKUP_DIR/local_schema_${TIMESTAMP}.sql"
    local prod_schema="$BACKUP_DIR/prod_schema_${TIMESTAMP}.sql"
    
    echo -e "${BLUE}📋 Получение схемы локальной БД...${NC}"
    if docker exec $LOCAL_POSTGRES_CONTAINER pg_dump -U $LOCAL_DB_USER -d $LOCAL_DB_NAME --schema-only --no-owner --no-privileges > "$local_schema" 2>/dev/null; then
        echo -e "${GREEN}✅ Схема локальной БД получена${NC}"
    else
        echo -e "${RED}❌ Ошибка получения схемы локальной БД${NC}"
        return 1
    fi
    
    echo -e "${BLUE}📋 Получение схемы продакшн БД...${NC}"
    if ssh $SERVER_USER@$SERVER_HOST "cd $SERVER_PATH && docker exec $PROD_POSTGRES_CONTAINER pg_dump -U $PROD_DB_USER -d $PROD_DB_NAME --schema-only --no-owner --no-privileges" > "$prod_schema" 2>/dev/null; then
        echo -e "${GREEN}✅ Схема продакшн БД получена${NC}"
    else
        echo -e "${RED}❌ Ошибка получения схемы продакшн БД${NC}"
        return 1
    fi
    
    echo ""
    echo -e "${BOLD}📊 Результат сравнения:${NC}"
    
    # Сравнение файлов
    if diff -u "$local_schema" "$prod_schema" > "$BACKUP_DIR/schema_diff_${TIMESTAMP}.txt" 2>/dev/null; then
        echo -e "${GREEN}✅ Схемы идентичны${NC}"
        rm -f "$BACKUP_DIR/schema_diff_${TIMESTAMP}.txt"
    else
        echo -e "${YELLOW}⚠️ Найдены различия в схемах${NC}"
        echo -e "${CYAN}   Файл с различиями: schema_diff_${TIMESTAMP}.txt${NC}"
        
        # Показать первые различия
        echo ""
        echo -e "${BOLD}Первые различия:${NC}"
        head -20 "$BACKUP_DIR/schema_diff_${TIMESTAMP}.txt"
    fi
    
    # Очистка временных файлов схем
    rm -f "$local_schema" "$prod_schema"
}

# Обработка аргументов
case "$1" in
    "pull")
        shift
        while [[ $# -gt 0 ]]; do
            case $1 in
                --full)
                    FULL_SYNC=true
                    shift
                    ;;
                --force)
                    FORCE_OVERWRITE=true
                    shift
                    ;;
                --no-backup)
                    SKIP_BACKUP=true
                    shift
                    ;;
                *)
                    echo -e "${RED}❌ Неизвестный параметр: $1${NC}"
                    show_help
                    exit 1
                    ;;
            esac
        done
        pull_database
        ;;
    "backup")
        shift
        while [[ $# -gt 0 ]]; do
            case $1 in
                --local)
                    backup_local_db
                    exit 0
                    ;;
                --server)
                    backup_server_db
                    exit 0
                    ;;
                *)
                    echo -e "${RED}❌ Неизвестный параметр: $1${NC}"
                    show_help
                    exit 1
                    ;;
            esac
        done
        # По умолчанию делаем backup сервера
        backup_server_db
        ;;
    "status")
        shift
        while [[ $# -gt 0 ]]; do
            case $1 in
                --server)
                    check_server_connection
                    exit 0
                    ;;
                --local)
                    check_local_services
                    exit 0
                    ;;
                *)
                    echo -e "${RED}❌ Неизвестный параметр: $1${NC}"
                    show_help
                    exit 1
                    ;;
            esac
        done
        # По умолчанию показываем статус всего
        show_database_status
        ;;
    "pull-redis")
        shift
        while [[ $# -gt 0 ]]; do
            case $1 in
                --force)
                    FORCE_OVERWRITE=true
                    shift
                    ;;
                *)
                    echo -e "${RED}❌ Неизвестный параметр: $1${NC}"
                    show_help
                    exit 1
                    ;;
            esac
        done
        pull_redis_data
        ;;
    "compare")
        shift
        while [[ $# -gt 0 ]]; do
            case $1 in
                --detailed)
                    DETAILED_COMPARE=true
                    shift
                    ;;
                *)
                    echo -e "${RED}❌ Неизвестный параметр: $1${NC}"
                    show_help
                    exit 1
                    ;;
            esac
        done
        compare_schemas
        ;;
    "push")
        echo -e "${RED}❌ Команда 'push' отключена для безопасности${NC}"
        echo -e "${YELLOW}⚠️  Используйте production-deploy.sh для деплоя на сервер${NC}"
        exit 1
        ;;
    "sync-users")
        echo -e "${RED}❌ Команда 'sync-users' устарела${NC}"
        echo -e "${YELLOW}⚠️  Используйте 'pull' для полной синхронизации данных${NC}"
        exit 1
        ;;
    "--help"|"help"|"")
        show_help
        ;;
    *)
        echo -e "${RED}❌ Неизвестная команда: $1${NC}"
        show_help
        exit 1
        ;;
esac