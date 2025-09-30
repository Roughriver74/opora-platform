#!/bin/bash

# Скрипт для синхронизации локальной БД с dev сервером
# Использование: ./scripts/sync-db-to-dev.sh

# Цвета для вывода
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Параметры сервера
SERVER_USER="root"
SERVER_IP="31.129.109.2"
APP_DIR="/var/www/beton-crm"

echo -e "${YELLOW}=== Синхронизация БД с DEV сервером ===${NC}"

# Загружаем переменные окружения для БД
if [ -f ".env" ]; then
    export $(grep -v '^#' .env | xargs)
fi

# Если пароль не найден в .env, запрашиваем его интерактивно
if [ -z "$DB_PASSWORD" ]; then
    echo -e "${YELLOW}Пароль для PostgreSQL не найден в .env файле${NC}"
    echo -e "${BLUE}Введите пароль для подключения к локальной БД:${NC}"
    read -s POSTGRES_PASSWORD
    if [ -n "$DB_PASSWORD" ]; then
        echo -e "${GREEN}✓ Пароль получен${NC}"
    else
        echo -e "${RED}❌ Пароль обязателен для синхронизации БД${NC}"
        exit 1
    fi
fi

# Проверка локальной базы данных
echo -e "${BLUE}1. Проверка локальной базы данных...${NC}"
LOCAL_DB_AVAILABLE=false
LOCAL_DB_TYPE=""

# Проверяем Docker PostgreSQL
if docker ps --format "table {{.Names}}" | grep -q "beton_postgres"; then
    if PGPASSWORD="$DB_PASSWORD" docker exec beton_postgres psql -U beton_user -d beton_crm -c "SELECT 1;" &>/dev/null; then
        echo -e "${GREEN}✅ Docker PostgreSQL доступен${NC}"
        LOCAL_DB_AVAILABLE=true
        LOCAL_DB_TYPE="docker"
    else
        echo -e "${RED}❌ Docker PostgreSQL недоступен с указанным паролем${NC}"
    fi
fi

# Проверяем системную PostgreSQL
if [ "$LOCAL_DB_AVAILABLE" = false ] && command -v psql &> /dev/null; then
    if PGPASSWORD="$DB_PASSWORD" psql -h localhost -U postgres -d beton_crm -c "SELECT 1;" &>/dev/null; then
        echo -e "${GREEN}✅ Системная PostgreSQL доступна${NC}"
        LOCAL_DB_AVAILABLE=true
        LOCAL_DB_TYPE="system"
    else
        echo -e "${RED}❌ Системная PostgreSQL недоступна с указанным паролем${NC}"
    fi
fi

if [ "$LOCAL_DB_AVAILABLE" = false ]; then
    echo -e "${RED}❌ Локальная БД недоступна. Проверьте пароль и статус БД${NC}"
    exit 1
fi

# Проверка доступности сервера
echo -e "${BLUE}2. Проверка доступности dev сервера...${NC}"
if ! ssh -o BatchMode=yes -o ConnectTimeout=5 $SERVER_USER@$SERVER_IP exit 2>/dev/null; then
    echo -e "${RED}❌ Dev сервер ($SERVER_IP) недоступен${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Dev сервер доступен${NC}"

# Проверка статуса контейнеров на сервере
echo -e "${BLUE}3. Проверка статуса контейнеров на сервере...${NC}"
CONTAINER_STATUS=$(ssh $SERVER_USER@$SERVER_IP "cd $APP_DIR && docker-compose ps | grep postgres | awk '{print \$4}'" 2>/dev/null)
if [ "$CONTAINER_STATUS" != "Up" ]; then
    echo -e "${YELLOW}⚠️ PostgreSQL контейнер на сервере не запущен. Запускаем...${NC}"
    ssh $SERVER_USER@$SERVER_IP "cd $APP_DIR && docker-compose up -d postgres"
    sleep 10
fi

# Создание дампа локальной БД
echo -e "${BLUE}4. Создание дампа локальной БД...${NC}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="local_to_dev_backup_${TIMESTAMP}.sql"
LOCAL_DUMP_FILE="/tmp/beton_crm_dump_${TIMESTAMP}.sql"

if [ "$LOCAL_DB_TYPE" = "docker" ]; then
    PGPASSWORD="$POSTGRES_PASSWORD" docker exec beton_postgres pg_dump -U beton_user -d beton_crm --clean --if-exists > "$LOCAL_DUMP_FILE" 2>/dev/null
elif [ "$LOCAL_DB_TYPE" = "system" ]; then
    PGPASSWORD="$POSTGRES_PASSWORD" pg_dump -h localhost -U postgres -d beton_crm --clean --if-exists > "$LOCAL_DUMP_FILE" 2>/dev/null
fi

if [ ! -f "$LOCAL_DUMP_FILE" ] || [ ! -s "$LOCAL_DUMP_FILE" ]; then
    echo -e "${RED}❌ Не удалось создать дамп локальной БД${NC}"
    exit 1
fi

DUMP_SIZE=$(du -h "$LOCAL_DUMP_FILE" | cut -f1)
echo -e "${GREEN}✅ Дамп локальной БД создан (размер: $DUMP_SIZE)${NC}"

# Показываем статистику локальной БД
echo -e "${BLUE}📊 Статистика локальной БД:${NC}"
if [ "$LOCAL_DB_TYPE" = "docker" ]; then
    USERS_COUNT=$(PGPASSWORD="$POSTGRES_PASSWORD" docker exec beton_postgres psql -U beton_user -d beton_crm -t -c 'SELECT COUNT(*) FROM users;' 2>/dev/null | xargs || echo "0")
    SUBMISSIONS_COUNT=$(PGPASSWORD="$POSTGRES_PASSWORD" docker exec beton_postgres psql -U beton_user -d beton_crm -t -c 'SELECT COUNT(*) FROM submissions;' 2>/dev/null | xargs || echo "0")
    FORMS_COUNT=$(PGPASSWORD="$POSTGRES_PASSWORD" docker exec beton_postgres psql -U beton_user -d beton_crm -t -c 'SELECT COUNT(*) FROM forms;' 2>/dev/null | xargs || echo "0")
