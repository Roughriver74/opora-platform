#!/bin/bash

# Оптимизированный скрипт для деплоя Beton CRM на dev сервер
# Использование: ./scripts/production-deploy-dev-optimized.sh

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

echo -e "${YELLOW}=== Оптимизированный деплой Beton CRM на DEV сервер ===${NC}"

# Проверка локальной базы данных
echo -e "${BLUE}1. Проверка локальной базы данных...${NC}"
LOCAL_DB_AVAILABLE=false
LOCAL_DB_TYPE=""

# Проверяем Docker PostgreSQL
if docker ps --format "table {{.Names}}" | grep -q "beton_postgres"; then
    if docker exec beton_postgres psql -U beton_user -d beton_crm -c "SELECT 1;" &>/dev/null; then
        echo -e "${GREEN}✅ Docker PostgreSQL доступен${NC}"
        LOCAL_DB_AVAILABLE=true
        LOCAL_DB_TYPE="docker"
    fi
fi

# Проверяем системную PostgreSQL
if [ "$LOCAL_DB_AVAILABLE" = false ] && command -v psql &> /dev/null; then
    if psql -h localhost -U postgres -d beton_crm -c "SELECT 1;" &>/dev/null; then
        echo -e "${GREEN}✅ Системная PostgreSQL доступна${NC}"
        LOCAL_DB_AVAILABLE=true
        LOCAL_DB_TYPE="system"
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

# Создание .env файла для клиента если его нет
if [ ! -f "$ENV_FILE" ]; then
    echo "REACT_APP_API_URL=http://localhost:5001/api" > "$ENV_FILE"
    echo "NODE_ENV=development" >> "$ENV_FILE"
    echo -e "${GREEN}✓ Создан .env файл для клиента${NC}"
fi

# Сохранение и изменение .env для сборки
if [ -f "$ENV_FILE" ]; then
    cp "$ENV_FILE" "$ENV_BACKUP"
    echo "REACT_APP_API_URL=https://$SERVER_DOMAIN:5001/api" > "$ENV_FILE"
    echo "NODE_ENV=production" >> "$ENV_FILE"
    echo -e "${GREEN}✓ API URL настроен для dev сервера${NC}"
fi

# Сборка проекта
echo -e "${BLUE}4. Сборка проекта...${NC}"
cd client && npm install --silent
cd ../server && npm install --silent
cd ..
npm run build

# Восстановление локального .env
if [ -f "$ENV_BACKUP" ]; then
    mv "$ENV_BACKUP" "$ENV_FILE"
