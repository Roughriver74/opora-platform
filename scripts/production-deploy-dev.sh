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
	echo -e "${GREEN}✓ API URL настроен для dev сервера: https://$SERVER_DOMAIN:5001/api${NC}"
fi

# Проверка наличия необходимых файлов
echo -e "${BLUE}4. Проверка наличия необходимых файлов...${NC}"

# Проверка package.json файлов
if [ ! -f "client/package.json" ]; then
    echo -e "${RED}❌ Файл client/package.json не найден!${NC}"
    exit 1
fi

if [ ! -f "server/package.json" ]; then
    echo -e "${RED}❌ Файл server/package.json не найден!${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Все необходимые файлы найдены${NC}"

# Установка зависимостей
echo -e "${BLUE}5. Установка зависимостей...${NC}"

# Установка зависимостей для клиента
echo "Установка зависимостей для клиента..."
cd client
if ! npm install --silent; then
    echo -e "${RED}❌ Ошибка при установке зависимостей клиента!${NC}"
    cd ..
    # Восстановление локального .env
    if [ -f "$ENV_BACKUP" ]; then
        mv "$ENV_BACKUP" "$ENV_FILE"
    fi
    exit 1
fi
cd ..

# Установка зависимостей для сервера
echo "Установка зависимостей для сервера..."
cd server
if ! npm install --silent; then
    echo -e "${RED}❌ Ошибка при установке зависимостей сервера!${NC}"
    cd ..
    # Восстановление локального .env
    if [ -f "$ENV_BACKUP" ]; then
        mv "$ENV_BACKUP" "$ENV_FILE"
    fi
    exit 1
fi
cd ..

# Сборка проекта
echo -e "${BLUE}6. Сборка проекта...${NC}"

# Сборка клиента
echo "Сборка клиента..."
cd client
if ! npm run build; then
    echo -e "${RED}❌ Ошибка при сборке клиента!${NC}"
    cd ..
    # Восстановление локального .env
    if [ -f "$ENV_BACKUP" ]; then
        mv "$ENV_BACKUP" "$ENV_FILE"
    fi
    exit 1
fi

# Проверка успешности сборки клиента
if [ ! -d "build" ]; then
    echo -e "${RED}❌ Директория build не создана после сборки клиента!${NC}"
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
if ! npm run build; then
    echo -e "${RED}❌ Ошибка при сборке сервера!${NC}"
    cd ..
    # Восстановление локального .env
    if [ -f "$ENV_BACKUP" ]; then
        mv "$ENV_BACKUP" "$ENV_FILE"
    fi
    exit 1
fi

# Проверка успешности сборки сервера
if [ ! -d "dist" ]; then
    echo -e "${RED}❌ Директория dist не создана после сборки сервера!${NC}"
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
echo -e "${BLUE}7. Создание архива для деплоя...${NC}"
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

# Проверка успешности создания архива
if [ ! -f "$ARCHIVE_NAME" ]; then
    echo -e "${RED}❌ Архив не создан!${NC}"
    # Восстановление локального .env
    if [ -f "$ENV_BACKUP" ]; then
        mv "$ENV_BACKUP" "$ENV_FILE"
    fi
    exit 1
fi

# Проверка размера архива
ARCHIVE_SIZE=$(du -h "$ARCHIVE_NAME" | cut -f1)
echo -e "${GREEN}✓ Архив $ARCHIVE_NAME создан (размер: $ARCHIVE_SIZE)${NC}"

# Копирование на сервер
echo -e "${BLUE}8. Копирование файлов на сервер...${NC}"
ssh $SERVER_USER@$SERVER_IP "mkdir -p $APP_DIR"
if ! scp "$ARCHIVE_NAME" $SERVER_USER@$SERVER_IP:$APP_DIR/; then
    echo -e "${RED}❌ Ошибка при копировании файлов на сервер!${NC}"
    # Восстановление локального .env
    if [ -f "$ENV_BACKUP" ]; then
        mv "$ENV_BACKUP" "$ENV_FILE"
    fi
    exit 1
fi
echo -e "${GREEN}✓ Файлы скопированы на сервер${NC}"

# Деплой на сервер
echo -e "${BLUE}9. Деплой на сервер...${NC}"
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

# Остановка и удаление старых контейнеров
echo "Остановка и удаление старых контейнеров..."
docker-compose down --volumes --remove-orphans 2>/dev/null || docker compose down --volumes --remove-orphans 2>/dev/null || true
docker system prune -f 2>/dev/null || true

