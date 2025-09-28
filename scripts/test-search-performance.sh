#!/bin/bash

# Скрипт для тестирования производительности поиска
# Использование: ./test-search-performance.sh

echo "🚀 Запуск тестов производительности поиска..."

# Проверяем, что мы в правильной директории
if [ ! -f "package.json" ]; then
    echo "❌ Ошибка: Запустите скрипт из корневой директории проекта"
    exit 1
fi

# Проверяем, что Docker запущен
if ! docker ps > /dev/null 2>&1; then
    echo "❌ Ошибка: Docker не запущен"
    exit 1
fi

# Проверяем, что контейнеры запущены
if ! docker compose ps | grep -q "Up"; then
    echo "❌ Ошибка: Контейнеры не запущены. Запустите ./scripts/start.sh"
    exit 1
fi

echo "✅ Docker контейнеры запущены"

# Ждем, пока Elasticsearch будет готов
echo "⏳ Ожидание готовности Elasticsearch..."
for i in {1..30}; do
    if curl -s http://localhost:9200/_cluster/health > /dev/null 2>&1; then
        echo "✅ Elasticsearch готов"
        break
    fi
    echo "Ожидание... ($i/30)"
    sleep 2
done

# Проверяем статус Elasticsearch
ELASTICSEARCH_STATUS=$(curl -s http://localhost:9200/_cluster/health | jq -r '.status' 2>/dev/null)
if [ "$ELASTICSEARCH_STATUS" != "green" ] && [ "$ELASTICSEARCH_STATUS" != "yellow" ]; then
    echo "⚠️  Предупреждение: Elasticsearch статус: $ELASTICSEARCH_STATUS"
fi

# Запускаем тесты производительности
echo "🧪 Запуск тестов производительности поиска..."

# Переходим в директорию сервера
cd server

# Запускаем тесты
npm test -- --testPathPattern=search-performance.test.ts --verbose

# Проверяем результат
if [ $? -eq 0 ]; then
    echo "✅ Тесты производительности прошли успешно!"
else
    echo "❌ Тесты производительности завершились с ошибками"
    exit 1
fi

echo "📊 Анализ производительности завершен"
echo ""
echo "💡 Рекомендации по оптимизации:"
echo "1. Для длинных запросов (>20 символов) используется оптимизированная стратегия поиска"
echo "2. Кэширование результатов поиска на 2 минуты"
echo "3. Минимальный score 0.1 для фильтрации нерелевантных результатов"
echo "4. Специальный анализатор для длинных названий"
echo "5. Увеличенный refresh_interval для лучшей производительности"
echo ""
echo "🔧 Для дополнительной оптимизации:"
echo "- Увеличьте количество шардов при росте данных"
echo "- Настройте мониторинг производительности Elasticsearch"
echo "- Рассмотрите использование SSD для индексов"
