# 🚀 Быстрый старт с Elasticsearch

## Запуск системы с Elasticsearch

### 1. Запуск всех сервисов

```bash
# Остановка существующих контейнеров
docker compose down

# Запуск с Elasticsearch
docker compose up -d

# Проверка статуса
docker compose ps
```

### 2. Проверка Elasticsearch

```bash
# Проверка здоровья Elasticsearch
curl http://localhost:9200/_cluster/health

# Проверка через API приложения
curl http://localhost:5001/api/search/health
```

### 3. Синхронизация данных

```bash
# Синхронизация всех данных (требует админ токен)
curl -X POST http://localhost:5001/api/search/sync \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json"
```

### 4. Тестирование поиска

```bash
# Поиск продуктов
curl -X POST http://localhost:5001/api/search/products \
  -H "Content-Type: application/json" \
  -d '{"query": "бетон", "limit": 10}'

# Автодополнение
curl -X POST http://localhost:5001/api/search/suggest \
  -H "Content-Type: application/json" \
  -d '{"query": "бет"}'
```

## 🔧 Полезные команды

### Мониторинг

```bash
# Логи Elasticsearch
docker logs beton_elasticsearch -f

# Статистика индекса
curl http://localhost:5001/api/search/aggregations

# Размер индекса
curl http://localhost:9200/beton_crm_search/_stats
```

### Управление данными

```bash
# Пересоздание индекса
curl -X DELETE http://localhost:9200/beton_crm_search
curl -X POST http://localhost:5001/api/search/sync

# Очистка данных
docker volume rm beton-crm_elasticsearch_data
```

## 🚨 Устранение неполадок

### Elasticsearch не запускается

```bash
# Проверка памяти
docker stats beton_elasticsearch

# Увеличение памяти в docker-compose.yml
"ES_JAVA_OPTS=-Xms1g -Xmx1g"
```

### Медленный поиск

```bash
# Проверка размера индекса
curl http://localhost:9200/beton_crm_search/_stats

# Оптимизация запросов
curl -X POST http://localhost:9200/beton_crm_search/_forcemerge
```

## 📊 Сравнение производительности

| Операция             | Bitrix24 REST API | Elasticsearch |
| -------------------- | ----------------- | ------------- |
| Поиск продуктов      | 2-5 сек           | 50-200 мс     |
| Автодополнение       | Не поддерживается | 10-50 мс      |
| Нечеткий поиск       | Не поддерживается | 100-300 мс    |
| Полнотекстовый поиск | Ограниченный      | Полный        |

## 🎯 Следующие шаги

1. **Протестировать** все эндпоинты поиска
2. **Синхронизировать** данные из Bitrix24
3. **Настроить** производительность под ваши нужды
4. **Интегрировать** в фронтенд приложения
5. **Добавить** мониторинг и алерты
