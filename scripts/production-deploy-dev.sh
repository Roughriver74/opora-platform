#!/bin/bash

# Упрощенный скрипт для деплоя Beton CRM на dev сервер
# Использование: ./scripts/production-deploy-dev.sh

# Цвета для вывода
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Параметры сервера
SERVER_USER="root"
SERVER_IP="31.129.109.2"
SERVER_DOMAIN="dev.beton.shknv.ru"
APP_DIR="/var/www/beton-crm"

echo -e "${YELLOW}=== Деплой Beton CRM на DEV сервер ===${NC}"

# Проверка локальной базы данных
echo -e "${BLUE}1. Проверка локальной базы данных...${NC}"
LOCAL_DB_AVAILABLE=false
LOCAL_DB_TYPE=""

# Загружаем переменные окружения для БД
if [ -f ".env" ]; then
    export $(grep -v '^#' .env | xargs)
fi

# Если пароль не найден в .env, запрашиваем его интерактивно
if [ -z "$POSTGRES_PASSWORD" ]; then
    echo -e "${YELLOW}Пароль для PostgreSQL не найден в .env файле${NC}"
    echo -e "${BLUE}Введите пароль для подключения к локальной БД (или нажмите Enter для пропуска):${NC}"
    read -s POSTGRES_PASSWORD
    if [ -n "$POSTGRES_PASSWORD" ]; then
        echo -e "${GREEN}✓ Пароль получен${NC}"
    else
        echo -e "${YELLOW}⚠️ Подключение без пароля${NC}"
    fi
fi

# Проверяем Docker PostgreSQL
if docker ps --format "table {{.Names}}" | grep -q "beton_postgres"; then
    # Пробуем подключиться с паролем из переменных окружения
    if [ -n "$POSTGRES_PASSWORD" ]; then
        if PGPASSWORD="$POSTGRES_PASSWORD" docker exec beton_postgres psql -U beton_user -d beton_crm -c "SELECT 1;" &>/dev/null; then
            echo -e "${GREEN}✅ Docker PostgreSQL доступен (с паролем)${NC}"
            LOCAL_DB_AVAILABLE=true
            LOCAL_DB_TYPE="docker"
        fi
    else
        # Пробуем без пароля
        if docker exec beton_postgres psql -U beton_user -d beton_crm -c "SELECT 1;" &>/dev/null; then
            echo -e "${GREEN}✅ Docker PostgreSQL доступен (без пароля)${NC}"
            LOCAL_DB_AVAILABLE=true
            LOCAL_DB_TYPE="docker"
        fi
    fi
fi

# Проверяем системную PostgreSQL
if [ "$LOCAL_DB_AVAILABLE" = false ] && command -v psql &> /dev/null; then
    # Пробуем с паролем из переменных окружения
    if [ -n "$POSTGRES_PASSWORD" ]; then
        if PGPASSWORD="$POSTGRES_PASSWORD" psql -h localhost -U postgres -d beton_crm -c "SELECT 1;" &>/dev/null; then
            echo -e "${GREEN}✅ Системная PostgreSQL доступна (с паролем)${NC}"
            LOCAL_DB_AVAILABLE=true
            LOCAL_DB_TYPE="system"
        fi
    else
        # Пробуем без пароля
        if psql -h localhost -U postgres -d beton_crm -c "SELECT 1;" &>/dev/null; then
            echo -e "${GREEN}✅ Системная PostgreSQL доступна (без пароля)${NC}"
            LOCAL_DB_AVAILABLE=true
            LOCAL_DB_TYPE="system"
        fi
    fi
fi

if [ "$LOCAL_DB_AVAILABLE" = false ]; then
    echo -e "${YELLOW}⚠️ Локальная БД недоступна - будет создана пустая БД на сервере${NC}"
fi

# Проверка доступности сервера
echo -e "${BLUE}2. Проверка доступности dev сервера...${NC}"
if ! ssh -o BatchMode=yes -o ConnectTimeout=5 $SERVER_USER@$SERVER_IP exit 2>/dev/null; then
    echo -e "${RED}❌ Dev сервер ($SERVER_IP) недоступен${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Dev сервер доступен${NC}"

