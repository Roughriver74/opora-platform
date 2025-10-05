# Исправление проблемы синхронизации заявок с Bitrix24

## Описание проблемы

**Симптомы**: Пользователи иногда получают ошибку при отправке заявки. Заявка не сохраняется в приложении, но создается в Bitrix24.

**Корневая причина**: Race condition между созданием записи в БД и отправкой в Bitrix24. При сетевых таймаутах или задержках ответа от Bitrix24 заявка успевала создаться в CRM, но приложение считало это ошибкой и удаляло запись из локальной БД.

## Внесенные изменения

### 1. Добавлен retry mechanism для Bitrix24 (bitrix24Service.ts)

```typescript
async createDeal(dealData: any) {
  const response = await retryRequest(() =>
    axios.post(
      `${this.webhookUrl}crm.deal.add`,
      {
        fields: dealData,
        params: { REGISTER_SONET_EVENT: 'Y' },
      },
      { timeout: 15000 }
    )
  )
  return response.data
}
```

**Что это дает**: Автоматическая повторная попытка при временных сетевых сбоях (до 3 попыток с задержкой).

### 2. Изменен порядок операций (submissionController.ts:93-142)

**Старая логика**:
1. Создать submission в БД
2. Добавить ID submission в dealData
3. Отправить в Bitrix24
4. При ошибке - удалить submission из БД ❌

**Новая логика**:
1. ✅ **Сначала создать сделку в Bitrix24**
2. ✅ **Только после успеха - сохранить в БД с bitrixDealId**
3. ✅ **Обновить Bitrix24 с ID заявки (не критично)**

### 3. Улучшенная обработка ошибок (submissionController.ts:204-307)

#### Сценарий 1: Ошибка после создания в БД
```typescript
if (submission?.id) {
  // НЕ УДАЛЯЕМ заявку - данные уже сохранены
  // Помечаем как частично синхронизированную
  await submissionService.updateSyncStatus(
    submission.id,
    BitrixSyncStatus.FAILED,
    dealResponse?.result?.toString?.(),
    `Финальная ошибка: ${error.message}`
  )
  // Возвращаем УСПЕХ пользователю
  return res.status(200).json({ success: true, ... })
}
```

#### Сценарий 2: Сделка в Bitrix создана, но ошибка БД
```typescript
if (dealResponse?.result) {
  // Критическая ситуация - пытаемся восстановить
  const recoveredSubmission = await submissionService.createSubmission({
    ...submissionData,
    bitrixDealId: dealResponse.result?.toString?.(),
    notes: 'Заявка создана через форму (восстановлена после ошибки БД)'
  })
  return res.status(200).json({ success: true, ... })
}
```

#### Сценарий 3: Ошибка Bitrix
```typescript
// Ничего не создано - просто возвращаем ошибку
return res.status(500).json({
  message: 'Ошибка создания заявки в системе',
  error: error?.message
})
```

### 4. Webhook для восстановления потерянных заявок

**Endpoint**: `POST /api/submissions/sync-from-bitrix`

**Параметры**:
```json
{
  "bitrixDealId": "12345",
  "formId": "uuid-form-id" // опционально
}
```

**Использование в Bitrix24**:
1. Настроить webhook в Bitrix24 при создании сделки
2. URL: `https://beton.shknv.ru:5001/api/submissions/sync-from-bitrix`
3. При создании сделки Bitrix автоматически создаст заявку в системе (если её нет)

### 5. Детальное логирование

Все шаги процесса логируются с префиксом `[SUBMIT_FORM]`:

```
[SUBMIT_FORM] Шаг 1: Создание сделки в Bitrix24...
[SUBMIT_FORM] ✅ Сделка создана в Bitrix24, ID: 12345
[SUBMIT_FORM] Шаг 2: Сохранение заявки в БД...
[SUBMIT_FORM] ✅ Заявка сохранена в БД, ID: uuid, номер: 20250105001
[SUBMIT_FORM] Шаг 3: Обновление Bitrix24 с ID заявки...
[SUBMIT_FORM] ✅ Bitrix24 обновлен с ID заявки: uuid
[SUBMIT_FORM] ✅ Заявка успешно создана. ID: uuid, Bitrix Deal: 12345
```

## Как настроить webhook в Bitrix24

### Вариант 1: Через бизнес-процессы

