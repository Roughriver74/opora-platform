# Исправление кроновой синхронизации Elasticsearch

## Проблема

Кроновая синхронизация Elasticsearch имела две основные проблемы:

1. **Не синхронизировала заявки** - использовался `searchSyncService.syncAllData()`, который не включал заявки
2. **Слишком редкое обновление** - синхронизация происходила каждые 6 часов вместо каждых 30 минут

## Решение

### 1. Добавлена синхронизация заявок

В файле `server/src/services/searchSyncService.ts`:

**Добавлен метод `syncSubmissions()`:**

```typescript
async syncSubmissions(): Promise<SyncStats> {
    // Загружает все заявки из базы данных
    // Создает поисковые документы с полной информацией
    // Индексирует в Elasticsearch
}
```

**Добавлен метод `buildSubmissionSearchableText()`:**

```typescript
private buildSubmissionSearchableText(submission: any): string {
    // Создает поисковый текст из всех полей заявки
    // Включает данные из formData
}
```

**Обновлен метод `syncAllData()`:**

```typescript
// Добавлена синхронизация заявок
const submissionsStats = await this.syncSubmissions()
this.mergeStats(stats, submissionsStats)
```

### 2. Изменено расписание крона

В файле `server/src/services/syncScheduler.ts`:

**Было:**

```typescript
public startScheduler(schedule: string = '0 */6 * * *'): void // каждые 6 часов
```

**Стало:**

```typescript
public startScheduler(schedule: string = '*/30 * * * *'): void // каждые 30 минут
```

**Добавлена опция "Каждые 30 минут" в доступные расписания:**

```typescript
return {
	'Каждые 30 минут': '*/30 * * * *',
	'Каждый час': '0 * * * *',
	// ... остальные опции
}
```

## Разница между скриптами

### Кроновая синхронизация (searchSyncService)

- ✅ **Теперь включает заявки**
- ✅ **Обновляется каждые 30 минут**
- ✅ **Синхронизирует продукты, компании, заявки**
- ✅ **Использует правильный метод для компаний с ИНН**

### Ручная синхронизация (syncBitrixToElasticsearch.ts)

- ✅ **Включает заявки**
- ✅ **Полная переиндексация**
- ✅ **Используется по кнопке в настройках**

## Тестирование

Создан тестовый скрипт: `server/src/scripts/testCronSync.ts`

Запуск теста:

```bash
cd server
npx ts-node src/scripts/testCronSync.ts
```

Или через bash скрипт:

```bash
./server/src/scripts/runCronTest.sh
```

## Проверка результатов

После исправления:

1. **Кроновая синхронизация**: Запускается каждые 30 минут и включает заявки
2. **Поиск по заявкам**: Работает корректно через Elasticsearch
3. **ИНН компаний**: Правильно синхронизируется и отображается
4. **Настройки**: Доступна опция "Каждые 30 минут"

## Мониторинг

Следите за логами:

```bash
docker compose logs -f server
```

Ищите сообщения типа:

- `🕐 Планировщик синхронизации запущен. Расписание: */30 * * * *`
- `Starting submissions sync...`
- `Submissions sync completed: X/X`
- `Data sync completed: {totalProcessed: X, successful: X, failed: 0}`

## API для управления

### Получение статуса

```bash
curl -X GET http://localhost:3001/api/sync/status
```

### Запуск ручной синхронизации

```bash
curl -X POST http://localhost:3001/api/sync/start
```

### Установка расписания

```bash
curl -X POST http://localhost:3001/api/sync/schedule \
  -H "Content-Type: application/json" \
  -d '{"schedule": "*/30 * * * *"}'
```

## Статус

✅ **Исправлено** - кроновая синхронизация теперь включает заявки и обновляется каждые 30 минут