elif [ "$LOCAL_DB_TYPE" = "system" ]; then
    USERS_COUNT=$(PGPASSWORD="$POSTGRES_PASSWORD" psql -h localhost -U postgres -d beton_crm -t -c 'SELECT COUNT(*) FROM users;' 2>/dev/null | xargs || echo "0")
    SUBMISSIONS_COUNT=$(PGPASSWORD="$POSTGRES_PASSWORD" psql -h localhost -U postgres -d beton_crm -t -c 'SELECT COUNT(*) FROM submissions;' 2>/dev/null | xargs || echo "0")
    FORMS_COUNT=$(PGPASSWORD="$POSTGRES_PASSWORD" psql -h localhost -U postgres -d beton_crm -t -c 'SELECT COUNT(*) FROM forms;' 2>/dev/null | xargs || echo "0")
fi

echo -e "   📋 Пользователи: $USERS_COUNT"
echo -e "   📋 Заявки: $SUBMISSIONS_COUNT"
echo -e "   📋 Формы: $FORMS_COUNT"

# Подтверждение синхронизации
echo ""
echo -e "${YELLOW}⚠️ ВНИМАНИЕ: Это действие перезапишет БД на dev сервере!${NC}"
echo -e "${BLUE}Продолжить синхронизацию? (y/N):${NC}"
read -r CONFIRM
if [[ ! "$CONFIRM" =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}❌ Синхронизация отменена${NC}"
    rm -f "$LOCAL_DUMP_FILE"
    exit 0
fi

# Копирование дампа на сервер
echo -e "${BLUE}5. Копирование дампа на сервер...${NC}"
ssh $SERVER_USER@$SERVER_IP "mkdir -p $APP_DIR/backups/db-sync"
if ! scp "$LOCAL_DUMP_FILE" $SERVER_USER@$SERVER_IP:$APP_DIR/backups/db-sync/$BACKUP_FILE; then
    echo -e "${RED}❌ Ошибка при копировании дампа на сервер!${NC}"
    rm -f "$LOCAL_DUMP_FILE"
    exit 1
fi
echo -e "${GREEN}✅ Дамп скопирован на сервер${NC}"

# Создание резервной копии БД на сервере
echo -e "${BLUE}6. Создание резервной копии БД на сервере...${NC}"
ssh $SERVER_USER@$SERVER_IP << ENDSSH
cd $APP_DIR

# Создаем резервную копию текущей БД
BACKUP_NAME="server_backup_\$(date +%s).sql"
echo "Создание резервной копии серверной БД..."
docker-compose exec -T postgres pg_dump -U beton_user -d beton_crm --clean --if-exists > backups/db-sync/\$BACKUP_NAME 2>/dev/null || true

if [ -f "backups/db-sync/\$BACKUP_NAME" ] && [ -s "backups/db-sync/\$BACKUP_NAME" ]; then
    echo "✅ Резервная копия серверной БД создана: \$BACKUP_NAME"
else
    echo "⚠️ Не удалось создать резервную копию серверной БД"
fi
ENDSSH

# Восстановление БД на сервере
echo -e "${BLUE}7. Восстановление БД на сервере...${NC}"
ssh $SERVER_USER@$SERVER_IP << ENDSSH
cd $APP_DIR

echo "Восстановление БД из дампа..."
docker-compose exec -T postgres psql -U beton_user -d beton_crm < backups/db-sync/$BACKUP_FILE

if [ \$? -eq 0 ]; then
    echo "✅ База данных восстановлена на сервере"
    
    # Показываем статистику восстановленной БД
    USERS_COUNT=\$(docker exec beton_postgres psql -U beton_user -d beton_crm -t -c 'SELECT COUNT(*) FROM users;' 2>/dev/null | xargs || echo "0")
    SUBMISSIONS_COUNT=\$(docker exec beton_postgres psql -U beton_user -d beton_crm -t -c 'SELECT COUNT(*) FROM submissions;' 2>/dev/null | xargs || echo "0")
    FORMS_COUNT=\$(docker exec beton_postgres psql -U beton_user -d beton_crm -t -c 'SELECT COUNT(*) FROM forms;' 2>/dev/null | xargs || echo "0")
    
    echo "📊 Статистика восстановленной БД:"
    echo "   ✅ Пользователи: \$USERS_COUNT"
    echo "   ✅ Заявки: \$SUBMISSIONS_COUNT"
    echo "   ✅ Формы: \$FORMS_COUNT"
else
    echo "❌ Ошибка восстановления БД"
    exit 1
fi
ENDSSH

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ База данных успешно синхронизирована!${NC}"
else
    echo -e "${RED}❌ Ошибка при восстановлении БД на сервере${NC}"
    rm -f "$LOCAL_DUMP_FILE"
    exit 1
fi

# Очистка временных файлов
rm -f "$LOCAL_DUMP_FILE"

echo -e "${GREEN}=== Синхронизация БД завершена успешно! ===${NC}"
echo -e "${YELLOW}Приложение доступно по адресу: ${BLUE}http://$SERVER_IP:3000${NC}"
echo -e "${YELLOW}Для просмотра логов: ${BLUE}ssh $SERVER_USER@$SERVER_IP 'cd $APP_DIR && docker-compose logs -f'${NC}"
