const { MongoClient } = require('mongodb')

// Конфигурация для продакшн сервера
const PRODUCTION_URI = 'mongodb://localhost:27017/beton-crm-production'

async function analyzeProductionFormFields() {
	const client = new MongoClient(PRODUCTION_URI)

	try {
		await client.connect()
		console.log('Подключение к продакшн базе данных успешно')

		const db = client.db('beton-crm-production')

		// Получаем все формы
		const forms = await db.collection('forms').find({}).toArray()
		console.log(`Найдено форм: ${forms.length}`)

		for (const form of forms) {
			console.log(`\n=== ФОРМА: ${form.title} (ID: ${form._id}) ===`)

			// Получаем все поля этой формы
			const fields = await db
				.collection('formfields')
				.find({ formId: form._id })
				.sort({ order: 1 })
				.toArray()

			console.log(`Полей в форме: ${fields.length}`)

			// Анализируем порядок полей
			const orders = fields.map(f => f.order).sort((a, b) => a - b)
			const duplicateOrders = orders.filter(
				(item, index) => orders.indexOf(item) !== index
			)

			if (duplicateOrders.length > 0) {
				console.log(
					`⚠️  ДУБЛИРУЮЩИЕСЯ ПОРЯДКОВЫЕ НОМЕРА: ${duplicateOrders.join(', ')}`
				)
			}

			// Анализируем разделы
			const sections = {}
			const headerFields = fields.filter(f => f.type === 'header')
			const regularFields = fields.filter(f => f.type !== 'header')

			console.log(`Заголовков разделов: ${headerFields.length}`)
			console.log(`Обычных полей: ${regularFields.length}`)

			// Группируем поля по разделам
			for (const field of fields) {
				const sectionOrder = Math.floor(field.order / 100) * 100
				if (!sections[sectionOrder]) {
					sections[sectionOrder] = []
				}
				sections[sectionOrder].push(field)
			}

			console.log('\nСТРУКТУРА РАЗДЕЛОВ:')
			for (const [sectionOrder, sectionFields] of Object.entries(sections)) {
				const headerField = sectionFields.find(f => f.type === 'header')
				const nonHeaderFields = sectionFields.filter(f => f.type !== 'header')

				console.log(`\nРаздел ${sectionOrder}:`)
				if (headerField) {
					console.log(
						`  📋 Заголовок: "${headerField.label}" (order: ${headerField.order})`
					)
				} else {
					console.log(`  ⚠️  НЕТ ЗАГОЛОВКА!`)
				}

				console.log(`  📄 Полей: ${nonHeaderFields.length}`)
				nonHeaderFields.forEach(f => {
					console.log(`    - ${f.label} (order: ${f.order}, type: ${f.type})`)
				})
			}

			// Проверяем последовательность порядков
			console.log('\nПРОВЕРКА ПОСЛЕДОВАТЕЛЬНОСТИ:')
			const gaps = []
			for (let i = 1; i < orders.length; i++) {
				const diff = orders[i] - orders[i - 1]
				if (diff > 1) {
					gaps.push(
						`Пропуск между ${orders[i - 1]} и ${orders[i]} (разница: ${diff})`
					)
				}
			}

			if (gaps.length > 0) {
				console.log(`⚠️  ПРОПУСКИ В НУМЕРАЦИИ:`)
				gaps.forEach(gap => console.log(`    ${gap}`))
			} else {
				console.log(`✅ Нумерация последовательная`)
			}
		}
	} catch (error) {
		console.error('Ошибка:', error)
	} finally {
		await client.close()
	}
}

// Функция для сохранения резервной копии продакшн базы
async function backupProductionFormFields() {
	const client = new MongoClient(PRODUCTION_URI)

	try {
		await client.connect()
		const db = client.db('beton-crm-production')

		const forms = await db.collection('forms').find({}).toArray()
		const fields = await db.collection('formfields').find({}).toArray()

		const backup = {
			timestamp: new Date(),
			server: 'production',
			forms: forms,
			fields: fields,
		}

		const fs = require('fs')
		const backupFile = `production-backup-form-fields-${Date.now()}.json`
		fs.writeFileSync(backupFile, JSON.stringify(backup, null, 2))

		console.log(
			`✅ Резервная копия продакшн базы сохранена в файл: ${backupFile}`
		)
		return backupFile
	} catch (error) {
		console.error('Ошибка создания резервной копии:', error)
	} finally {
		await client.close()
	}
}

// Функция для исправления порядка полей в продакшн базе
async function fixProductionFieldOrders() {
	const client = new MongoClient(PRODUCTION_URI)

	try {
		await client.connect()
		const db = client.db('beton-crm-production')

		const forms = await db.collection('forms').find({}).toArray()

		for (const form of forms) {
			console.log(`\nИсправляем форму: ${form.title}`)

			const fields = await db
				.collection('formfields')
				.find({ formId: form._id })
				.sort({ order: 1 })
				.toArray()

			// Группируем поля по разделам (каждые 100)
			const sections = {}
			for (const field of fields) {
				const sectionNum = Math.floor(field.order / 100)
				if (!sections[sectionNum]) {
					sections[sectionNum] = []
				}
				sections[sectionNum].push(field)
			}

			let updateCount = 0

			// Пересчитываем порядок для каждого раздела
			for (const [sectionNum, sectionFields] of Object.entries(sections)) {
				const sortedFields = sectionFields.sort((a, b) => a.order - b.order)

				for (let i = 0; i < sortedFields.length; i++) {
					const field = sortedFields[i]
					const newOrder = parseInt(sectionNum) * 100 + i + 1

					if (field.order !== newOrder) {
						await db
							.collection('formfields')
							.updateOne({ _id: field._id }, { $set: { order: newOrder } })
						console.log(`  Поле "${field.label}": ${field.order} → ${newOrder}`)
						updateCount++
					}
				}
			}

			console.log(`Обновлено полей: ${updateCount}`)
		}
	} catch (error) {
		console.error('Ошибка исправления порядка:', error)
	} finally {
		await client.close()
	}
}

// Главная функция
async function main() {
	const action = process.argv[2]

	switch (action) {
		case 'analyze':
			await analyzeProductionFormFields()
			break
		case 'backup':
			await backupProductionFormFields()
			break
		case 'fix':
			console.log('Создаем резервную копию продакшн базы перед исправлением...')
			await backupProductionFormFields()
			console.log('\nНачинаем исправление...')
			await fixProductionFieldOrders()
			console.log('\nПроверяем результат...')
			await analyzeProductionFormFields()
			break
		default:
			console.log('Использование:')
			console.log(
				'  node analyze-production-db.js analyze  - Анализ состояния полей в продакшн'
			)
			console.log(
				'  node analyze-production-db.js backup   - Создание резервной копии продакшн'
			)
			console.log(
				'  node analyze-production-db.js fix      - Исправление порядка полей в продакшн'
			)
	}
}

main().catch(console.error)