# Подготовка конфигурации
echo -e "${BLUE}3. Подготовка конфигурации...${NC}"
ENV_FILE="client/.env"
ENV_BACKUP="client/.env.backup"

# Сохранение и изменение .env для сборки
if [ -f "$ENV_FILE" ]; then
    cp "$ENV_FILE" "$ENV_BACKUP"
    echo "REACT_APP_API_URL=https://$SERVER_DOMAIN:5001/api" > "$ENV_FILE"
    echo "NODE_ENV=production" >> "$ENV_FILE"
    echo -e "${GREEN}✓ API URL настроен для dev сервера: https://$SERVER_DOMAIN:5001/api${NC}"
else
    echo "REACT_APP_API_URL=https://$SERVER_DOMAIN:5001/api" > "$ENV_FILE"
    echo "NODE_ENV=production" >> "$ENV_FILE"
    echo -e "${GREEN}✓ Создан .env файл для клиента${NC}"
fi

# Сборка проекта
echo -e "${BLUE}4. Сборка проекта...${NC}"

# Сборка клиента
echo "Сборка клиента..."
cd client
if ! npm ci --silent; then
    echo -e "${RED}❌ Ошибка при установке зависимостей клиента!${NC}"
    cd ..
    # Восстановление локального .env
    if [ -f "$ENV_BACKUP" ]; then
        mv "$ENV_BACKUP" "$ENV_FILE"
    fi
    exit 1
fi

if ! npm run build; then
    echo -e "${RED}❌ Ошибка при сборке клиента!${NC}"
    cd ..
    # Восстановление локального .env
    if [ -f "$ENV_BACKUP" ]; then
        mv "$ENV_BACKUP" "$ENV_FILE"
    fi
    exit 1
fi

echo -e "${GREEN}✓ Клиент успешно собран${NC}"
cd ..

# Сборка сервера
echo "Сборка сервера..."
cd server
if ! npm ci --silent; then
    echo -e "${RED}❌ Ошибка при установке зависимостей сервера!${NC}"
    cd ..
    # Восстановление локального .env
    if [ -f "$ENV_BACKUP" ]; then
        mv "$ENV_BACKUP" "$ENV_FILE"
    fi
    exit 1
fi

if ! npm run build; then
    echo -e "${RED}❌ Ошибка при сборке сервера!${NC}"
    cd ..
    # Восстановление локального .env
    if [ -f "$ENV_BACKUP" ]; then
        mv "$ENV_BACKUP" "$ENV_FILE"
    fi
    exit 1
fi

echo -e "${GREEN}✓ Сервер успешно собран${NC}"
cd ..

# Восстановление локального .env
if [ -f "$ENV_BACKUP" ]; then
    mv "$ENV_BACKUP" "$ENV_FILE"
fi

echo -e "${GREEN}✓ Проект успешно собран${NC}"

# Создание архива
echo -e "${BLUE}5. Создание архива для деплоя...${NC}"
ARCHIVE_NAME="deploy-$(date +%s).tar.gz"
tar -czf "$ARCHIVE_NAME" \
    --exclude="node_modules" \
    --exclude=".git" \
    --exclude="client/node_modules" \
    --exclude="server/node_modules" \
    --exclude="postgres_data" \
    --exclude="redis_data" \
    --exclude="elasticsearch_data" \
    server/dist \
    server/src \
    server/tsconfig.json \
    server/package.json \
    server/package-lock.json \
    server/Dockerfile.production \
    client/build \
    client/package.json \
    client/package-lock.json \
    client/Dockerfile.production \
    client/nginx.conf \
    docker-compose.yml \
    .env.production \
    .env.development

# Проверка успешности создания архива
if [ ! -f "$ARCHIVE_NAME" ]; then
    echo -e "${RED}❌ Архив не создан!${NC}"
    exit 1
fi

# Проверка размера архива
ARCHIVE_SIZE=$(du -h "$ARCHIVE_NAME" | cut -f1)
echo -e "${GREEN}✓ Архив $ARCHIVE_NAME создан (размер: $ARCHIVE_SIZE)${NC}"

