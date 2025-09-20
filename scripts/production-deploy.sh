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
npm run build
BUILD_STATUS=$?

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
sleep 10  # Даем время Elasticsearch полностью запуститься

# Проверяем, что Elasticsearch доступен
echo "Проверка доступности Elasticsearch..."
ELASTICSEARCH_CHECK=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:9200/_cluster/health 2>/dev/null || echo "000")

if [ "$ELASTICSEARCH_CHECK" = "200" ]; then
    echo "✅ Elasticsearch доступен, запускаем синхронизацию..."
    
    # Запускаем инкрементальную синхронизацию через Docker (используем продакшн версию)
    docker-compose exec -T backend npm run sync:incremental:prod
    
    if [ $? -eq 0 ]; then
        echo "✅ Синхронизация данных завершена успешно"
        
        # Дополнительно запускаем индексацию заявок через локальный скрипт на сервере
        echo "📋 Запуск индексации заявок на сервере..."
        ./scripts/index-submissions-server.sh
        
        if [ $? -eq 0 ]; then
            echo "✅ Индексация заявок завершена успешно"
        else
            echo "⚠️  Ошибка при индексации заявок, но приложение продолжает работать"
        fi
    else
        echo "⚠️  Ошибка при синхронизации данных, но приложение продолжает работать"
    fi
else
    echo "⚠️  Elasticsearch недоступен (код: $ELASTICSEARCH_CHECK), пропускаем синхронизацию"
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
echo -e "${YELLOW}⚠️  ВАЖНО: После деплоя необходимо запустить индексацию submissions в Elasticsearch!${NC}"
echo -e "${BLUE}Для запуска индексации используйте один из способов:${NC}"
echo ""
echo -e "${GREEN}Способ 1 (рекомендуемый - запуск с локальной машины):${NC}"
echo -e "  ${BLUE}./scripts/index-submissions-production.sh${NC}"
echo ""
echo -e "${GREEN}Способ 2 (на сервере напрямую):${NC}"
echo -e "  ${BLUE}ssh $SERVER_USER@$SERVER_IP 'cd $APP_DIR && ./scripts/index-submissions-server.sh'${NC}"
echo ""
echo -e "${GREEN}Способ 3 (через Docker контейнер):${NC}"
echo -e "  ${BLUE}ssh $SERVER_USER@$SERVER_IP 'cd $APP_DIR && docker-compose exec -T backend node dist/scripts/index-submissions-to-elasticsearch.js'${NC}"