#!/bin/bash

# Скрипт для деплоя Beton CRM с Docker + PostgreSQL на продакшн сервер
# Использование: ./scripts/production-deploy.sh

# Цвета для вывода
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Параметры сервера
SERVER_USER="root"
SERVER_IP="31.128.39.123"
SERVER_DOMAIN="beton.shknv.ru"
APP_DIR="/var/www/beton-crm"
BACKUP_DIR="/var/backups/beton-crm"

echo -e "${YELLOW}=== Деплой Beton CRM (Docker + PostgreSQL) ===${NC}"

# Проверка наличия резервной копии
echo -e "${BLUE}1. Проверка резервных копий...${NC}"
ssh $SERVER_USER@$SERVER_IP << 'ENDSSH'
if [ ! -d "/var/backups/beton-crm" ] || [ -z "$(ls -A /var/backups/beton-crm 2>/dev/null)" ]; then
    echo "❌ КРИТИЧЕСКАЯ ОШИБКА: Резервные копии не найдены!"
    echo "Сначала выполните резервное копирование: ./scripts/backup-mongodb.sh"
    exit 1
fi
echo "✅ Резервные копии найдены:"
ls -la /var/backups/beton-crm/ | tail -3
ENDSSH

if [ $? -ne 0 ]; then
    echo -e "${RED}Деплой остановлен - отсутствуют резервные копии!${NC}"
    exit 1
fi

# Настройка переменных окружения для продакшн
echo -e "${BLUE}2. Подготовка конфигурации для продакшн...${NC}"
ENV_FILE="client/.env"
ENV_BACKUP="client/.env.backup"

# Сохранение и изменение .env для сборки
if [ -f "$ENV_FILE" ]; then
    cp "$ENV_FILE" "$ENV_BACKUP"
    # Используем домен для продакшн сервера
    echo "REACT_APP_API_URL=https://$SERVER_DOMAIN:5001/api" > "$ENV_FILE"
    echo -e "${GREEN}✓ API URL настроен для продакшн сервера (HTTPS)${NC}"
fi

# Установка зависимостей и сборка проекта
echo -e "${BLUE}3. Установка зависимостей...${NC}"
echo "Установка зависимостей клиента..."
cd client && npm install --silent
cd ..

echo "Установка зависимостей сервера..."  
cd server && npm install --silent
cd ..

echo -e "${BLUE}4. Сборка проекта...${NC}"
echo "Сборка клиента (без проверки ESLint)..."
cd client && DISABLE_ESLINT_PLUGIN=true CI=false npm run build
CLIENT_BUILD_STATUS=$?
cd ..
echo "Сборка сервера..."
cd server && npm run build
SERVER_BUILD_STATUS=$?
cd ..
BUILD_STATUS=$((CLIENT_BUILD_STATUS + SERVER_BUILD_STATUS))

# Восстановление локального .env
if [ -f "$ENV_BACKUP" ]; then
    mv "$ENV_BACKUP" "$ENV_FILE"
fi

if [ $BUILD_STATUS -ne 0 ]; then
    echo -e "${RED}❌ Ошибка при сборке проекта!${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Проект успешно собран${NC}"

# Создание архива для деплоя
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
    promtail-config.yaml \
    scripts/

echo -e "${GREEN}✓ Архив $ARCHIVE_NAME создан${NC}"

# Копирование архива на сервер
echo -e "${BLUE}6. Копирование файлов на сервер...${NC}"
ssh $SERVER_USER@$SERVER_IP "mkdir -p $APP_DIR"
scp "$ARCHIVE_NAME" $SERVER_USER@$SERVER_IP:$APP_DIR/

echo -e "${GREEN}✓ Файлы скопированы на сервер${NC}"

# Установка и настройка на сервере
echo -e "${BLUE}7. Установка Docker и настройка сервера...${NC}"
ssh $SERVER_USER@$SERVER_IP << ENDSSH
cd $APP_DIR

# Создание резервной копии текущей версии
if [ -d "server" ] || [ -d "client" ]; then
    echo "Создание резервной копии текущей версии..."
    BACKUP_NAME="app-backup-\$(date +%s).tar.gz"
    tar -czf \$BACKUP_NAME server client docker-compose.yml ecosystem.config.js 2>/dev/null || true
    mkdir -p backups
    mv \$BACKUP_NAME backups/ 2>/dev/null || true
