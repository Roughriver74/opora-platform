#!/bin/bash

# Скрипт для деплоя приложения beton-crm на продакшн сервер
# Включает установку MongoDB, Node.js, PM2 и всех зависимостей

# Цвета для вывода
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Параметры сервера
SERVER_USER="root"
SERVER_IP="31.128.39.123"
APP_DIR="/var/www/beton-crm"
DB_NAME="beton-crm-production"

echo -e "${BLUE}=== ДЕПЛОЙ BETON-CRM НА ПРОДАКШН СЕРВЕР ===${NC}"
echo -e "${YELLOW}Этот скрипт выполнит:${NC}"
echo -e "1. Проверку и установку всех зависимостей на сервере"
echo -e "2. Установку и настройку MongoDB"
echo -e "3. Сборку и деплой приложения"
echo -e "4. Настройку автозапуска"
echo ""

# 1. Настройка API URL для фронтенда
echo -e "${YELLOW}1. Настройка API URL для фронтенда...${NC}"
ENV_FILE="client/.env"
ENV_BACKUP="client/.env.backup"

if [ -f "$ENV_FILE" ]; then
    cp "$ENV_FILE" "$ENV_BACKUP"
    echo -e "${GREEN}✓ Создана резервная копия .env файла${NC}"
    echo "REACT_APP_API_URL=" > "$ENV_FILE"
    echo -e "${GREEN}✓ Установлен API URL для продакшн-сборки${NC}"
fi

# 2. Сборка проекта
echo -e "${YELLOW}2. Сборка проекта...${NC}"
npm run build
BUILD_STATUS=$?

# Восстанавливаем оригинальный .env файл после сборки
if [ -f "$ENV_BACKUP" ]; then
    mv "$ENV_BACKUP" "$ENV_FILE"
    echo -e "${GREEN}✓ Восстановлен оригинальный .env файл${NC}"
fi

if [ $BUILD_STATUS -ne 0 ]; then
    echo -e "${RED}Ошибка при сборке проекта!${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Проект успешно собран${NC}"

# 3. Создание архива для деплоя
echo -e "${YELLOW}3. Создание архива для деплоя...${NC}"
ARCHIVE_NAME="production-deploy-$(date +%s).tar.gz"

# Проверяем наличие необходимых файлов и папок
if [ ! -d "server/dist" ]; then
    echo -e "${RED}Ошибка: server/dist не найден. Запустите сборку сервера!${NC}"
    exit 1
fi

if [ ! -d "client/build" ]; then
    echo -e "${RED}Ошибка: client/build не найден. Запустите сборку клиента!${NC}"
    exit 1
fi

# Создаем архив с проверкой каждого файла
tar -czf "$ARCHIVE_NAME" \
    --exclude="node_modules" \
    --exclude=".git" \
    --exclude="client/node_modules" \
    --exclude="server/node_modules" \
    --exclude="*.log" \
    --exclude=".env" \
    server/dist/ \
    server/package.json \
    server/package-lock.json \
    client/build/ \
    package.json \
    ecosystem.config.js \
    scripts/migrate-production-db.js \
    scripts/setup-production-data.js \
    .env.production

# Проверяем размер архива
ARCHIVE_SIZE=$(ls -la "$ARCHIVE_NAME" | awk '{print $5}')
if [ "$ARCHIVE_SIZE" -lt 1000 ]; then
    echo -e "${RED}Ошибка: Архив слишком мал ($ARCHIVE_SIZE байт). Возможно, не все файлы были добавлены.${NC}"
    echo "Содержимое архива:"
    tar -tzf "$ARCHIVE_NAME" | head -10
    exit 1
fi

echo -e "${GREEN}✓ Архив $ARCHIVE_NAME успешно создан (размер: $ARCHIVE_SIZE байт)${NC}"

# 4. Проверка соединения с сервером
echo -e "${YELLOW}4. Проверка соединения с сервером...${NC}"
ssh -o StrictHostKeyChecking=no $SERVER_USER@$SERVER_IP "echo 'Соединение установлено'"
if [ $? -ne 0 ]; then
    echo -e "${RED}Ошибка соединения с сервером!${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Соединение с сервером успешно установлено${NC}"

# 5. Установка системных зависимостей на сервере
echo -e "${YELLOW}5. Установка системных зависимостей на сервере...${NC}"
ssh $SERVER_USER@$SERVER_IP << 'ENDSSH'
echo -e "${BLUE}=== УСТАНОВКА СИСТЕМНЫХ ЗАВИСИМОСТЕЙ ===${NC}"

# Обновление пакетов
echo "Обновление пакетов системы..."
apt update -y && apt upgrade -y

# Установка базовых инструментов
echo "Установка базовых инструментов..."
apt install -y curl wget gnupg2 software-properties-common apt-transport-https ca-certificates lsb-release

# Проверка и установка Node.js 18.x
if ! command -v node &> /dev/null || [[ $(node -v | cut -d'v' -f2 | cut -d'.' -f1) -lt 18 ]]; then
    echo "Установка Node.js 18.x..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt install -y nodejs
    echo -e "${GREEN}✓ Node.js установлен: $(node -v)${NC}"
