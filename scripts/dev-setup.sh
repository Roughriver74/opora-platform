#!/bin/bash

# Development setup script for Beton CRM
# Настройка среды разработки

set -e

# Цвета
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}🛠️ Настройка среды разработки Beton CRM${NC}"

# Проверяем что мы в корневой папке проекта
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Ошибка: Запустите скрипт из корневой папки проекта${NC}"
    exit 1
fi

# Проверяем наличие Docker
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker не установлен. Установите Docker Desktop${NC}"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ Docker Compose не установлен${NC}"
    exit 1
fi

echo -e "${YELLOW}📦 Устанавливаем зависимости...${NC}"

# Устанавливаем зависимости
npm install

# Устанавливаем зависимости для сервера
cd server && npm install && cd ..

# Устанавливаем зависимости для клиента
cd client && npm install && cd ..

echo -e "${YELLOW}🔧 Настраиваем конфигурацию...${NC}"

# Создаем .env файлы если их нет
if [ ! -f "server/.env" ]; then
    cp server/.env.example server/.env 2>/dev/null || cat > server/.env << EOF
# Database
DB_HOST=localhost
DB_PORT=5489
DB_USERNAME=postgres
DB_PASSWORD=your_password_here
DB_DATABASE=beton_crm

# Server
PORT=5001
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
NODE_ENV=development

# Bitrix24
BITRIX24_WEBHOOK_URL=https://your-domain.bitrix24.ru/rest/user_id/webhook_key/

# CORS
CORS_ORIGIN=http://localhost:3000,http://31.128.39.123:3000

# Redis
REDIS_URL=redis://localhost:6396
REDIS_TTL=3600
EOF
    echo -e "${YELLOW}⚠️ Создан server/.env - настройте переменные окружения${NC}"
fi

if [ ! -f "client/.env" ]; then
    cat > client/.env << EOF
REACT_APP_API_URL=http://localhost:5001/api
EOF
    echo -e "${GREEN}✅ Создан client/.env${NC}"
fi

echo -e "${YELLOW}🐳 Запускаем Docker контейнеры...${NC}"

# Останавливаем контейнеры если они запущены
docker-compose down 2>/dev/null || true

# Запускаем в режиме разработки
./scripts/start-dev.sh

echo -e "${YELLOW}⏳ Ждем запуска сервисов...${NC}"
sleep 15

# Проверяем статус сервисов
echo -e "${YELLOW}📊 Проверяем статус сервисов...${NC}"
docker-compose ps

# Проверяем доступность API
echo -e "${YELLOW}🔍 Проверяем API...${NC}"
if curl -f http://localhost:5001/health &>/dev/null; then
    echo -e "${GREEN}✅ API работает${NC}"
else
    echo -e "${RED}❌ API недоступен. Проверьте логи: ./scripts/logs.sh backend${NC}"
fi

# Проверяем доступность фронтенда
echo -e "${YELLOW}🔍 Проверяем фронтенд...${NC}"
if curl -f http://localhost:3000 &>/dev/null; then
    echo -e "${GREEN}✅ Фронтенд работает${NC}"
else
    echo -e "${YELLOW}⚠️ Фронтенд может еще запускаться. Проверьте: http://localhost:3000${NC}"
fi

echo -e "${GREEN}✅ Среда разработки настроена!${NC}"
echo ""
echo -e "${YELLOW}📝 Полезные команды:${NC}"
echo -e "  Запуск разработки:   ./scripts/start-dev.sh"
echo -e "  Остановка:           ./scripts/stop.sh"
echo -e "  Логи:                ./scripts/logs.sh"
echo -e "  Деплой на сервер:    ./scripts/deploy.sh"
echo -e "  Быстрый деплой:      ./scripts/deploy-quick.sh"
echo -e "  Синхронизация БД:    ./scripts/sync-db.sh"
echo ""
echo -e "${GREEN}🌐 Приложение доступно:${NC}"
echo -e "  Фронтенд: http://localhost:3000"
echo -e "  API: http://localhost:5001/api"
echo -e "  Логин: crm@betonexpress.pro"
echo -e "  Пароль: admin123"