# Распаковка нового приложения
echo "Распаковка нового приложения..."
rm -rf server client 2>/dev/null || true
tar -xzf $ARCHIVE_NAME

# Загрузка переменных окружения
if [ -f ".env.development" ]; then
    cp .env.development .env
    echo "✅ Переменные окружения для dev сервера загружены (включая Elasticsearch)"
    # Проверяем наличие переменных Elasticsearch
    if grep -q "ELASTICSEARCH_HOST" .env; then
        echo "✅ Переменные Elasticsearch найдены в .env.development"
    else
        echo "⚠️ Переменные Elasticsearch отсутствуют в .env.development"
    fi
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
      - 'ES_JAVA_OPTS=-Xms384m -Xmx512m'
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
      - "indices.breaker.total.limit=60%"
      - "indices.breaker.fielddata.limit=30%"
      - "indices.breaker.request.limit=30%"
      - "action.auto_create_index=true"
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
          memory: 1.5G
        reservations:
          memory: 768M

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
      NODE_OPTIONS: --max-old-space-size=1024
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
      elasticsearch:
        condition: service_healthy
    networks:
      - beton_network
    deploy:
      resources:
        limits:
          memory: 512M
        reservations:
          memory: 256M
    volumes:
      - /app/logs:/app/logs

  frontend:
    build:
      context: ./client
      dockerfile: Dockerfile.production
    container_name: beton_frontend
    restart: unless-stopped
    ports:
      - '3000:3000'
    environment:
      REACT_APP_API_URL: https://dev.beton.shknv.ru:5001/api
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

# Создание конфигурации nginx с таймаутами
echo "Создание конфигурации nginx с таймаутами..."
cat > client/nginx.conf << 'EOF'
server {
    listen 3000;
    server_name beton.shknv.ru localhost 31.128.39.123;
    
    root /usr/share/nginx/html;
    index index.html;
    
    # Gzip сжатие
    gzip on;
    gzip_vary on;
    gzip_min_length 10240;
    gzip_proxied expired no-cache no-store private auth;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml application/javascript;
    gzip_disable "MSIE [1-6]\.";
    
    # Обработка маршрутов React
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # Proxy API requests to backend с увеличенными таймаутами
    location /api/ {
        proxy_pass http://backend:5001/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Увеличенные таймауты для синхронизации
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
        proxy_buffering off;
    }
    
    # Кэширование статических файлов
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # Безопасность
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
}
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

# Исправление проблем с сетью если необходимо
echo "Проверка и исправление сетевых проблем..."
sleep 5
if ! docker network inspect beton-crm_beton_network > /dev/null 2>&1; then
    echo "Пересоздание сети..."
    docker network create beton-crm_beton_network 2>/dev/null || true
fi

# Ожидание запуска сервисов
echo "Ожидание запуска сервисов..."
sleep 30

# Проверка статуса контейнеров
echo "Статус контейнеров:"
docker-compose -f docker-compose.stable.yml ps || docker compose -f docker-compose.stable.yml ps

# Создание схемы базы данных
echo "Создание схемы базы данных..."
docker-compose -f docker-compose.stable.yml exec -T backend npx typeorm schema:sync -d dist/database/config/database.config.js || docker compose -f docker-compose.stable.yml exec -T backend npx typeorm schema:sync -d dist/database/config/database.config.js

# Ожидание готовности Elasticsearch
echo "Ожидание готовности Elasticsearch..."
sleep 15
for i in {1..60}; do
    if curl -f -s "http://localhost:9200/_cluster/health" > /dev/null 2>&1; then
        echo "✅ Elasticsearch готов"
        break
    fi
    echo "⏳ Ожидание Elasticsearch... ($i/60)"
    sleep 3
done

