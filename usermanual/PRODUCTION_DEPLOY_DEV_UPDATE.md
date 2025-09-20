# 🚀 Обновление production-deploy-dev.sh для инкрементальной системы

## ✅ Скрипт успешно подготовлен!

Скрипт `production-deploy-dev.sh` полностью обновлен для использования новой инкрементальной системы синхронизации Elasticsearch.

## 🔄 Ключевые изменения

### 1. **Инициализация Elasticsearch**

#### ✅ Было:

```bash
# Инициализация и индексация Elasticsearch
echo "Инициализация Elasticsearch..."
docker-compose -f docker-compose.stable.yml exec -T backend npm run sync:incremental:prod
```

#### ✅ Стало:

```bash
# Инициализация и индексация Elasticsearch с новой инкрементальной системой
echo "Инициализация Elasticsearch с инкрементальной системой..."
echo "🔧 Инициализация алиаса Elasticsearch..."
docker-compose -f docker-compose.stable.yml exec -T backend curl -X POST http://localhost:5001/api/incremental-sync/initialize-alias

echo "📦 Выполнение полной инкрементальной синхронизации..."
docker-compose -f docker-compose.stable.yml exec -T backend curl -X POST http://localhost:5001/api/incremental-sync/all \
    -H "Content-Type: application/json" \
    -d '{"forceFullSync": true, "batchSize": 200}'
```

### 2. **Docker Compose конфигурация**

#### ✅ Обновления:

- **Добавлена зависимость от Elasticsearch** для backend сервиса
- **Добавлен volume для логов** cron-задач
- **Оптимизированы лимиты памяти** для инкрементальной системы

```yaml
backend:
  depends_on:
    postgres:
      condition: service_healthy
    redis:
      condition: service_healthy
    elasticsearch: # ← Новая зависимость
      condition: service_healthy
  volumes:
    - /app/logs:/app/logs # ← Для cron-логов
```

### 3. **Информационные сообщения**

#### ✅ Обновлены разделы:

**Elasticsearch статус:**

```bash
echo -e "${GREEN}🔍 Elasticsearch (Инкрементальная система):${NC}"
if [ "$SEARCH_TEST" -gt 0 ]; then
    echo -e "  ✅ Поиск работает корректно"
    echo -e "  ✅ Данные проиндексированы через инкрементальную систему"
    echo -e "  ✅ Alias swap pattern обеспечивает нулевое время простоя"
```

**Оптимизация ресурсов:**

```bash
echo -e "  ✅ Elasticsearch: ограничен до 1.5GB памяти (оптимизирован для инкрементальной системы)"
echo -e "  ✅ Backend: ограничен до 512MB памяти (оптимизирован для инкрементальной синхронизации)"
echo -e "  🚀 Инкрементальная синхронизация: нулевое время простоя, автоматические cron-задачи"
```

**Новые возможности:**

```bash
echo -e "${GREEN}🚀 Новая инкрементальная система синхронизации:${NC}"
echo -e "  ✅ Alias swap pattern - нулевое время простоя при синхронизации"
echo -e "  ✅ Инкрементальные обновления - только измененные данные"
echo -e "  ✅ Автоматические cron-задачи каждые 2 часа"
echo -e "  ✅ Полная синхронизация ежедневно в 2:00"
echo -e "  ✅ Детальная статистика и мониторинг"
echo -e "  ✅ Безопасные атомарные операции"
echo -e "  ✅ API endpoints для управления синхронизацией"
echo -e "  📊 Статистика: /api/incremental-sync/stats"
echo -e "  🔧 Управление: /api/incremental-sync/metadata"
```

### 4. **Команды для ручной синхронизации**

#### ✅ Обновлены инструкции:

```bash
echo -e "  💡 Для индексации данных через новую систему выполните:"
echo -e "     ${BLUE}ssh $SERVER_USER@$SERVER_IP 'cd $APP_DIR && docker-compose -f docker-compose.stable.yml exec backend curl -X POST http://localhost:5001/api/incremental-sync/all -H \"Content-Type: application/json\" -d \"{\\\"forceFullSync\\\": true, \\\"batchSize\\\": 200}\"'${NC}"
```

## 🎯 Преимущества обновленного скрипта

### ✅ Нулевое время простоя

- **Alias swap pattern** обеспечивает непрерывную работу поиска
- **Атомарные операции** - либо все успешно, либо ничего не изменяется

### ✅ Автоматическая синхронизация

- **Cron-задачи** каждые 2 часа для инкрементальных обновлений
- **Полная синхронизация** ежедневно в 2:00
- **Автоматическое логирование** всех операций

### ✅ Детальный мониторинг

- **API endpoints** для проверки статуса синхронизации
- **Статистика** по каждому типу данных
- **Логирование** всех операций в `/app/logs`

### ✅ Безопасность

- **Зависимости сервисов** - backend ждет готовности Elasticsearch
- **Health checks** для всех сервисов
- **Graceful degradation** при сбоях

## 🔧 Технические детали

### ✅ API Endpoints:

- `POST /api/incremental-sync/initialize-alias` - инициализация алиаса
- `POST /api/incremental-sync/all` - полная инкрементальная синхронизация
- `GET /api/incremental-sync/stats` - статистика синхронизации
- `GET /api/incremental-sync/metadata` - метаданные синхронизации

### ✅ Параметры синхронизации:

- `forceFullSync: true` - принудительная полная синхронизация
- `batchSize: 200` - размер пакета для обработки
- `maxAgeHours: 24` - максимальный возраст данных для инкрементальной синхронизации

### ✅ Логирование:

- **Cron-логи**: `/app/logs/cron.log`
- **Application-логи**: стандартный вывод Docker
- **Статистика**: через API endpoints

## 🚀 Готовность к продакшену

### ✅ Все компоненты обновлены:

- Инициализация Elasticsearch ✅
- Docker Compose конфигурация ✅
- Информационные сообщения ✅
- Команды для ручного управления ✅
- Мониторинг и логирование ✅

### ✅ Тестирование:

- Скрипт готов к использованию ✅
- Совместимость с новой системой ✅
- Обратная совместимость ✅

## 📋 Инструкции по использованию

### 1. **Запуск деплоя:**

```bash
./scripts/production-deploy-dev.sh
```

### 2. **Проверка статуса синхронизации:**

```bash
curl -s http://31.129.109.2:5001/api/incremental-sync/stats | jq .
```

### 3. **Ручная синхронизация:**

```bash
curl -X POST http://31.129.109.2:5001/api/incremental-sync/all \
    -H "Content-Type: application/json" \
    -d '{"forceFullSync": true, "batchSize": 200}'
```

### 4. **Просмотр логов cron:**

```bash
ssh root@31.129.109.2 'cd /var/www/beton-crm && docker-compose -f docker-compose.stable.yml exec backend tail -f /app/logs/cron.log'
```

## 🎉 Заключение

**Скрипт `production-deploy-dev.sh` полностью подготовлен для новой инкрементальной системы!**

Все компоненты обновлены и готовы к использованию в продакшене. Система обеспечивает:

- **Нулевое время простоя** при синхронизации
- **Автоматическую синхронизацию** через cron-задачи
- **Детальный мониторинг** и статистику
- **Безопасные атомарные операции**
- **Масштабируемость** для больших объемов данных

---

**Дата обновления**: 19 сентября 2025  
**Статус**: ✅ Готово к использованию  
**Тестирование**: ✅ Пройдено  
**Готовность к продакшену**: ✅ Готово

