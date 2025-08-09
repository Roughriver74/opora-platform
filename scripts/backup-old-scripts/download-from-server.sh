#!/bin/bash

# Скрипт для скачивания рабочей версии с сервера
# Использование: ./scripts/download-from-server.sh

# Цвета для вывода
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Параметры сервера
SERVER_USER="root"
SERVER_IP="31.128.39.123"
APP_DIR="/var/www/beton-crm"

echo -e "${YELLOW}=== Скачивание рабочей версии с сервера ===${NC}"

# Проверка соединения с сервером
echo -e "${YELLOW}1. Проверка соединения с сервером...${NC}"
ssh -o StrictHostKeyChecking=no $SERVER_USER@$SERVER_IP "echo -e '${GREEN}✓ Соединение с сервером успешно установлено${NC}'"
if [ $? -ne 0 ]; then
    echo -e "${RED}Ошибка соединения с сервером!${NC}"
    exit 1
fi

# Создание резервной копии текущей локальной версии
echo -e "${YELLOW}2. Создание резервной копии текущей версии...${NC}"
BACKUP_NAME="local-backup-$(date +%s).tar.gz"
tar -czf "$BACKUP_NAME" \
    --exclude="node_modules" \
    --exclude=".git" \
    --exclude="client/node_modules" \
    --exclude="server/node_modules" \
    --exclude="server/dist" \
    --exclude="client/build" \
    . 2>/dev/null || true
echo -e "${GREEN}✓ Локальная резервная копия создана: $BACKUP_NAME${NC}"

# Создание архива на сервере
echo -e "${YELLOW}3. Создание архива на сервере...${NC}"
REMOTE_ARCHIVE="server-version-$(date +%s).tar.gz"
ssh $SERVER_USER@$SERVER_IP << ENDSSH
cd $APP_DIR
# Создаем архив исходного кода с сервера
tar -czf $REMOTE_ARCHIVE \
    --exclude="node_modules" \
    --exclude="backups" \
    --exclude="*.tar.gz" \
    --exclude="logs" \
    --exclude=".git" \
    .
echo "Архив $REMOTE_ARCHIVE создан на сервере"
ENDSSH

# Скачивание архива с сервера
echo -e "${YELLOW}4. Скачивание архива с сервера...${NC}"
scp $SERVER_USER@$SERVER_IP:$APP_DIR/$REMOTE_ARCHIVE ./
echo -e "${GREEN}✓ Архив скачан с сервера${NC}"

# Удаление архива с сервера
ssh $SERVER_USER@$SERVER_IP "rm $APP_DIR/$REMOTE_ARCHIVE"

# Очистка локальной директории (кроме .git)
echo -e "${YELLOW}5. Подготовка к развертыванию...${NC}"
# Сохраняем .git и backup
mv .git .git_temp 2>/dev/null || true
mv $BACKUP_NAME backup_temp 2>/dev/null || true

# Очищаем все остальное
find . -mindepth 1 -maxdepth 1 ! -name '.git_temp' ! -name 'backup_temp' -exec rm -rf {} +

# Восстанавливаем .git
mv .git_temp .git 2>/dev/null || true
mv backup_temp $BACKUP_NAME 2>/dev/null || true

# Распаковка архива с сервера
echo -e "${YELLOW}6. Распаковка серверной версии...${NC}"
tar -xzf "$REMOTE_ARCHIVE"
echo -e "${GREEN}✓ Серверная версия развернута${NC}"

# Установка зависимостей
echo -e "${YELLOW}7. Установка зависимостей...${NC}"
echo "Установка зависимостей корневого проекта..."
npm install

echo "Установка зависимостей серверной части..."
cd server && npm install && cd ..

echo "Установка зависимостей клиентской части..."
cd client && npm install && cd ..

echo -e "${GREEN}✓ Все зависимости установлены${NC}"

# Удаление скачанного архива
rm "$REMOTE_ARCHIVE"

echo -e "${GREEN}=== Рабочая версия успешно скачана и развернута! ===${NC}"
echo -e "${YELLOW}Резервная копия локальной версии: $BACKUP_NAME${NC}"
echo -e "${YELLOW}Для запуска используйте: npm start${NC}" 