# Деплой исправления синхронизации ИНН

## Что было исправлено

1. **searchSyncService.ts** - изменен метод синхронизации компаний с `getAllCompanies()` на `getAllCompaniesWithRequisites()`
2. **searchSyncService.ts** - добавлен ИНН в поисковый текст в методе `buildSearchableText()`

## Шаги для деплоя

### 1. Остановить сервисы

```bash
docker compose down
```

### 2. Пересобрать и запустить

```bash
./scripts/start.sh
```

### 3. Пересинхронизировать данные Elasticsearch

**Вариант A: Через API (рекомендуется)**

```bash
# Запустить синхронизацию через API
curl -X POST http://localhost:3001/api/search/sync-all
```

**Вариант B: Через скрипт**

```bash
cd server
npx ts-node src/scripts/syncBitrixToElasticsearch.ts
```

### 4. Проверить результат

**Тест синхронизации ИНН:**

```bash
cd server
npx ts-node src/scripts/testInnSync.ts
```

**Проверка через API:**

```bash
# Поиск компании по ИНН
curl -X POST http://localhost:3001/api/search/companies \
  -H "Content-Type: application/json" \
  -d '{"query": "1234567890", "limit": 10}'
```

## Ожидаемый результат

После деплоя:

- ✅ ИНН компаний будет отображаться в результатах поиска
- ✅ Поиск по ИНН будет работать корректно
- ✅ В логах будет видно, что ИНН правильно загружается из реквизитов

## Мониторинг

Следите за логами:

```bash
docker compose logs -f server
```

Ищите сообщения типа:

- `Загружаем все компании из Bitrix24 с реквизитами...`
- `Found X companies to sync`
- `Companies sync completed: X/X`

## Откат (если потребуется)

Если что-то пойдет не так, можно откатиться:

1. Вернуть изменения в `searchSyncService.ts`
2. Перезапустить сервисы
3. Пересинхронизировать данные

## Статус

✅ **Готово к деплою** - все изменения внесены и протестированы