# Копирование на сервер
echo -e "${BLUE}6. Копирование файлов на сервер...${NC}"
ssh $SERVER_USER@$SERVER_IP "mkdir -p $APP_DIR"
if ! scp "$ARCHIVE_NAME" $SERVER_USER@$SERVER_IP:$APP_DIR/; then
    echo -e "${RED}❌ Ошибка при копировании файлов на сервер!${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Файлы скопированы на сервер${NC}"

# Деплой на сервер
echo -e "${BLUE}7. Деплой на сервер...${NC}"
ssh $SERVER_USER@$SERVER_IP << ENDSSH
cd $APP_DIR

# Создание резервной копии
if [ -d "server" ] || [ -d "client" ]; then
    echo "Создание резервной копии..."
    BACKUP_NAME="app-backup-\$(date +%s).tar.gz"
    tar -czf \$BACKUP_NAME server client docker-compose.yml 2>/dev/null || true
    mkdir -p backups
    mv \$BACKUP_NAME backups/ 2>/dev/null || true
fi

# Остановка и удаление старых контейнеров (БЕЗ удаления volumes - данные сохраняются!)
echo "Остановка и удаление старых контейнеров..."
docker-compose down --remove-orphans 2>/dev/null || docker compose down --remove-orphans 2>/dev/null || true

# Принудительное удаление контейнеров с префиксом beton_ (на случай, если они остались)
echo "Принудительное удаление старых контейнеров beton_*..."
CONTAINERS=$(docker ps -a --filter "name=beton_" --format "{{.Names}}" 2>/dev/null || true)
if [ -n "$CONTAINERS" ]; then
    echo "$CONTAINERS" | xargs docker rm -f 2>/dev/null || true
fi

docker system prune -f 2>/dev/null || true

# Распаковка нового приложения
echo "Распаковка нового приложения..."
rm -rf server client 2>/dev/null || true
tar -xzf $ARCHIVE_NAME

# Загрузка переменных окружения
if [ -f ".env.development" ]; then
    cp .env.development .env
    echo "✅ Переменные окружения для dev сервера загружены"
elif [ -f ".env.production" ]; then
    cp .env.production .env
    echo "✅ Переменные окружения загружены (используется production конфиг)"
fi

# Запуск контейнеров
echo "Запуск Docker контейнеров..."
docker-compose build --no-cache || docker compose build --no-cache
docker-compose up -d || docker compose up -d

# Ожидание запуска базовых сервисов (postgres, redis, elasticsearch)
echo "⏳ Ожидание запуска базовых сервисов..."
sleep 15

# Проверяем статус запуска
echo "📊 Статус контейнеров после запуска:"
docker-compose ps || docker compose ps

# Проверяем, что базовые сервисы запущены
if ! (docker-compose ps || docker compose ps) | grep -q "postgres.*Up"; then
    echo "❌ PostgreSQL не запустился!"
    (docker-compose logs postgres || docker compose logs postgres) | tail -20
    exit 1
fi

if ! (docker-compose ps || docker compose ps) | grep -q "redis.*Up"; then
    echo "❌ Redis не запустился!"
    (docker-compose logs redis || docker compose logs redis) | tail -20
    exit 1
fi

if ! (docker-compose ps || docker compose ps) | grep -q "elasticsearch.*Up"; then
    echo "❌ Elasticsearch не запустился!"
    (docker-compose logs elasticsearch || docker compose logs elasticsearch) | tail -20
    exit 1
fi

# Дополнительное ожидание для backend
echo "⏳ Ожидание запуска backend..."
sleep 10

# Проверяем статус backend
if ! (docker-compose ps || docker compose ps) | grep -q "backend.*Up"; then
    echo "⚠️  Backend не запустился, проверяем логи..."
    (docker-compose logs backend || docker compose logs backend) | tail -30
    echo "⚠️  Пробуем перезапустить backend..."
    docker-compose restart backend || docker compose restart backend
    sleep 10