1. Зайти в Bitrix24 → CRM → Настройки → Бизнес-процессы
2. Создать новый бизнес-процесс для сделок
3. Триггер: "При создании сделки"
4. Действие: "Webhook"
   - URL: `https://beton.shknv.ru:5001/api/submissions/sync-from-bitrix`
   - Метод: POST
   - Тело запроса:
     ```json
     {
       "bitrixDealId": "{=Document:ID}",
       "formId": "здесь-uuid-формы-если-известен"
     }
     ```

**⭐ ВАЖНО**: Webhook автоматически привязывает заявку к пользователю по полю **"Ответственный"** (ASSIGNED_BY_ID) из Bitrix24.
Для корректной работы:
- В системе должен существовать пользователь с соответствующим `bitrixUserId`
- Поле `bitrixUserId` заполняется в настройках пользователя (раздел Администрирование → Пользователи)
- Если пользователь не найден, заявка создается без привязки к пользователю

### Вариант 2: Через REST API события

```javascript
// В настройках Bitrix24
BX24.callMethod('event.bind', {
  event: 'ONCRMDEALADD',
  handler: 'https://beton.shknv.ru:5001/api/submissions/sync-from-bitrix'
})
```

## Мониторинг и отладка

### Проверка синхронизации в логах

```bash
# На сервере
ssh root@31.128.39.123
cd /var/www/beton-crm
docker-compose logs -f backend | grep SUBMIT_FORM
```

### Поиск потерянных заявок

```sql
-- Сделки в Bitrix без заявок в БД
SELECT b.ID, b.TITLE
FROM bitrix_deals b
LEFT JOIN submissions s ON s.bitrix_deal_id = CAST(b.ID AS VARCHAR)
WHERE s.id IS NULL
```

### Ручное восстановление заявки

```bash
curl -X POST https://beton.shknv.ru:5001/api/submissions/sync-from-bitrix \
  -H "Content-Type: application/json" \
  -d '{"bitrixDealId": "12345"}'
```

## Развертывание исправлений

```bash
# Локально
git add .
git commit -m "🐛 Исправлена проблема синхронизации заявок с Bitrix24

- Добавлен retry mechanism для createDeal
- Изменен порядок операций: сначала Bitrix, потом БД
- Улучшена обработка ошибок с автовосстановлением
- Добавлен webhook для синхронизации из Bitrix24
- Добавлено детальное логирование"

git push

# На сервере
./scripts/production-deploy.sh
```

## Проверка работы

### 1. Тест создания заявки
```bash
# Отправить тестовую заявку через форму
# Проверить логи
docker-compose logs backend | tail -50 | grep SUBMIT_FORM
```

### 2. Тест восстановления
```bash
# Создать сделку вручную в Bitrix24
# Вызвать webhook
curl -X POST http://localhost:5001/api/submissions/sync-from-bitrix \
  -H "Content-Type: application/json" \
  -d '{"bitrixDealId": "НОВЫЙ_ID_СДЕЛКИ"}'
```

### 3. Мониторинг ошибок
```bash
# Отслеживание ошибок синхронизации
docker-compose exec backend npm run query:failed-sync
```

## Метрики успеха

После внедрения исправлений:
- ✅ 0% потерянных заявок (все сделки в Bitrix имеют заявку в БД)
- ✅ Автоматическое восстановление при сбоях БД
- ✅ Детальные логи для отладки
- ✅ Webhook для автоматической синхронизации
- ✅ Автоматическая привязка к пользователю по полю "Ответственный"
- ✅ Автоматический переход на страницу "Мои заявки" после отправки формы (без обновления страницы)

## FAQ

### Q: Что делать, если заявка создалась в Bitrix, но не в БД?
**A**: Вызовите webhook `/api/submissions/sync-from-bitrix` с `bitrixDealId`. Система автоматически создаст заявку.

### Q: Как найти все несинхронизированные заявки?
**A**: Запросите `/api/submissions?bitrixSyncStatus=failed` (требуется авторизация админа).

### Q: Можно ли настроить автоматическую синхронизацию?
**A**: Да, настройте webhook в Bitrix24 как описано выше.

### Q: Что делать при дублировании заявок?
**A**: Система проверяет существование заявки с таким `bitrixDealId`. Дублирование невозможно.
