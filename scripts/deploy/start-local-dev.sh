#!/bin/bash

# Development start script - использует development Dockerfile
# Не требует предварительной сборки

echo "🚀 Запуск Beton CRM в режиме разработки..."

# Цвета
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Проверка Docker
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker не установлен${NC}"
    exit 1
fi

# Остановка существующих контейнеров
echo -e "${YELLOW}🛑 Остановка существующих контейнеров...${NC}"
docker compose down

# Создание .env файлов если их нет
if [ ! -f "server/.env" ]; then
    echo -e "${YELLOW}📝 Создание server/.env...${NC}"
    cat > server/.env << 'EOF'
# Database
DB_HOST=postgres
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres123
DB_DATABASE=beton_crm

# Server
PORT=5001
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
NODE_ENV=development

# Bitrix24
BITRIX24_WEBHOOK_URL=https://your-domain.bitrix24.ru/rest/user_id/webhook_key/

# CORS
CORS_ORIGIN=http://localhost:3000

# Redis
REDIS_URL=redis://redis:6379
REDIS_TTL=3600
EOF
fi

if [ ! -f "client/.env" ]; then
    echo -e "${YELLOW}📝 Создание client/.env...${NC}"
    cat > client/.env << 'EOF'
REACT_APP_API_URL=http://localhost:5001/api
EOF
fi

# Создание development docker-compose override
echo -e "${YELLOW}📝 Создание docker-compose.override.yml для development...${NC}"
cat > docker-compose.override.yml << 'EOF'
version: '3.8'

services:
  backend:
    build:
      context: ./server
      dockerfile: Dockerfile
    volumes:
      - ./server:/app
      - /app/node_modules
    environment:
      - NODE_ENV=development
    command: npm run dev

  frontend:
    build:
      context: ./client
      dockerfile: Dockerfile
    volumes:
      - ./client:/app
      - /app/node_modules
    environment:
      - NODE_ENV=development
    command: npm start

  postgres:
    ports:
      - "5489:5432"
    volumes:
      - postgres_data_dev:/var/lib/postgresql/data

  redis:
    ports:
      - "6396:6379"
    volumes:
      - redis_data_dev:/data

volumes:
  postgres_data_dev:
  redis_data_dev:
EOF

# Запуск в режиме разработки
echo -e "${YELLOW}🏗️ Сборка и запуск контейнеров в режиме разработки...${NC}"
docker compose up -d --build

# Ожидание готовности
echo -e "${YELLOW}⏳ Ожидание готовности сервисов...${NC}"
sleep 15

# Проверка статуса
echo -e "${YELLOW}📊 Проверка статуса контейнеров...${NC}"
docker compose ps

# Проверка health endpoint
echo -e "${YELLOW}🔍 Проверка API...${NC}"
HEALTH_CHECK=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5001/health 2>/dev/null || echo "000")

if [ "$HEALTH_CHECK" = "200" ]; then
    echo -e "${GREEN}✅ Backend API работает${NC}"
else
    echo -e "${YELLOW}⚠️ Backend еще запускается...${NC}"
    echo -e "Проверьте логи: docker compose logs -f backend"
fi

echo ""
echo -e "${GREEN}✅ Beton CRM запущен в режиме разработки!${NC}"
echo ""
echo -e "${GREEN}🌐 Доступные сервисы:${NC}"
echo "  - Frontend: http://localhost:3000"
echo "  - Backend API: http://localhost:5001"
echo "  - PostgreSQL: localhost:5489"
echo "  - Redis: localhost:6396"
echo ""
echo -e "${YELLOW}📋 Полезные команды:${NC}"
echo "  - Логи всех сервисов: docker compose logs -f"
echo "  - Логи backend: docker compose logs -f backend"
echo "  - Логи frontend: docker compose logs -f frontend"
echo "  - Остановка: docker compose down"
echo "  - Перезапуск: docker compose restart"
echo ""
echo -e "${YELLOW}🔧 Особенности development режима:${NC}"
echo "  - Hot reload для backend и frontend"
echo "  - Volumes подключены для синхронизации кода"
echo "  - Не требуется предварительная сборка"