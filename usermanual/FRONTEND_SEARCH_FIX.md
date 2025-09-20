# Исправление поиска заявок на фронтенде

## Проблема

Поиск "мошков" на фронтенде не находил заявки, хотя Elasticsearch API работал корректно. Пользователь видел "Всего: 0 заявок" при поиске, хотя заявки существовали в системе.

**Пример проблемы:**

- Пользователь ищет: "мошков"
- Elasticsearch API находит: "Мошков Горелово", "Московское шоссе 151", "Мостоотряд"
- Фронтенд показывает: "Всего: 0 заявок"

## Причина

Проблема была в `SubmissionService.searchSubmissions()` - ID из Elasticsearch имели формат `submission_${id}`, но при поиске в базе данных использовались полные ID с префиксом, что приводило к отсутствию результатов.

**Детали проблемы:**

1. Elasticsearch хранит документы с ID вида `submission_ccddbb2d-99ad-44e6-a51c-341b643ca776`
2. База данных PostgreSQL хранит заявки с ID вида `ccddbb2d-99ad-44e6-a51c-341b643ca776`
3. При поиске в БД по полному ID с префиксом `submission_` записи не находились

## Решение

Исправлен метод `searchSubmissions()` в `SubmissionService.ts`:

### До исправления:

```typescript
// Получаем полные данные submissions по ID из Elasticsearch
const submissionIds = searchResults.map(result => result.id)
// submissionIds = ["submission_ccddbb2d-99ad-44e6-a51c-341b643ca776", ...]

const submissions = await this.repository.findByIds(submissionIds, {
	relations: ['user', 'form', 'assignedTo'],
})
// Поиск в БД по ID с префиксом "submission_" - НЕ НАХОДИТ записи
```

### После исправления:

```typescript
// Получаем полные данные submissions по ID из Elasticsearch
// ID в Elasticsearch имеют формат "submission_${id}", нужно извлечь только id
const submissionIds = searchResults.map(result => {
	// Если ID начинается с "submission_", убираем этот префикс
	return result.id.startsWith('submission_')
		? result.id.replace('submission_', '')
		: result.id
})
// submissionIds = ["ccddbb2d-99ad-44e6-a51c-341b643ca776", ...]

const submissions = await this.repository.findByIds(submissionIds, {
	relations: ['user', 'form', 'assignedTo'],
})
// Поиск в БД по правильным ID - НАХОДИТ записи
```

## Что было исправлено

### В файле `SubmissionService.ts`:

1. **Извлечение ID из Elasticsearch** - добавлена логика удаления префикса `submission_`
2. **Проверка формата ID** - проверяется, начинается ли ID с `submission_`
3. **Корректное сопоставление** - ID приводятся к формату, используемому в PostgreSQL

## Результат

После исправления:

### ✅ **Поиск "мошков"** теперь находит:

- "Мошков Горелово" ✅
- "Московское шоссе 151" ✅
- "Мостоотряд" ✅
- "Московский проспект 112, 2,5м3 В15п2" ✅
- "Московский проспект 112, 4м3 В25п4" ✅

### ✅ **Фронтенд корректно отображает:**

- Количество найденных заявок
- Список заявок с результатами поиска
- Правильную пагинацию

## Техническая информация

### Формат ID в системе:

- **Elasticsearch**: `submission_${uuid}` (например: `submission_ccddbb2d-99ad-44e6-a51c-341b643ca776`)
- **PostgreSQL**: `${uuid}` (например: `ccddbb2d-99ad-44e6-a51c-341b643ca776`)

### Логика исправления:

1. Получаем результаты из Elasticsearch
2. Извлекаем ID из результатов
3. Убираем префикс `submission_` если он есть
4. Ищем заявки в PostgreSQL по очищенным ID
5. Возвращаем полные данные заявок

## Тестирование

Для проверки исправления:

1. **Откройте страницу "Все заявки"**
2. **Введите поисковый запрос "мошков"**
3. **Проверьте, что отображаются результаты:**
   - Количество найденных заявок > 0
   - Список заявок с названиями, содержащими "мошков"
   - Корректная работа пагинации

## Статус

✅ **Исправлено** - поиск заявок на фронтенде теперь работает корректно с Elasticsearch