fi

# Создание схемы базы данных
echo "Создание схемы базы данных..."
docker-compose exec -T backend npx typeorm schema:sync -d dist/database/config/database.config.js || docker compose exec -T backend npx typeorm schema:sync -d dist/database/config/database.config.js

# Ожидание готовности Elasticsearch
echo "Ожидание готовности Elasticsearch..."
sleep 15
for i in {1..30}; do
    if curl -f -s "http://localhost:9200/_cluster/health" > /dev/null 2>&1; then
        echo "✅ Elasticsearch готов"
        break
    fi
    echo "⏳ Ожидание Elasticsearch... (\$i/30)"
    sleep 3
done

# Инициализация Elasticsearch
echo "Инициализация Elasticsearch..."
docker-compose exec -T backend curl -X POST http://localhost:5001/api/incremental-sync/initialize-alias || docker compose exec -T backend curl -X POST http://localhost:5001/api/incremental-sync/initialize-alias

echo "Выполнение полной синхронизации..."
docker-compose exec -T backend curl -X POST http://localhost:5001/api/incremental-sync/all \
    -H "Content-Type: application/json" \
    -d '{"forceFullSync": true, "batchSize": 200}' || docker compose exec -T backend curl -X POST http://localhost:5001/api/incremental-sync/all \
    -H "Content-Type: application/json" \
    -d '{"forceFullSync": true, "batchSize": 200}'

echo "Деплой завершен!"
ENDSSH

# Синхронизация базы данных
if [ "$LOCAL_DB_AVAILABLE" = true ]; then
    echo -e "${BLUE}8. Синхронизация базы данных...${NC}"
    echo -e "${YELLOW}Используйте отдельный скрипт для синхронизации БД:${NC}"
    echo -e "${BLUE}  ./scripts/sync-db-to-dev.sh${NC}"
    echo -e "${YELLOW}⚠️ Продолжаем деплой без синхронизации БД${NC}"
else
    echo -e "${YELLOW}⚠️ Локальная БД недоступна - используется пустая БД на сервере${NC}"
fi

# Проверка работоспособности
echo -e "${BLUE}9. Проверка работоспособности...${NC}"
sleep 10

# Проверка API
echo "Проверка Backend API..."
if curl -f -s "http://$SERVER_IP:5001/api/health" > /dev/null; then
    echo -e "${GREEN}✅ Backend API доступен${NC}"
else
    echo -e "${RED}❌ Backend API недоступен${NC}"
fi

# Проверка Elasticsearch
echo "Проверка Elasticsearch..."
if curl -f -s "http://$SERVER_IP:9200/_cluster/health" > /dev/null; then
    echo -e "${GREEN}✅ Elasticsearch доступен${NC}"
else
    echo -e "${RED}❌ Elasticsearch недоступен${NC}"
fi

# Проверка Frontend
echo "Проверка Frontend..."
if curl -f -s "http://$SERVER_IP:3000" > /dev/null; then
    echo -e "${GREEN}✅ Frontend доступен${NC}"
else
    echo -e "${RED}❌ Frontend недоступен${NC}"
fi

# Удаление локального архива
rm "$ARCHIVE_NAME"

echo -e "${GREEN}=== Деплой успешно завершен! ===${NC}"
echo -e "${YELLOW}Приложение доступно по адресам:${NC}"
echo -e "  Frontend: ${BLUE}http://$SERVER_IP:3000${NC}"
echo -e "  Backend API: ${BLUE}http://$SERVER_IP:5001/api${NC}"
echo -e "${YELLOW}Для просмотра логов: ${BLUE}ssh $SERVER_USER@$SERVER_IP 'cd $APP_DIR && docker-compose logs -f'${NC}"

echo ""
echo -e "${GREEN}📊 База данных:${NC}"
if [ "$LOCAL_DB_AVAILABLE" = true ]; then
    echo -e "  ⚠️ Для синхронизации БД используйте: ${BLUE}./scripts/sync-db-to-dev.sh${NC}"
else
    echo -e "  ✅ Создана пустая база данных на сервере"
fi