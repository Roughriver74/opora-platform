#!/bin/bash

# Скрипт индексации submissions в Elasticsearch для запуска на сервере
# Использование: ./scripts/index-submissions-server.sh

# Цвета для вывода
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${YELLOW}=== Индексация submissions в Elasticsearch (сервер) ===${NC}"

# Проверка, что мы находимся в правильной директории
if [ ! -f "docker-compose.yml" ]; then
    echo -e "${RED}❌ Файл docker-compose.yml не найден. Запустите скрипт из корневой папки проекта.${NC}"
    exit 1
fi

# Проверка статуса Docker контейнеров
echo -e "${BLUE}1. Проверка статуса Docker контейнеров...${NC}"
if ! docker-compose ps | grep -q "backend.*Up"; then
    echo -e "${RED}❌ Backend контейнер не запущен!${NC}"
    echo -e "${YELLOW}Запускаем контейнеры...${NC}"
    docker-compose up -d
    sleep 10
    
    if ! docker-compose ps | grep -q "backend.*Up"; then
        echo -e "${RED}❌ Не удалось запустить backend контейнер${NC}"
        exit 1
    fi
fi
echo -e "${GREEN}✅ Backend контейнер запущен${NC}"

# Проверка доступности Elasticsearch
echo -e "${BLUE}2. Проверка доступности Elasticsearch...${NC}"
ELASTICSEARCH_CHECK=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:9200/_cluster/health 2>/dev/null || echo "000")

if [ "$ELASTICSEARCH_CHECK" = "200" ]; then
    echo -e "${GREEN}✅ Elasticsearch доступен${NC}"
else
    echo -e "${RED}❌ Elasticsearch недоступен (код: $ELASTICSEARCH_CHECK)${NC}"
    echo -e "${YELLOW}Ожидаем запуска Elasticsearch...${NC}"
    sleep 15
    
    ELASTICSEARCH_CHECK=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:9200/_cluster/health 2>/dev/null || echo "000")
    if [ "$ELASTICSEARCH_CHECK" = "200" ]; then
        echo -e "${GREEN}✅ Elasticsearch теперь доступен${NC}"
    else
        echo -e "${RED}❌ Elasticsearch все еще недоступен${NC}"
        exit 1
    fi
fi

# Запуск индексации через Docker контейнер
echo -e "${BLUE}3. Запуск индексации submissions в Elasticsearch...${NC}"
docker-compose exec -T backend node dist/scripts/index-submissions-to-elasticsearch.js

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Индексация submissions завершена успешно!${NC}"
else
    echo -e "${RED}❌ Ошибка при индексации submissions${NC}"
    exit 1
fi

# Проверка результатов индексации
echo -e "${BLUE}4. Проверка результатов индексации...${NC}"
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