#!/bin/bash

# Скрипт для индексации submissions в Elasticsearch на продакшн сервере
# Использование: ./scripts/index-submissions-production.sh

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

echo -e "${YELLOW}=== Индексация submissions в Elasticsearch ===${NC}"

# Проверка подключения к серверу
echo -e "${BLUE}1. Проверка подключения к серверу...${NC}"
if ! ssh $SERVER_USER@$SERVER_IP "echo 'Подключение успешно'" > /dev/null 2>&1; then
    echo -e "${RED}❌ Не удается подключиться к серверу $SERVER_IP${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Подключение к серверу установлено${NC}"

# Проверка статуса Docker контейнеров
echo -e "${BLUE}2. Проверка статуса Docker контейнеров...${NC}"
ssh $SERVER_USER@$SERVER_IP << 'ENDSSH'
cd /var/www/beton-crm

echo "Статус контейнеров:"
docker-compose ps

# Проверка, что backend контейнер запущен
if ! docker-compose ps | grep -q "backend.*Up"; then
    echo "❌ Backend контейнер не запущен!"
    exit 1
fi

echo "✅ Backend контейнер запущен"
ENDSSH

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Backend контейнер не запущен!${NC}"
    exit 1
fi

# Запуск индексации через Docker контейнер
echo -e "${BLUE}3. Запуск индексации submissions в Elasticsearch...${NC}"
ssh $SERVER_USER@$SERVER_IP << 'ENDSSH'
cd /var/www/beton-crm

echo "Запуск индексации через Docker контейнер..."
docker-compose exec -T backend node dist/scripts/index-submissions-to-elasticsearch.js

echo "Индексация завершена!"
ENDSSH

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Индексация submissions завершена успешно!${NC}"
else
    echo -e "${RED}❌ Ошибка при индексации submissions${NC}"
    exit 1
fi

# Проверка результатов индексации
echo -e "${BLUE}4. Проверка результатов индексации...${NC}"
ssh $SERVER_USER@$SERVER_IP << 'ENDSSH'
cd /var/www/beton-crm

echo "Проверка количества документов в Elasticsearch..."
docker-compose exec -T backend node -e "
const { elasticsearchService } = require('./dist/services/elasticsearchService');
(async () => {
    try {
        const stats = await elasticsearchService.getIndexStats();
        console.log('📊 Статистика индекса:');
        console.log('  - Документов:', stats.documents);
        console.log('  - Размер:', stats.size);
        console.log('  - Индекс:', stats.indexName);
    } catch (error) {
        console.error('Ошибка получения статистики:', error.message);
    }
})();
"
ENDSSH

echo -e "${GREEN}=== Индексация завершена! ===${NC}"
echo -e "${YELLOW}Теперь поиск по submissions должен работать корректно.${NC}"