else
    echo -e "${GREEN}✓ Node.js уже установлен: $(node -v)${NC}"
fi

# Проверка и установка MongoDB
if ! command -v mongod &> /dev/null; then
    echo "Установка MongoDB..."
    
    # Добавляем ключ MongoDB
    wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | apt-key add -
    
    # Добавляем репозиторий MongoDB
    echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu $(lsb_release -cs)/mongodb-org/7.0 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-7.0.list
    
    # Обновляем и устанавливаем MongoDB
    apt update -y
    apt install -y mongodb-org
    
    # Настраиваем автозапуск MongoDB
    systemctl enable mongod
    systemctl start mongod
    
    echo -e "${GREEN}✓ MongoDB установлен и запущен${NC}"
else
    echo -e "${GREEN}✓ MongoDB уже установлен${NC}"
    # Проверяем, что MongoDB запущен
    if ! systemctl is-active --quiet mongod; then
        systemctl start mongod
        echo -e "${GREEN}✓ MongoDB запущен${NC}"
    fi
fi

# Проверка и установка PM2 глобально
if ! command -v pm2 &> /dev/null; then
    echo "Установка PM2 глобально..."
    npm install pm2 -g
    echo -e "${GREEN}✓ PM2 установлен${NC}"
else
    echo -e "${GREEN}✓ PM2 уже установлен${NC}"
fi

# Проверка и установка nginx
if ! command -v nginx &> /dev/null; then
    echo "Установка Nginx..."
    apt install -y nginx
    systemctl enable nginx
    systemctl start nginx
    echo -e "${GREEN}✓ Nginx установлен и запущен${NC}"
else
    echo -e "${GREEN}✓ Nginx уже установлен${NC}"
fi

echo -e "${GREEN}=== ВСЕ СИСТЕМНЫЕ ЗАВИСИМОСТИ УСТАНОВЛЕНЫ ===${NC}"
ENDSSH

# 6. Остановка текущего приложения и резервное копирование
echo -e "${YELLOW}6. Остановка текущего приложения и резервное копирование...${NC}"
ssh $SERVER_USER@$SERVER_IP << ENDSSH
# Остановка приложения PM2 (если запущено)
pm2 stop beton-crm 2>/dev/null || echo "Приложение не запущено"

# Создание резервной копии текущего приложения
if [ -d "$APP_DIR" ]; then
    BACKUP_DIR="/tmp/beton-crm-backup-\$(date +%s)"
    echo "Создание резервной копии в \$BACKUP_DIR..."
    cp -r "$APP_DIR" "\$BACKUP_DIR"
    echo -e "${GREEN}✓ Резервная копия создана: \$BACKUP_DIR${NC}"
fi

# Создание резервной копии базы данных (если существует старая база)
if mongosh --eval "db.adminCommand('listDatabases')" | grep -q "beton-crm"; then
    echo "Создание резервной копии базы данных..."
    BACKUP_DB="/tmp/beton-crm-db-backup-\$(date +%s)"
    mongodump --db beton-crm --out "\$BACKUP_DB" || echo "Не удалось создать резервную копию БД"
    echo -e "${GREEN}✓ Резервная копия БД: \$BACKUP_DB${NC}"
fi
ENDSSH

# 7. Копирование файлов на сервер
echo -e "${YELLOW}7. Копирование файлов на сервер...${NC}"

# Создание директории приложения если не существует
ssh $SERVER_USER@$SERVER_IP "mkdir -p $APP_DIR"

# Копирование архива
scp "$ARCHIVE_NAME" $SERVER_USER@$SERVER_IP:$APP_DIR/
echo -e "${GREEN}✓ Архив скопирован на сервер${NC}"

# Копирование .env файла
if [ -f ".env.production" ]; then
    echo -e "${YELLOW}8. Копирование .env файла...${NC}"
    scp ".env.production" $SERVER_USER@$SERVER_IP:$APP_DIR/.env
    echo -e "${GREEN}✓ .env файл скопирован${NC}"
fi

# 8. Установка приложения на сервере
echo -e "${YELLOW}9. Установка приложения на сервере...${NC}"
ssh $SERVER_USER@$SERVER_IP << ENDSSH
cd "$APP_DIR"

echo -e "${BLUE}=== УСТАНОВКА ПРИЛОЖЕНИЯ ===${NC}"

# Распаковка архива
echo "Распаковка архива..."
tar -xzf "$ARCHIVE_NAME"
echo -e "${GREEN}✓ Архив распакован${NC}"

# Установка зависимостей серверной части
echo "Установка зависимостей серверной части..."
cd server
npm ci --production --silent
echo -e "${GREEN}✓ Зависимости сервера установлены${NC}"
cd ..

# Проверка и копирование .env файла в server директорию
if [ ! -f "server/.env" ] && [ -f ".env" ]; then
    echo "Копирование .env файла в директорию server..."
    cp .env server/.env
    echo -e "${GREEN}✓ .env файл скопирован в server/${NC}"
