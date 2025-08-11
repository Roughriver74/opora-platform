#!/bin/bash

# Deploy script for Beton CRM
# Деплой с локальной разработки на сервер

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
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Начинаем деплой Beton CRM на сервер...${NC}"

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

echo -e "${YELLOW}📦 Проверяем изменения...${NC}"

# Проверяем статус git
if ! git diff-index --quiet HEAD --; then
    echo -e "${YELLOW}⚠️ Есть незакоммиченные изменения. Коммитим перед деплоем...${NC}"
    git add .
    git commit -m "Deploy: $(date '+%Y-%m-%d %H:%M:%S')" || echo "Нечего коммитить"
fi

echo -e "${YELLOW}🔄 Копируем файлы на сервер...${NC}"

# Создаем файл исключений для rsync
cat > "$(dirname "$0")/deploy-exclude.txt" << EOF
node_modules/
.git/
.env.local
.env.development
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
.DS_Store
.vscode/
.idea/
coverage/
build/local/
dist/local/
*.tmp
*.temp
.cache/
EOF

# Копируем проект на сервер
copy_to_server "$LOCAL_PATH/" "$SERVER_PATH/"

echo -e "${YELLOW}🔧 Устанавливаем зависимости на сервере...${NC}"

# Обновляем зависимости и перезапускаем сервисы
run_on_server "cd $SERVER_PATH && npm install --production"
run_on_server "cd $SERVER_PATH/server && npm install --production"
run_on_server "cd $SERVER_PATH/client && npm install --production"

echo -e "${YELLOW}🏗️ Собираем проект на сервере...${NC}"

# Собираем фронтенд
run_on_server "cd $SERVER_PATH/client && npm run build"

echo -e "${YELLOW}🐳 Перезапускаем Docker контейнеры...${NC}"

# Останавливаем и запускаем контейнеры
run_on_server "cd $SERVER_PATH && docker-compose down"
run_on_server "cd $SERVER_PATH && docker-compose up -d --build"

echo -e "${YELLOW}⏳ Ждем запуска сервисов...${NC}"
sleep 10

# Проверяем статус сервисов
echo -e "${YELLOW}📊 Проверяем статус сервисов...${NC}"
run_on_server "cd $SERVER_PATH && docker-compose ps"

# Проверяем доступность API
echo -e "${YELLOW}🔍 Проверяем доступность API...${NC}"
if run_on_server "curl -f http://localhost:5001/health"; then
    echo -e "${GREEN}✅ API работает корректно${NC}"
else
    echo -e "${RED}❌ API недоступен${NC}"
fi

# Удаляем временный файл исключений
rm -f "$(dirname "$0")/deploy-exclude.txt"

echo -e "${GREEN}✅ Деплой завершен успешно!${NC}"
echo -e "${GREEN}🌐 Сайт доступен по адресу: https://beton.shknv.ru${NC}"
echo -e "${GREEN}🔧 API доступен по адресу: https://beton.shknv.ru/api${NC}"

echo -e "${YELLOW}📝 Полезные команды для мониторинга:${NC}"
echo -e "  Логи всех сервисов: ssh $SERVER_USER@$SERVER_HOST 'cd $SERVER_PATH && docker-compose logs -f'"
echo -e "  Логи backend: ssh $SERVER_USER@$SERVER_HOST 'cd $SERVER_PATH && docker-compose logs -f backend'"
echo -e "  Статус контейнеров: ssh $SERVER_USER@$SERVER_HOST 'cd $SERVER_PATH && docker-compose ps'"
echo -e "  Перезапуск сервисов: ssh $SERVER_USER@$SERVER_HOST 'cd $SERVER_PATH && docker-compose restart'"