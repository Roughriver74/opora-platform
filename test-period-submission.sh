#!/bin/bash

# Скрипт для тестирования новой системы периодических заявок

echo "🚀 Тестирование системы периодических заявок"
echo "============================================"

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Проверка Docker
echo -e "\n${YELLOW}1. Проверка Docker...${NC}"
if docker ps > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Docker запущен${NC}"
else
    echo -e "${RED}✗ Docker не запущен. Запустите Docker Desktop и повторите попытку.${NC}"
    exit 1
fi

# Переход в директорию проекта
cd /Users/evgenijsikunov/projects/beton-crm/beton-crm

# Запуск сервисов если не запущены
echo -e "\n${YELLOW}2. Запуск сервисов...${NC}"
if docker compose ps | grep -q "beton-crm-backend.*running"; then
    echo -e "${GREEN}✓ Сервисы уже запущены${NC}"
else
    echo "Запуск сервисов..."
    ./scripts/start.sh
    sleep 10
fi

# Запуск миграции
echo -e "\n${YELLOW}3. Запуск миграции базы данных...${NC}"
docker compose exec backend npm run migration:run

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Миграция выполнена успешно${NC}"
else
    echo -e "${RED}✗ Ошибка миграции${NC}"
    exit 1
fi

# Проверка логов на наличие ошибок
echo -e "\n${YELLOW}4. Проверка логов сервера...${NC}"
docker compose logs backend --tail=50 | grep -E "Воркер очереди заявок запущен|Планировщик запланированных заявок запущен"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Воркер и планировщик успешно запущены${NC}"
else
    echo -e "${YELLOW}⚠ Воркер или планировщик могут быть не запущены${NC}"
fi

# Тестовый запрос создания периодических заявок
echo -e "\n${YELLOW}5. Создание тестовых периодических заявок...${NC}"

# Получаем токен авторизации
TOKEN=$(curl -s -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "crm@betonexpress.pro",
    "password": "admin123"
  }' | grep -o '"token":"[^"]*' | sed 's/"token":"//')

if [ -z "$TOKEN" ]; then
    echo -e "${RED}✗ Не удалось получить токен авторизации${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Токен авторизации получен${NC}"

# Создаем периодические заявки на 3 дня
TODAY=$(date +%Y-%m-%d)
END_DATE=$(date -v+2d +%Y-%m-%d 2>/dev/null || date -d "+2 days" +%Y-%m-%d)

echo -e "\nСоздание заявок с $TODAY по $END_DATE..."

RESPONSE=$(curl -s -X POST http://localhost:5001/api/submissions/period \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"formId\": \"00000000-0000-0000-0000-000000000001\",
    \"formData\": {
      \"field_1750311865385\": \"$TODAY\",
      \"field_1750311865386\": \"10:00\",
      \"field_1750311865387\": \"Тестовая компания\",
      \"field_1750311865388\": \"100\",
      \"field_1750311865389\": \"Москва, ул. Тестовая, д. 1\"
    },
    \"periodConfig\": {
      \"startDate\": \"$TODAY\",
      \"endDate\": \"$END_DATE\",
      \"dateFieldName\": \"field_1750311865385\",
      \"time\": \"10:00\",
      \"timeFieldName\": \"field_1750311865386\",
      \"priority\": \"medium\"
    }
  }")

echo "Ответ сервера:"
echo $RESPONSE | python3 -m json.tool 2>/dev/null || echo $RESPONSE

# Проверка очереди задач
echo -e "\n${YELLOW}6. Проверка очереди задач...${NC}"
docker compose exec backend redis-cli -p 6396 LLEN bull:submission-queue:wait

echo -e "\n${YELLOW}7. Проверка логов обработки...${NC}"
sleep 5
docker compose logs backend --tail=20 | grep -E "PERIOD_SERVICE|SUBMISSION_QUEUE|SCHEDULER"

echo -e "\n${GREEN}✅ Тестирование завершено!${NC}"
echo -e "\nДля мониторинга работы системы используйте:"
echo "  ./scripts/logs.sh backend | grep -E 'PERIOD|QUEUE|SCHEDULER'"
echo ""
echo "Для проверки статуса запланированных заявок в БД:"
echo "  docker compose exec postgres psql -U postgres -d beton_crm -c 'SELECT id, scheduled_date, status FROM scheduled_submissions;'"