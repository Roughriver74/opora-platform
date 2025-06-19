# Восстановление порядка полей формы

## Проблема

Обнаружены критические проблемы с порядком полей в базе данных:

- Множественные дублирующиеся порядковые номера
- 12 полей с `order=1`
- Дубли во всех разделах (100, 200, 300, 400)
- Поля не привязаны к форме

## Подключение к базе данных

### Локально (Docker)

```bash
# Подключение к MongoDB в Docker
mongosh "mongodb://localhost:27017"

# Выбор базы данных
use beton-crm

# Просмотр коллекций
show collections

# Количество полей
db.formfields.countDocuments()
```

### На продакшн сервере

```bash
# Подключение к серверу
ssh root@31.128.39.123

# Подключение к MongoDB на сервере
mongosh "mongodb://localhost:27017"

# Выбор продакшн базы
use beton-crm-production

# Просмотр полей
db.formfields.find().count()
```

## Скрипты для восстановления

### 1. Локальное исправление

```bash
cd server
node scripts/analyze-form-fields.js analyze  # Анализ проблем
node scripts/analyze-form-fields.js backup   # Создание резервной копии
node scripts/analyze-form-fields.js fix      # Исправление порядка
```

### 2. Продакшн исправление

**На сервере создать файл `/root/fix-production-fields.js`:**

```javascript
const { MongoClient } = require('mongodb')

async function fixProductionFields() {
	const client = new MongoClient('mongodb://localhost:27017')

	try {
		await client.connect()
		console.log('Подключение к продакшн базе успешно')

		const db = client.db('beton-crm-production')

		// Создание резервной копии
		const backup = {
			timestamp: new Date(),
			fields: await db.collection('formfields').find({}).toArray(),
			forms: await db.collection('forms').find({}).toArray(),
		}

		const fs = require('fs')
		fs.writeFileSync(
			`backup-production-${Date.now()}.json`,
			JSON.stringify(backup, null, 2)
		)
		console.log('Резервная копия создана')

		// Получаем все поля
		const fields = await db
			.collection('formfields')
			.find({})
			.sort({ order: 1 })
			.toArray()
		console.log(`Найдено полей: ${fields.length}`)

		// Группируем по разделам
		const sections = {}
		for (const field of fields) {
			const sectionNum = Math.floor(field.order / 100)
			if (!sections[sectionNum]) {
				sections[sectionNum] = []
			}
			sections[sectionNum].push(field)
		}

		let updateCount = 0

		// Пересчитываем порядок
		for (const [sectionNum, sectionFields] of Object.entries(sections)) {
			const sortedFields = sectionFields.sort((a, b) => {
				// Заголовки первыми
				if (a.type === 'header' && b.type !== 'header') return -1
				if (b.type === 'header' && a.type !== 'header') return 1
				return a.order - b.order
			})

			for (let i = 0; i < sortedFields.length; i++) {
				const field = sortedFields[i]
				const newOrder = parseInt(sectionNum) * 100 + i + 1

				if (field.order !== newOrder) {
					await db
						.collection('formfields')
						.updateOne({ _id: field._id }, { $set: { order: newOrder } })
					console.log(`${field.label}: ${field.order} → ${newOrder}`)
					updateCount++
				}
			}
		}

		console.log(`Обновлено полей: ${updateCount}`)
		console.log('Исправление завершено!')
	} catch (error) {
		console.error('Ошибка:', error)
	} finally {
		await client.close()
	}
}

fixProductionFields().catch(console.error)
```

**Запуск на сервере:**

```bash
cd /home/beton-crm/server
node /root/fix-production-fields.js
```

## Команды для подключения к MongoDB

### Подключение с авторизацией (если требуется)

```bash
# Если MongoDB требует авторизацию
mongosh "mongodb://username:password@localhost:27017/beton-crm-production"
```

### Просмотр данных

```javascript
// Показать все поля с порядком
db.formfields.find({}, { label: 1, type: 1, order: 1 }).sort({ order: 1 })

// Найти дубликаты порядка
db.formfields.aggregate([
	{
		$group: {
			_id: '$order',
			count: { $sum: 1 },
			docs: { $push: { id: '$_id', label: '$label' } },
		},
	},
	{ $match: { count: { $gt: 1 } } },
	{ $sort: { _id: 1 } },
])

// Количество полей по типам
db.formfields.aggregate([
	{ $group: { _id: '$type', count: { $sum: 1 } } },
	{ $sort: { count: -1 } },
])
```

## После исправления

1. Перезапустить сервер: `pm2 restart all`
2. Проверить форму в админке
3. Протестировать создание заявки
4. Проверить логи: `pm2 logs`

## Логи сервера

```bash
# Просмотр логов за определенное время
pm2 logs --lines 100 | grep "12:"
pm2 logs --lines 100 | grep "13:"

# Логи приложения
tail -f /home/beton-crm/server/logs/app.log

# Логи ошибок
tail -f /home/beton-crm/server/logs/error.log
```
