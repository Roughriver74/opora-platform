#!/bin/bash

# Скрипт для ручного деплоя приложения beton-crm на сервер с использованием SSH-ключей
# Использование: ./scripts/manual-deploy.sh

# Цвета для вывода
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Параметры сервера
SERVER_USER="root"
SERVER_IP="31.128.39.123"
APP_DIR="/var/www/beton-crm"

echo -e "${YELLOW}=== Начинаем деплой приложения beton-crm ===${NC}"

# Настройка API URL для фронтенда
echo -e "${YELLOW}1. Настройка API URL для фронтенда...${NC}"
ENV_FILE="client/.env"
ENV_BACKUP="client/.env.backup"

# Сохраняем резервную копию текущего .env файла
if [ -f "$ENV_FILE" ]; then
    cp "$ENV_FILE" "$ENV_BACKUP"
    echo -e "${GREEN}✓ Создана резервная копия .env файла${NC}"

    # Устанавливаем относительный API URL для продакшн-сборки
    echo "REACT_APP_API_URL=/api" > "$ENV_FILE"
    echo -e "${GREEN}✓ Установлен API URL для продакшн-сборки${NC}"
fi

# Сборка проекта
echo -e "${YELLOW}2. Сборка проекта...${NC}"
npm run build
BUILD_STATUS=$?

# Восстанавливаем оригинальный .env файл после сборки
if [ -f "$ENV_BACKUP" ]; then
    mv "$ENV_BACKUP" "$ENV_FILE"
    echo -e "${GREEN}✓ Восстановлен оригинальный .env файл${NC}"
fi

# Проверяем результат сборки
if [ $BUILD_STATUS -ne 0 ]; then
    echo -e "${RED}Ошибка при сборке проекта!${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Проект успешно собран${NC}"

# Создаем архив для деплоя
echo -e "${YELLOW}2. Создание архива для деплоя...${NC}"
ARCHIVE_NAME="deploy-$(date +%s).tar.gz"
tar -czf "$ARCHIVE_NAME" \
    --exclude="node_modules" \
    --exclude=".git" \
    --exclude="client/node_modules" \
    --exclude="server/node_modules" \
    server/dist \
    server/package.json \
    server/package-lock.json \
    client/build \
    package.json \
    ecosystem.config.js

echo -e "${GREEN}✓ Архив $ARCHIVE_NAME успешно создан${NC}"

# Проверка соединения с сервером
echo -e "${YELLOW}4. Проверка соединения с сервером...${NC}"
ssh -o StrictHostKeyChecking=no $SERVER_USER@$SERVER_IP "echo -e '${GREEN}✓ Соединение с сервером успешно установлено${NC}'"
if [ $? -ne 0 ]; then
    echo -e "${RED}Ошибка соединения с сервером!${NC}"
    exit 1
fi

# Создание директории на сервере, если она не существует
echo -e "${YELLOW}5. Создание директории на сервере...${NC}"
ssh $SERVER_USER@$SERVER_IP "mkdir -p $APP_DIR"
echo -e "${GREEN}✓ Директория на сервере проверена${NC}"

# Копирование архива на сервер
echo -e "${YELLOW}6. Копирование файлов на сервер...${NC}"
scp "$ARCHIVE_NAME" $SERVER_USER@$SERVER_IP:$APP_DIR/
echo -e "${GREEN}✓ Архив скопирован на сервер${NC}"

# Копирование .env файла если он существует
if [ -f ".env.production" ]; then
    echo -e "${YELLOW}7. Копирование .env файла...${NC}"
    scp ".env.production" $SERVER_USER@$SERVER_IP:$APP_DIR/.env
    echo -e "${GREEN}✓ .env файл скопирован${NC}"
fi

# Распаковка и установка зависимостей на сервере
echo -e "${YELLOW}8. Настройка приложения на сервере...${NC}"
ssh $SERVER_USER@$SERVER_IP << ENDSSH
cd $APP_DIR
# Сохранение резервной копии текущей версии, если она существует
if [ -d "server" ]; then
    echo "Создание резервной копии текущей версии..."
    BACKUP_NAME="backup-\$(date +%s).tar.gz"
    tar -czf \$BACKUP_NAME server client package.json ecosystem.config.js
    mkdir -p backups
    mv \$BACKUP_NAME backups/
fi

# Распаковка архива
tar -xzf $ARCHIVE_NAME

# Установка зависимостей
echo "Установка зависимостей серверной части..."
cd server && npm install --production
cd ..

# Установка PM2, если он не установлен
if ! command -v pm2 &> /dev/null; then
    echo "Установка PM2..."
    npm install pm2 -g
fi

# Перезапуск приложения
if pm2 list | grep -q "beton-crm"; then
    echo "Перезапуск приложения..."
    pm2 reload beton-crm
else
    echo "Первый запуск приложения..."
    pm2 start ecosystem.config.js --env production
fi

# Сохранение настроек PM2
pm2 save

# Настройка автозапуска PM2
pm2 startup | grep -v PM2 | bash || true

# Очистка старых архивов (оставляем только 3 последних)
echo "Очистка старых архивов..."
ls -t deploy-*.tar.gz | tail -n +4 | xargs -I {} rm {} 2>/dev/null || true

echo "Деплой успешно завершен!"
ENDSSH

# Удаление локального архива
rm "$ARCHIVE_NAME"

echo -e "${GREEN}=== Деплой успешно завершен! ===${NC}"
echo -e "${YELLOW}Приложение доступно по адресу http://$SERVER_IP${NC}"