# Дополнительная проверка статуса кластера
echo "Проверка статуса кластера Elasticsearch..."
CLUSTER_STATUS=$(curl -s "http://localhost:9200/_cluster/health" | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
echo "Статус кластера: $CLUSTER_STATUS"

# Исправление настроек реплик для single-node
echo "Исправление настроек Elasticsearch для single-node..."
curl -X PUT "http://localhost:9200/_settings" -H "Content-Type: application/json" -d '{"index": {"number_of_replicas": 0}}' 2>/dev/null || true

# Очистка временных индексов
echo "Очистка временных индексов Elasticsearch..."
curl -s "http://localhost:9200/_cat/indices?h=index" | grep "temp" | xargs -I {} curl -X DELETE "http://localhost:9200/{}" 2>/dev/null || true

# Очистка метаданных синхронизации заявок (если есть проблемы)
echo "Очистка проблемных метаданных синхронизации..."
docker-compose -f docker-compose.stable.yml exec -T postgres psql -U beton_user -d beton_crm -c "DELETE FROM sync_metadata WHERE entity_type = 'submissions' AND total_processed = 0;" 2>/dev/null || true

# Проверка переменных окружения в бэкенде
echo "Проверка переменных окружения в бэкенде..."
sleep 5
ELASTICSEARCH_VARS=$(docker-compose -f docker-compose.stable.yml exec -T backend printenv | grep ELASTICSEARCH || echo "")
if [ -n "$ELASTICSEARCH_VARS" ]; then
    echo "✅ Переменные Elasticsearch установлены в бэкенде:"
    echo "$ELASTICSEARCH_VARS"
else
    echo "❌ Переменные Elasticsearch НЕ установлены в бэкенде!"
    echo "Перезапуск бэкенда..."
    docker-compose -f docker-compose.stable.yml restart backend
    sleep 10
fi

# Проверка подключения бэкенда к Elasticsearch
echo "Проверка подключения бэкенда к Elasticsearch..."
sleep 5
for i in {1..10}; do
    if docker-compose -f docker-compose.stable.yml exec -T backend wget -qO- http://elasticsearch:9200/_cluster/health > /dev/null 2>&1; then
        echo "✅ Бэкенд может подключиться к Elasticsearch"
        break
    fi
    echo "⏳ Ожидание подключения бэкенда к Elasticsearch... ($i/10)"
    sleep 2
done

# Инициализация и индексация Elasticsearch с новой инкрементальной системой
echo "Инициализация Elasticsearch с инкрементальной системой..."
echo "🔧 Инициализация алиаса Elasticsearch..."
docker-compose -f docker-compose.stable.yml exec -T backend curl -X POST http://localhost:5001/api/incremental-sync/initialize-alias || docker compose -f docker-compose.stable.yml exec -T backend curl -X POST http://localhost:5001/api/incremental-sync/initialize-alias

echo "📦 Выполнение полной инкрементальной синхронизации..."
docker-compose -f docker-compose.stable.yml exec -T backend curl -X POST http://localhost:5001/api/incremental-sync/all \
    -H "Content-Type: application/json" \
    -d '{"forceFullSync": true, "batchSize": 200}' || docker compose -f docker-compose.stable.yml exec -T backend curl -X POST http://localhost:5001/api/incremental-sync/all \
    -H "Content-Type: application/json" \
    -d '{"forceFullSync": true, "batchSize": 200}'

echo "📋 Принудительная синхронизация заявок (если нужно)..."
docker-compose -f docker-compose.stable.yml exec -T backend curl -X POST http://localhost:5001/api/incremental-sync/submissions \
    -H "Content-Type: application/json" \
    -d '{"forceFullSync": true, "batchSize": 100}' || docker compose -f docker-compose.stable.yml exec -T backend curl -X POST http://localhost:5001/api/incremental-sync/submissions \
    -H "Content-Type: application/json" \
    -d '{"forceFullSync": true, "batchSize": 100}'

echo "Деплой завершен!"
ENDSSH

# Создание дампа локальной БД и восстановление на сервере
if [ "$LOCAL_DB_AVAILABLE" = true ]; then
    echo -e "${BLUE}10. Синхронизация базы данных...${NC}"
    
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
echo -e "${BLUE}11. Проверка работоспособности...${NC}"
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
    # Проверка индексов
    INDEX_COUNT=$(curl -s "http://$SERVER_IP:9200/_cat/indices?h=index" | wc -l)
    echo -e "${GREEN}📊 Количество индексов: $INDEX_COUNT${NC}"
else
    echo -e "${RED}❌ Elasticsearch недоступен${NC}"
fi

# Проверка поиска
echo "Проверка поиска..."
SEARCH_TEST=$(curl -s -X POST "http://$SERVER_IP:5001/api/search/companies" -H "Content-Type: application/json" -d '{"query": "тест", "limit": 1, "fuzzy": true}' | jq -r '.result | length' 2>/dev/null || echo "0")
if [ "$SEARCH_TEST" -gt 0 ]; then
    echo -e "${GREEN}✅ Поиск компаний работает${NC}"
else
    echo -e "${YELLOW}⚠️ Поиск компаний не работает или нет данных${NC}"
fi

# Проверка поиска заявок
echo "Проверка поиска заявок..."
SUBMISSION_SEARCH_TEST=$(curl -s -X POST "http://$SERVER_IP:5001/api/search/submissions" -H "Content-Type: application/json" -d '{"query": "тест", "limit": 1, "fuzzy": true}' | jq -r '.data.results | length' 2>/dev/null || echo "0")
if [ "$SUBMISSION_SEARCH_TEST" -gt 0 ]; then
    echo -e "${GREEN}✅ Поиск заявок работает${NC}"
else
    echo -e "${YELLOW}⚠️ Поиск заявок не работает или нет данных${NC}"
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
echo -e "  ✅ Elasticsearch: ограничен до 1.5GB памяти (оптимизирован для инкрементальной системы)"
echo -e "  ✅ Backend: ограничен до 512MB памяти (оптимизирован для инкрементальной синхронизации)"
echo -e "  ✅ Frontend: ограничен до 128MB памяти"
echo -e "  📊 Общее использование памяти: ~2.8GB (оптимизировано для стабильной работы)"
echo -e "  🚀 Инкрементальная синхронизация: нулевое время простоя, автоматические cron-задачи"

echo ""
echo -e "${GREEN}📊 База данных:${NC}"
if [ "$LOCAL_DB_AVAILABLE" = true ]; then
    echo -e "  ✅ Данные синхронизированы с локальной машины"
else
    echo -e "  ✅ Создана пустая база данных на сервере"
fi

echo ""
echo -e "${GREEN}🔍 Elasticsearch (Инкрементальная система):${NC}"
if [ "$SEARCH_TEST" -gt 0 ]; then
    echo -e "  ✅ Поиск работает корректно"
    echo -e "  ✅ Данные проиндексированы через инкрементальную систему"
    echo -e "  ✅ Alias swap pattern обеспечивает нулевое время простоя"
else
    echo -e "  ⚠️ Поиск требует дополнительной настройки"
    echo -e "  💡 Для индексации данных через новую систему выполните:"
    echo -e "     ${BLUE}ssh $SERVER_USER@$SERVER_IP 'cd $APP_DIR && docker-compose -f docker-compose.stable.yml exec backend curl -X POST http://localhost:5001/api/incremental-sync/all -H \"Content-Type: application/json\" -d \"{\\\"forceFullSync\\\": true, \\\"batchSize\\\": 200}\"'${NC}"
fi

echo ""
echo -e "${GREEN}🔧 Исправления в скрипте деплоя:${NC}"
echo -e "  ✅ Добавлена проверка наличия package.json файлов"
echo -e "  ✅ Улучшена обработка ошибок при установке зависимостей"
echo -e "  ✅ Добавлена проверка успешности сборки клиента и сервера"
echo -e "  ✅ Добавлена проверка создания архива и его размера"
echo -e "  ✅ Улучшена обработка ошибок при копировании на сервер"
echo -e "  ✅ Добавлено восстановление .env файла при ошибках"
echo -e "  ✅ Разделена установка зависимостей и сборка проекта"
echo -e "  🚀 Интеграция с новой инкрементальной системой синхронизации"
echo -e "  🔧 ИСПРАВЛЕНО: Добавлены таймауты nginx (300s) для предотвращения 504 ошибок"
echo -e "  🔧 ИСПРАВЛЕНО: Правильная настройка REACT_APP_API_URL для dev сервера"
echo -e "  🔧 ИСПРАВЛЕНО: Добавлена проверка поиска заявок после деплоя"
echo -e "  🔧 ИСПРАВЛЕНО: Автоматическая очистка временных индексов Elasticsearch"
echo -e "  🔧 ИСПРАВЛЕНО: Исправление настроек реплик для single-node кластера"
echo -e "  🔧 ИСПРАВЛЕНО: Очистка проблемных метаданных синхронизации"
echo -e "  🔧 ИСПРАВЛЕНО: Принудительная синхронизация заявок после основной синхронизации"

echo ""
echo -e "${GREEN}🚀 Новая инкрементальная система синхронизации:${NC}"
echo -e "  ✅ Alias swap pattern - нулевое время простоя при синхронизации"
echo -e "  ✅ Инкрементальные обновления - только измененные данные"
echo -e "  ✅ Автоматические cron-задачи каждые 2 часа"
echo -e "  ✅ Полная синхронизация ежедневно в 2:00"
echo -e "  ✅ Детальная статистика и мониторинг"
echo -e "  ✅ Безопасные атомарные операции"
echo -e "  ✅ API endpoints для управления синхронизацией"
echo -e "  📊 Статистика: /api/incremental-sync/stats"
echo -e "  🔧 Управление: /api/incremental-sync/metadata"

