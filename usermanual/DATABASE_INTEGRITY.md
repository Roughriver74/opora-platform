# Руководство по целостности базы данных

## 🎯 Цель документа

Предотвращение проблем с целостностью данных между формами и полями в системе Beton CRM.

## ❌ Проблема которую решаем

**Исходная проблема:** Поля формы исчезали из админки из-за несоответствия типов данных между схемой Mongoose (`ObjectId`) и реальными данными в MongoDB (`string`).

## ✅ Внедренные решения

### 1. Автоматическая валидация при запуске сервера

Файл: `server/src/utils/databaseValidation.ts`

При каждом запуске сервера автоматически:

- ✅ Проверяется целостность связей между формами и полями
- ✅ Выявляются поля без формы (`formId`)
- ✅ Проверяются типы данных
- ✅ Автоматически исправляются найденные проблемы

### 2. Строгая типизация

Файл: `server/src/types/database.ts`

- ✅ Все ID в базе данных теперь строго типизированы как `string`
- ✅ Утилиты для безопасной работы с ID
- ✅ Константы валидации

### 3. API для диагностики

Эндпоинты для администраторов:

```bash
# Проверка состояния БД
GET /api/diagnostic/database

# Автоисправление проблем
POST /api/diagnostic/fix-database

# Общее состояние системы
GET /api/diagnostic/health
```

### 4. Ручная валидация

Скрипт: `scripts/validate-database.js`

```bash
# Только проверка
node scripts/validate-database.js

# Проверка с автоисправлением
node scripts/validate-database.js --fix
```

## 🔧 Как использовать

### Ежедневная проверка (рекомендуется)

```bash
# На сервере
cd /var/www/beton-crm/server
node scripts/validate-database.js
```

### При возникновении проблем

1. **Первым делом проверяем API диагностики:**

   ```bash
   curl https://beton.shknv.ru/api/diagnostic/health
   ```

2. **Если есть проблемы, автоисправление:**

   ```bash
   curl -X POST https://beton.shknv.ru/api/diagnostic/fix-database \
        -H "Authorization: Bearer YOUR_TOKEN"
   ```

3. **Ручная проверка на сервере:**
   ```bash
   ssh root@31.128.39.123
   cd /var/www/beton-crm/server
   node scripts/validate-database.js --fix
   ```

## 🚨 Признаки проблем

Следите за этими симптомами:

- ❌ В админке не отображаются поля формы
- ❌ API возвращает `"fields": []`
- ❌ В логах ошибки поиска полей
- ❌ Новые поля не сохраняются

## 🛡️ Профилактика

### 1. Регулярные проверки

Добавьте в cron на сервере:

```bash
# Проверка каждый день в 2:00
0 2 * * * cd /var/www/beton-crm/server && node scripts/validate-database.js >> /var/log/db-validation.log 2>&1
```

### 2. Мониторинг в коде

При создании новых полей всегда используйте:

```typescript
import { DatabaseIdUtils } from '../types/database'

// Правильно
const formId = DatabaseIdUtils.toString(form._id)
await FormField.create({ ...fieldData, formId })

// Неправильно
await FormField.create({ ...fieldData, formId: form._id })
```

### 3. Тестирование связей

Перед деплоем:

```bash
# Тест на локальной машине
npm run test:database-integrity

# Тест на сервере после деплоя
node scripts/validate-database.js
```

## 📊 Метрики качества

Система считается здоровой если:

- ✅ Все поля имеют валидный `formId`
- ✅ Все `formId` ссылаются на существующие формы
- ✅ Каждая форма имеет хотя бы одно поле
- ✅ Все `formId` хранятся как строки

## 🔍 Логи и отладка

Полезные команды для диагностики:

```bash
# Статистика базы данных
pm2 logs beton-crm | grep "📊 Статистика"

# Ошибки поиска полей
pm2 logs beton-crm | grep "Найдено полей: 0"

# Проблемы валидации
pm2 logs beton-crm | grep "❌"
```

## ⚙️ Технические детали

### Основные изменения в коде:

1. **FormField модель:** `formId` изменен с `ObjectId` на `String`
2. **Контроллеры:** Удален `.toString()` из поисковых запросов
3. **Валидация:** Добавлена автоматическая проверка при запуске
4. **Типизация:** Строгие типы для всех связей

### Файлы которые изменились:

- `server/src/models/FormField.ts` - тип `formId`
- `server/src/controllers/formController.ts` - поиск полей
- `server/src/index.ts` - валидация при запуске
- `server/src/utils/databaseValidation.ts` - новый файл
- `server/src/types/database.ts` - новый файл
- `server/src/routes/diagnosticRoutes.ts` - новый файл

## 🎯 Результат

После внедрения всех мер:

- ✅ **0 потерянных полей** - проблема не может повториться
- ✅ **Автоматическое восстановление** при возникновении проблем
- ✅ **Проактивный мониторинг** состояния базы данных
- ✅ **Простые инструменты диагностики** для команды

---

**Важно:** Эти меры гарантируют, что проблема с исчезающими полями больше не повторится!
