#!/bin/bash

# Quick deploy script for Beton CRM
# Быстрый деплой без полной пересборки

set -e

# Конфигурация
SERVER_HOST="31.128.39.123"
SERVER_USER="root"
SERVER_PATH="/var/www/beton-crm"
LOCAL_PATH="$(dirname "$0")/.."

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}⚡ Быстрый деплой Beton CRM...${NC}"

# Проверяем что мы в корневой папке проекта
if [ ! -f "package.json" ] && [ ! -d "server" ] && [ ! -d "client" ]; then
    echo -e "${RED}❌ Ошибка: Скрипт должен запускаться из корневой папки проекта${NC}"
    exit 1
fi

# Функция для выполнения команд на сервере
run_on_server() {
    ssh -o StrictHostKeyChecking=no $SERVER_USER@$SERVER_HOST "$1"
}

# Функция для копирования файлов на сервер
copy_to_server() {
    rsync -avz --exclude-from="$(dirname "$0")/deploy-exclude.txt" "$1" "$SERVER_USER@$SERVER_HOST:$2"
}

echo -e "${YELLOW}📦 Коммитим изменения...${NC}"
if ! git diff-index --quiet HEAD --; then
    git add .
    git commit -m "Quick deploy: $(date '+%Y-%m-%d %H:%M:%S')" || echo "Нечего коммитить"
fi

# Создаем файл исключений для rsync
cat > "$(dirname "$0")/deploy-exclude.txt" << EOF
node_modules/
.git/
.env.local
.env.development
*.log
.DS_Store
.vscode/
.idea/
coverage/
build/local/
dist/local/
EOF

echo -e "${YELLOW}🔄 Копируем только измененные файлы...${NC}"

# Копируем только серверные файлы (если изменялся только backend)
if [ "$1" = "backend" ]; then
    copy_to_server "$LOCAL_PATH/server/" "$SERVER_PATH/server/"
    echo -e "${YELLOW}🐳 Перезапускаем только backend...${NC}"
    run_on_server "cd $SERVER_PATH && docker-compose restart backend"
    
elif [ "$1" = "frontend" ]; then
    copy_to_server "$LOCAL_PATH/client/" "$SERVER_PATH/client/"
    echo -e "${YELLOW}🏗️ Пересобираем frontend...${NC}"
    run_on_server "cd $SERVER_PATH/client && npm run build"
    run_on_server "cd $SERVER_PATH && docker-compose restart frontend"
    
else
    # Полная синхронизация
    copy_to_server "$LOCAL_PATH/" "$SERVER_PATH/"
    echo -e "${YELLOW}🐳 Перезапускаем все сервисы...${NC}"
    run_on_server "cd $SERVER_PATH && docker-compose restart"
fi

echo -e "${YELLOW}⏳ Ждем перезапуска...${NC}"
sleep 5

# Проверяем статус
echo -e "${YELLOW}📊 Проверяем статус...${NC}"
run_on_server "cd $SERVER_PATH && docker-compose ps"

# Удаляем временный файл
rm -f "$(dirname "$0")/deploy-exclude.txt"

echo -e "${GREEN}✅ Быстрый деплой завершен!${NC}"
echo -e "${GREEN}🌐 Проверьте: https://beton.shknv.ru${NC}"