fi

# Проверка статуса MongoDB
echo "Проверка статуса MongoDB..."
if systemctl is-active --quiet mongod; then
    echo -e "${GREEN}✓ MongoDB работает${NC}"
else
    echo -e "${RED}❌ MongoDB не запущен, запускаем...${NC}"
    systemctl start mongod
    sleep 3
fi

# Миграция данных из старой базы (если существует)
if mongosh --eval "db.adminCommand('listDatabases')" | grep -q "beton-crm\""; then
    echo -e "${YELLOW}Найдена старая база данных beton-crm, выполняем миграцию...${NC}"
    
    # Export NODE_ENV для скрипта миграции
    export NODE_ENV=production
    
    # Запуск скрипта миграции
    echo "y" | node scripts/migrate-production-db.js || echo "⚠️  Не удалось выполнить автоматическую миграцию"
fi

# Настройка полей формы для продакшн среды
echo -e "${YELLOW}Настройка полей формы для продакшн среды...${NC}"
export NODE_ENV=production
export MONGODB_URI="mongodb://localhost:27017/beton-crm-production"
node scripts/setup-production-data.js || echo "⚠️  Не удалось выполнить настройку полей формы"

# Создание администратора по умолчанию
echo "Создание администратора по умолчанию..."
cd server
NODE_ENV=production npm run create-default-admin:prod 2>/dev/null || {
    echo "Попытка альтернативного метода создания администратора..."
    NODE_ENV=production node dist/scripts/createDefaultAdmin.js 2>/dev/null || echo "⚠️  Предупреждение: Не удалось создать администратора автоматически"
}
cd ..

# Запуск приложения
echo "Запуск приложения..."
pm2 start ecosystem.config.js --env production
pm2 save

# Настройка автозапуска PM2
echo "Настройка автозапуска PM2..."
pm2 startup | grep -v PM2 | bash || echo "Автозапуск уже настроен"

# Очистка временных файлов
echo "Очистка временных файлов..."
rm -f "$ARCHIVE_NAME"

echo -e "${GREEN}=== УСТАНОВКА ПРИЛОЖЕНИЯ ЗАВЕРШЕНА ===${NC}"
ENDSSH

# 9. Удаление локального архива
rm "$ARCHIVE_NAME"

# 10. Проверка работоспособности
echo -e "${YELLOW}10. Проверка работоспособности приложения...${NC}"
sleep 5

# Проверка статуса PM2
echo "Проверка статуса PM2:"
ssh $SERVER_USER@$SERVER_IP "pm2 status"

# Проверка MongoDB
echo "Проверка MongoDB:"
ssh $SERVER_USER@$SERVER_IP "systemctl status mongod --no-pager -l"

# Проверка API
echo "Проверка API:"
API_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://$SERVER_IP:5001/ || echo "000")
if [ "$API_RESPONSE" = "200" ]; then
    echo -e "${GREEN}✓ API работает корректно${NC}"
else
    echo -e "${YELLOW}⚠️  API вернул код: $API_RESPONSE${NC}"
    echo "Проверяем логи..."
    ssh $SERVER_USER@$SERVER_IP "pm2 logs beton-crm --lines 10"
fi

echo -e "${GREEN}=== ДЕПЛОЙ УСПЕШНО ЗАВЕРШЕН! ===${NC}"
echo ""
echo -e "${BLUE}=== ИНФОРМАЦИЯ О ДОСТУПЕ ===${NC}"
echo -e "${YELLOW}Приложение доступно по адресам:${NC}"
echo -e "  - https://beton.shknv.ru"
echo -e "  - http://$SERVER_IP"
echo ""
echo -e "${GREEN}=== УЧЕТНЫЕ ДАННЫЕ ДЛЯ ВХОДА ===${NC}"
echo -e "${YELLOW}Email:${NC} crm@betonexpress.pro"
echo -e "${YELLOW}Пароль:${NC} Sacred.net13"
echo ""
echo -e "${RED}⚠️  ВАЖНО: После первого входа обязательно смените пароль!${NC}"
echo ""
echo -e "${BLUE}=== БАЗА ДАННЫХ ===${NC}"
echo -e "${YELLOW}Новая продакшн база:${NC} $DB_NAME"
echo -e "${YELLOW}Расположение:${NC} mongodb://localhost:27017/$DB_NAME"
echo ""
echo -e "${BLUE}=== ДЛЯ ДИАГНОСТИКИ ИСПОЛЬЗУЙТЕ ===${NC}"
echo -e "Логи приложения: ${GREEN}ssh $SERVER_USER@$SERVER_IP 'pm2 logs beton-crm'${NC}"
echo -e "Статус приложения: ${GREEN}ssh $SERVER_USER@$SERVER_IP 'pm2 status'${NC}"
echo -e "Статус MongoDB: ${GREEN}ssh $SERVER_USER@$SERVER_IP 'systemctl status mongod'${NC}"
echo -e "Перезапуск: ${GREEN}ssh $SERVER_USER@$SERVER_IP 'pm2 restart beton-crm'${NC}" 