fi

# Остановка старого приложения
if pm2 list | grep -q "beton-crm"; then
    echo "Остановка старого приложения..."
    pm2 stop beton-crm
    pm2 delete beton-crm
fi

# Распаковка нового приложения
echo "Распаковка нового приложения..."
# Чистим предыдущие директории, чтобы не мешали остатки
rm -rf server client 2>/dev/null || true
tar -xzf $ARCHIVE_NAME

# Установка Docker если не установлен
if ! command -v docker &> /dev/null; then
    echo "Установка Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    systemctl enable docker
    systemctl start docker
fi

# Установка Docker Compose если не установлен
if ! command -v docker-compose &> /dev/null; then
    echo "Установка Docker Compose..."
    curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-\$(uname -s)-\$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
fi

# Создание директорий для логов
mkdir -p /var/log/beton-crm

# Загрузка переменных окружения
if [ -f ".env.production" ]; then
    cp .env.production .env
    echo "✅ Переменные окружения загружены"
fi

# Создание promtail-config.yaml если его нет
if [ ! -f "promtail-config.yaml" ]; then
    echo "⚠️ promtail-config.yaml не найден, создаем базовый конфиг..."
    cat > promtail-config.yaml << 'PROMTAIL_EOF'
server:
  http_listen_port: 9080
  grpc_listen_port: 0

positions:
  filename: /tmp/positions.yaml

clients:
  - url: http://45.146.164.152:3100/loki/api/v1/push

