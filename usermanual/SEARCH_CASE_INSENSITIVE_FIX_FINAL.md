# Окончательное исправление поиска без учета регистра

## Проблема

Пользователь вводил "мошков" с маленькой буквы, но система не находила "Мошков" с большой буквы. Это происходило из-за того, что в `SubmissionRepository.ts` использовался `LIKE` вместо `ILIKE` для поиска в PostgreSQL.

## Найденные проблемы

### 1. ✅ Elasticsearch сервис - УЖЕ ИСПРАВЛЕН

- Все поисковые запросы используют `.toLowerCase()`
- Match phrase, match, multi-match, wildcard запросы все приводят запрос к нижнему регистру
- Функция `normalizeQuery()` также приводит запрос к нижнему регистру

### 2. ✅ OptimizedSubmissionService - УЖЕ ИСПРАВЛЕН

- Использует `ILIKE` для регистро-независимого поиска в PostgreSQL

### 3. ✅ UserRepository - УЖЕ ИСПРАВЛЕН

- Использует `LOWER()` функцию для регистро-независимого поиска

### 4. ❌ SubmissionRepository - БЫЛА ПРОБЛЕМА

- Использовал `LIKE` вместо `ILIKE` для поиска
- **ИСПРАВЛЕНО**: Заменен `LIKE` на `ILIKE`

## Что было исправлено

### В файле `SubmissionRepository.ts`:

**ДО:**

```typescript
if (filters.search) {
	queryBuilder.andWhere(
		'(submission.submissionNumber LIKE :search OR ' +
			'submission.title LIKE :search OR ' +
			'submission.userEmail LIKE :search OR ' +
			'submission.userName LIKE :search)',
		{ search: `%${filters.search}%` }
	)
}
```

**ПОСЛЕ:**

```typescript
if (filters.search) {
	queryBuilder.andWhere(
		'(submission.submissionNumber ILIKE :search OR ' +
			'submission.title ILIKE :search OR ' +
			'submission.userEmail ILIKE :search OR ' +
			'submission.userName ILIKE :search)',
		{ search: `%${filters.search}%` }
	)
}
```

## Результат

Теперь поиск работает без учета регистра во всех компонентах системы:

1. **Elasticsearch поиск** - использует `.toLowerCase()` для всех запросов
2. **PostgreSQL поиск** - использует `ILIKE` для регистро-независимого поиска
3. **Пользовательский поиск** - использует `LOWER()` функцию

## Тестирование

Для проверки исправления:

1. **Введите поисковый запрос с маленькой буквы** (например, "мошков")
2. **Проверьте, что находятся заявки** с названиями в любом регистре
3. **Попробуйте разные варианты регистра** для одного и того же слова

## Статус

✅ **ПОЛНОСТЬЮ ИСПРАВЛЕНО** - поиск теперь работает без учета регистра во всех компонентах системы

## Техническая информация

### Разница между LIKE и ILIKE в PostgreSQL:

- `LIKE` - регистро-зависимый поиск
- `ILIKE` - регистро-независимый поиск (аналог `LOWER()` функции)

### Где используется поиск:

1. **SubmissionRepository** - основной поиск по заявкам (исправлен)
2. **OptimizedSubmissionService** - оптимизированный поиск (уже был исправлен)
3. **ElasticsearchService** - полнотекстовый поиск (уже был исправлен)
4. **UserRepository** - поиск пользователей (уже был исправлен)