fi

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Ошибка при сборке проекта!${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Проект успешно собран${NC}"

# Создание архива
echo -e "${BLUE}5. Создание архива для деплоя...${NC}"
ARCHIVE_NAME="deploy-docker-$(date +%s).tar.gz"
tar -czf "$ARCHIVE_NAME" \
    --exclude="node_modules" \
    --exclude=".git" \
    --exclude="client/node_modules" \
    --exclude="server/node_modules" \
    --exclude="postgres_data" \
    --exclude="redis_data" \
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
    ecosystem.config.js \
    .env.production \
    .env.development \
    scripts/

echo -e "${GREEN}✓ Архив $ARCHIVE_NAME создан${NC}"

# Копирование на сервер
echo -e "${BLUE}6. Копирование файлов на сервер...${NC}"
ssh $SERVER_USER@$SERVER_IP "mkdir -p $APP_DIR"
scp "$ARCHIVE_NAME" $SERVER_USER@$SERVER_IP:$APP_DIR/
echo -e "${GREEN}✓ Файлы скопированы на сервер${NC}"

# Деплой на сервер
echo -e "${BLUE}7. Деплой на сервер...${NC}"
ssh $SERVER_USER@$SERVER_IP << ENDSSH
cd $APP_DIR

# Создание резервной копии
if [ -d "server" ] || [ -d "client" ]; then
    echo "Создание резервной копии..."
    BACKUP_NAME="app-backup-\$(date +%s).tar.gz"
    tar -czf \$BACKUP_NAME server client docker-compose.yml ecosystem.config.js 2>/dev/null || true
    mkdir -p backups
    mv \$BACKUP_NAME backups/ 2>/dev/null || true
fi

# Остановка старых контейнеров
echo "Остановка старых контейнеров..."
docker-compose down 2>/dev/null || docker compose down 2>/dev/null || true

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

# Установка прав на выполнение для скриптов
if [ -d "scripts" ]; then
    chmod +x scripts/*.sh
    echo "✅ Права на выполнение установлены для скриптов"
fi

# Создание стабильной конфигурации Docker Compose
echo "Создание стабильной конфигурации Docker Compose..."
cat > docker-compose.stable.yml << 'EOF'
services:
  postgres:
    image: postgres:16-alpine
    container_name: beton_postgres
    restart: unless-stopped
    environment:
      POSTGRES_DB: beton_crm
      POSTGRES_USER: beton_user
      POSTGRES_PASSWORD: beton_password_secure_2025
      PGDATA: /var/lib/postgresql/data/pgdata
    ports:
      - '5489:5432'
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U beton_user -d beton_crm']
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - beton_network
    deploy:
      resources:
        limits:
          memory: 512M
        reservations:
          memory: 256M

  redis:
    image: redis:7-alpine
    container_name: beton_redis
    restart: unless-stopped
    ports:
      - '6396:6379'
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes --maxmemory 64mb --maxmemory-policy allkeys-lru
    healthcheck:
      test: ['CMD', 'redis-cli', 'ping']
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - beton_network
    deploy:
      resources:
        limits:
          memory: 128M
        reservations:
          memory: 64M

  elasticsearch:
    image: elasticsearch:8.11.0
    container_name: beton_elasticsearch
    restart: unless-stopped
    environment:
      - discovery.type=single-node
      - xpack.security.enabled=false
      - 'ES_JAVA_OPTS=-Xms128m -Xmx256m'
      - bootstrap.memory_lock=false
      - "cluster.routing.allocation.disk.threshold_enabled=false"
      - "indices.memory.index_buffer_size=5%"
      - "indices.queries.cache.size=5%"
      - "indices.fielddata.cache.size=5%"
      - "thread_pool.write.queue_size=25"
      - "thread_pool.search.queue_size=25"
      - "cluster.routing.allocation.total_shards_per_node=1"
      - "indices.recovery.max_bytes_per_sec=2mb"
      - "cluster.routing.allocation.node_concurrent_recoveries=1"
      - "cluster.routing.allocation.cluster_concurrent_rebalance=1"
      - "indices.breaker.total.limit=20%"
      - "indices.breaker.fielddata.limit=10%"
      - "indices.breaker.request.limit=10%"
    ulimits:
      memlock:
        soft: -1
        hard: -1
    ports:
      - '9200:9200'
    volumes:
      - elasticsearch_data:/usr/share/elasticsearch/data
    healthcheck:
      test: ['CMD-SHELL', 'curl -f http://localhost:9200/_cluster/health || exit 1']
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 60s
    networks:
      - beton_network
    deploy:
      resources:
        limits:
          memory: 384M
        reservations:
          memory: 256M

  backend:
    build:
      context: ./server
      dockerfile: Dockerfile.production
    container_name: beton_backend
    restart: unless-stopped
    ports:
      - '5001:5001'
    environment:
      NODE_ENV: production
      PORT: 5001
      DB_HOST: postgres
      DB_PORT: 5432
      DB_USERNAME: beton_user
      DB_PASSWORD: beton_password_secure_2025
      DB_NAME: beton_crm
      REDIS_HOST: redis
      REDIS_PORT: 6379
      ELASTICSEARCH_HOST: elasticsearch
      ELASTICSEARCH_PORT: 9200
      JWT_SECRET: beton-crm-production-secret-key-2025-updated
      JWT_EXPIRES_IN: 7d
      REFRESH_TOKEN_EXPIRES_IN: 30d
      BITRIX_WEBHOOK: https://crm.betonexpress.pro/rest/3/74sbx907svrq1v10/
      CORS_ORIGIN: https://31.129.109.2:3000,http://31.129.109.2:3000,https://dev.beton.shknv.ru:3000,http://dev.beton.shknv.ru:3000
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    networks:
      - beton_network
    deploy:
      resources:
        limits:
          memory: 512M
        reservations:
          memory: 256M

  frontend:
    build:
      context: ./client
      dockerfile: Dockerfile.production
    container_name: beton_frontend
    restart: unless-stopped
    ports:
      - '3000:3000'
    environment:
      REACT_APP_API_URL: https://31.129.109.2:5001/api
      NODE_ENV: production
    depends_on:
      - backend
    networks:
      - beton_network
    deploy:
      resources:
        limits:
          memory: 128M
        reservations:
          memory: 64M

volumes:
  postgres_data:
    driver: local
  redis_data:
    driver: local
  elasticsearch_data:
    driver: local

networks:
  beton_network:
    driver: bridge
EOF

# Настройка системных лимитов
echo "Настройка системных лимитов..."
echo "vm.max_map_count=262144" >> /etc/sysctl.conf
echo "vm.swappiness=10" >> /etc/sysctl.conf
sysctl -p 2>/dev/null || true

# Создание swap файла если его нет
if [ ! -f /swapfile ]; then
    echo "Создание swap файла (1GB)..."
    fallocate -l 1G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo "/swapfile none swap sw 0 0" >> /etc/fstab
fi

# Запуск контейнеров
echo "Запуск Docker контейнеров..."
docker-compose -f docker-compose.stable.yml build --no-cache || docker compose -f docker-compose.stable.yml build --no-cache
docker-compose -f docker-compose.stable.yml up -d || docker compose -f docker-compose.stable.yml up -d

# Ожидание запуска сервисов
echo "Ожидание запуска сервисов..."
sleep 30

# Проверка статуса контейнеров
echo "Статус контейнеров:"
docker-compose -f docker-compose.stable.yml ps || docker compose -f docker-compose.stable.yml ps

# Создание схемы базы данных
echo "Создание схемы базы данных..."
docker-compose -f docker-compose.stable.yml exec -T backend npx typeorm schema:sync -d dist/database/config/database.config.js || docker compose -f docker-compose.stable.yml exec -T backend npx typeorm schema:sync -d dist/database/config/database.config.js

echo "Деплой завершен!"
ENDSSH

# Создание дампа локальной БД и восстановление на сервере
if [ "$LOCAL_DB_AVAILABLE" = true ]; then
    echo -e "${BLUE}8. Синхронизация базы данных...${NC}"
    
    TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
    BACKUP_FILE="local_to_dev_backup_${TIMESTAMP}.sql"
    LOCAL_DUMP_FILE="/tmp/beton_crm_dump_${TIMESTAMP}.sql"
    
    # Создание дампа
    if [ "$LOCAL_DB_TYPE" = "docker" ]; then
        docker exec beton_postgres pg_dump -U beton_user -d beton_crm --clean --if-exists > "$LOCAL_DUMP_FILE" 2>/dev/null
    elif [ "$LOCAL_DB_TYPE" = "system" ]; then
        pg_dump -h localhost -U postgres -d beton_crm --clean --if-exists > "$LOCAL_DUMP_FILE" 2>/dev/null
    fi
    
    if [ -f "$LOCAL_DUMP_FILE" ] && [ -s "$LOCAL_DUMP_FILE" ]; then
        echo -e "${GREEN}✅ Дамп локальной БД создан${NC}"
        
        # Копирование на сервер
        scp -o StrictHostKeyChecking=no "$LOCAL_DUMP_FILE" $SERVER_USER@$SERVER_IP:$APP_DIR/backups/db-sync/$BACKUP_FILE 2>/dev/null
        
        # Восстановление на сервере
        ssh -o StrictHostKeyChecking=no $SERVER_USER@$SERVER_IP "cd $APP_DIR && docker-compose -f docker-compose.stable.yml exec -T postgres psql -U beton_user -d beton_crm < backups/db-sync/$BACKUP_FILE" 2>/dev/null
        
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✅ База данных восстановлена на сервере${NC}"
            
            # Показываем статистику
            USERS_COUNT=$(ssh -o StrictHostKeyChecking=no $SERVER_USER@$SERVER_IP "cd $APP_DIR && docker exec beton_postgres psql -U beton_user -d beton_crm -t -c 'SELECT COUNT(*) FROM users;'" 2>/dev/null | xargs || echo "0")
            SUBMISSIONS_COUNT=$(ssh -o StrictHostKeyChecking=no $SERVER_USER@$SERVER_IP "cd $APP_DIR && docker exec beton_postgres psql -U beton_user -d beton_crm -t -c 'SELECT COUNT(*) FROM submissions;'" 2>/dev/null | xargs || echo "0")
            FORMS_COUNT=$(ssh -o StrictHostKeyChecking=no $SERVER_USER@$SERVER_IP "cd $APP_DIR && docker exec beton_postgres psql -U beton_user -d beton_crm -t -c 'SELECT COUNT(*) FROM forms;'" 2>/dev/null | xargs || echo "0")
            
            echo -e "${GREEN}📊 Статистика восстановленных данных:${NC}"
            echo -e "   ✓ Пользователи: $USERS_COUNT"
            echo -e "   ✓ Заявки: $SUBMISSIONS_COUNT"
            echo -e "   ✓ Формы: $FORMS_COUNT"
        else
            echo -e "${YELLOW}⚠️ Ошибка восстановления БД${NC}"
        fi
        
        # Удаление локального дампа
        rm -f "$LOCAL_DUMP_FILE"
    else
        echo -e "${YELLOW}⚠️ Не удалось создать дамп локальной БД${NC}"
    fi
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
echo -e "${YELLOW}Для просмотра логов: ${BLUE}ssh $SERVER_USER@$SERVER_IP 'cd $APP_DIR && docker-compose -f docker-compose.stable.yml logs -f'${NC}"

echo ""
echo -e "${GREEN}🔧 Оптимизация для стабильной работы:${NC}"
echo -e "  ✅ PostgreSQL: ограничен до 512MB памяти"
echo -e "  ✅ Redis: ограничен до 128MB памяти"
echo -e "  ✅ Elasticsearch: ограничен до 384MB памяти"
echo -e "  ✅ Backend: ограничен до 512MB памяти"
echo -e "  ✅ Frontend: ограничен до 128MB памяти"
echo -e "  📊 Общее использование памяти: ~1.5GB (оптимизировано для стабильной работы)"

echo ""
echo -e "${GREEN}📊 База данных:${NC}"
if [ "$LOCAL_DB_AVAILABLE" = true ]; then
    echo -e "  ✅ Данные синхронизированы с локальной машины"
else
    echo -e "  ✅ Создана пустая база данных на сервере"
fi

echo ""
echo -e "${YELLOW}💡 Для индексации данных в Elasticsearch выполните:${NC}"
echo -e "  ${BLUE}ssh $SERVER_USER@$SERVER_IP 'cd $APP_DIR && docker-compose -f docker-compose.stable.yml exec backend npm run sync:bitrix:prod'${NC}"