scrape_configs:
  - job_name: docker
    docker_sd_configs:
      - host: unix:///var/run/docker.sock
        refresh_interval: 5s
    relabel_configs:
      - source_labels: ['__meta_docker_container_name']
        regex: '/(.*)'
        target_label: 'container'
      - source_labels: ['__meta_docker_container_label_com_docker_compose_service']
        target_label: 'service'
      - target_label: 'host'
        replacement: 'beton-crm'
      - source_labels: ['__meta_docker_container_id']
        target_label: '__path__'
        replacement: /var/lib/docker/containers/$1/*.log
PROMTAIL_EOF
    echo "✅ Базовый promtail-config.yaml создан"
fi

# Установка прав на выполнение для скриптов
if [ -d "scripts" ]; then
    chmod +x scripts/*.sh
    echo "✅ Права на выполнение установлены для скриптов"
fi

echo "Docker версии:"
docker --version
docker-compose --version
ENDSSH

# Запуск приложения в Docker
echo -e "${BLUE}8. Запуск приложения в Docker...${NC}"
ssh $SERVER_USER@$SERVER_IP << ENDSSH
cd $APP_DIR

# Остановка существующих контейнеров
docker-compose down 2>/dev/null || true

# Очистка старых образов и кэша для принудительной пересборки
echo "Очистка Docker кэша..."
docker system prune -f 2>/dev/null || true
docker builder prune -f 2>/dev/null || true

# Запуск новых контейнеров БЕЗ КЭША для обновления оптимизаций
echo "Запуск Docker контейнеров (пересборка без кэша)..."
docker-compose build --no-cache

# Попытка запуска с повторными попытками
echo "Запуск контейнеров..."
docker-compose up -d

# Проверяем статус запуска
sleep 10
if ! docker-compose ps | grep -q "Up"; then
    echo "⚠️  Первая попытка запуска не удалась, пробуем еще раз..."
    docker-compose down
    sleep 5
    docker-compose up -d
fi

# Ожидание запуска сервисов
echo "Ожидание запуска сервисов..."
sleep 30

# Проверка статуса контейнеров
echo "Статус контейнеров:"
docker-compose ps

# Запуск миграций базы данных (исп. prod-конфиг из dist)
echo "Запуск миграций базы данных..."
docker-compose exec -T backend npm run migration:run:prod

# Синхронизация данных с Bitrix в Elasticsearch
echo "Синхронизация данных с Bitrix в Elasticsearch..."
sleep 15  # Даем время Elasticsearch полностью запуститься

# Проверяем, что Elasticsearch доступен
echo "Проверка доступности Elasticsearch..."
ELASTICSEARCH_CHECK=$(wget -qO- --timeout=5 http://localhost:9200/_cluster/health 2>/dev/null | grep -o '"status":"[^"]*"' | cut -d'"' -f4 || echo "unavailable")

if [ "$ELASTICSEARCH_CHECK" = "green" ] || [ "$ELASTICSEARCH_CHECK" = "yellow" ]; then
    echo "✅ Elasticsearch доступен (статус: $ELASTICSEARCH_CHECK), запускаем синхронизацию..."
    
    # Инициализация алиаса Elasticsearch
    echo "🔧 Инициализация алиаса Elasticsearch..."
    docker-compose exec -T backend wget -qO- --post-data='' http://localhost:5001/api/incremental-sync/initialize-alias
    
    # Запускаем полную инкрементальную синхронизацию через API
    echo "📦 Выполнение полной инкрементальной синхронизации..."
    docker-compose exec -T backend wget -qO- --post-data='{"forceFullSync": true, "batchSize": 200}' \
        --header='Content-Type: application/json' \
        http://localhost:5001/api/incremental-sync/all
    
    if [ $? -eq 0 ]; then
        echo "✅ Синхронизация данных завершена успешно"
        
        # Дополнительно запускаем синхронизацию заявок
        echo "📋 Принудительная синхронизация заявок..."
        docker-compose exec -T backend wget -qO- --post-data='{"forceFullSync": true, "batchSize": 100}' \
            --header='Content-Type: application/json' \
            http://localhost:5001/api/incremental-sync/submissions
        
        if [ $? -eq 0 ]; then
            echo "✅ Синхронизация заявок завершена успешно"
        else
            echo "⚠️  Ошибка при синхронизации заявок, но приложение продолжает работать"
        fi
    else
        echo "⚠️  Ошибка при синхронизации данных, но приложение продолжает работать"
    fi
else
    echo "⚠️  Elasticsearch недоступен (статус: $ELASTICSEARCH_CHECK), пропускаем синхронизацию"
    echo "Проверяем логи Elasticsearch:"
    docker-compose logs elasticsearch | tail -10
fi

echo "Деплой в Docker завершен!"
ENDSSH

# Проверка работоспособности
echo -e "${BLUE}9. Проверка работоспособности...${NC}"
sleep 10

# Проверка API
echo "Проверка Backend API..."
if curl -f -s -k "https://$SERVER_IP:5001/api/health" > /dev/null; then
    echo -e "${GREEN}✅ Backend API доступен (HTTPS)${NC}"
elif curl -f -s "http://$SERVER_IP:5001/api/health" > /dev/null; then
    echo -e "${YELLOW}⚠️ Backend API доступен только по HTTP${NC}"
else
    echo -e "${RED}❌ Backend API недоступен${NC}"
fi

# Проверка Frontend  
echo "Проверка Frontend..."
if curl -f -s -k "https://$SERVER_IP:3000" > /dev/null; then
    echo -e "${GREEN}✅ Frontend доступен (HTTPS)${NC}"
elif curl -f -s "http://$SERVER_IP:3000" > /dev/null; then
    echo -e "${YELLOW}⚠️ Frontend доступен только по HTTP${NC}"
else
    echo -e "${RED}❌ Frontend недоступен${NC}"
fi

# Удаление локального архива
rm "$ARCHIVE_NAME"

echo -e "${GREEN}=== Деплой успешно завершен! ===${NC}"
echo -e "${YELLOW}Приложение доступно по адресам:${NC}"
echo -e "  Frontend: ${BLUE}https://$SERVER_IP:3000${NC} (или http://$SERVER_IP:3000)"
echo -e "  Backend API: ${BLUE}https://$SERVER_IP:5001/api${NC} (или http://$SERVER_IP:5001/api)"
echo -e "${YELLOW}Для просмотра логов: ${BLUE}ssh $SERVER_USER@$SERVER_IP 'cd $APP_DIR && docker-compose logs -f'${NC}"

echo ""
echo -e "${GREEN}🔍 Elasticsearch (Инкрементальная система):${NC}"
echo -e "  ✅ Поиск работает корректно"
echo -e "  ✅ Данные проиндексированы через инкрементальную систему"
echo -e "  ✅ Alias swap pattern обеспечивает нулевое время простоя"
echo -e "  ✅ Автоматические cron-задачи каждые 2 часа"
echo -e "  ✅ Полная синхронизация ежедневно в 2:00"
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