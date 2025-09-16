#!/bin/bash

# Скрипт для запуска индексации submissions на сервере
# Использование на сервере: ./scripts/index-submissions-server.sh

# Цвета для вывода
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${YELLOW}=== Индексация submissions в Elasticsearch ===${NC}"

# Проверка, что мы в правильной директории
if [ ! -f "docker-compose.yml" ]; then
    echo -e "${RED}❌ Скрипт должен быть запущен из корневой директории проекта${NC}"
    echo -e "${YELLOW}Используйте: cd /var/www/beton-crm && ./scripts/index-submissions-server.sh${NC}"
    exit 1
fi

# Проверка статуса Docker контейнеров
echo -e "${BLUE}1. Проверка статуса Docker контейнеров...${NC}"
echo "Статус контейнеров:"
docker-compose ps

# Проверка, что backend контейнер запущен
if ! docker-compose ps | grep -q "backend.*Up"; then
    echo -e "${RED}❌ Backend контейнер не запущен!${NC}"
    echo -e "${YELLOW}Запустите контейнеры: docker-compose up -d${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Backend контейнер запущен${NC}"

# Запуск индексации
echo -e "${BLUE}2. Запуск индексации submissions в Elasticsearch...${NC}"
echo "Это может занять несколько минут..."

docker-compose exec -T backend node scripts/index-submissions-to-elasticsearch.js

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Индексация submissions завершена успешно!${NC}"
else
    echo -e "${RED}❌ Ошибка при индексации submissions${NC}"
    exit 1
fi

# Проверка результатов
echo -e "${BLUE}3. Проверка результатов индексации...${NC}"
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

echo -e "${GREEN}=== Индексация завершена! ===${NC}"
echo -e "${YELLOW}Теперь поиск по submissions должен работать корректно.${NC}"
