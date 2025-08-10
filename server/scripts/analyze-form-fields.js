const { MongoClient } = require('mongodb')

// URI для локального Docker - правильная база
const LOCAL_DOCKER_URI = 'mongodb://localhost:27017/beton-crm'

async function analyzeFormFields() {
	const client = new MongoClient(LOCAL_DOCKER_URI)

	try {
		await client.connect()

		const db = client.db('beton-crm')

		// Получаем все формы
		const forms = await db.collection('forms').find({}).toArray()

		for (const form of forms) {

			// Получаем все поля этой формы
			const fields = await db
				.collection('formfields')
				.find({ formId: form._id })
				.sort({ order: 1 })
				.toArray()


			// Также получаем все поля (не привязанные к форме)
			const allFields = await db
				.collection('formfields')
				.find({})
				.sort({ order: 1 })
				.toArray()


			// Анализируем порядок полей
			const orders = allFields.map(f => f.order).sort((a, b) => a - b)
			const duplicateOrders = orders.filter(
				(item, index) => orders.indexOf(item) !== index
			)

			if (duplicateOrders.length > 0) {
					`⚠️  ДУБЛИРУЮЩИЕСЯ ПОРЯДКОВЫЕ НОМЕРА: ${duplicateOrders.join(', ')}`
				)
			}

			// Анализируем разделы
			const sections = {}
			const headerFields = allFields.filter(f => f.type === 'header')
			const regularFields = allFields.filter(f => f.type !== 'header')


			// Группируем поля по разделам
			for (const field of allFields) {
				const sectionOrder = Math.floor(field.order / 100) * 100
				if (!sections[sectionOrder]) {
					sections[sectionOrder] = []
				}
				sections[sectionOrder].push(field)
			}

			for (const [sectionOrder, sectionFields] of Object.entries(sections)) {
				const headerField = sectionFields.find(f => f.type === 'header')
				const nonHeaderFields = sectionFields.filter(f => f.type !== 'header')

				if (headerField) {
						`  📋 Заголовок: "${headerField.label}" (order: ${headerField.order})`
					)
				} else {
				}

				nonHeaderFields.forEach(f => {
				})
			}

			// Проверяем последовательность порядков
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
			} else {
			}

			// Показываем поля с одинаковыми order
			for (const order of duplicateOrders) {
				const duplicateFields = allFields.filter(f => f.order === order)
				duplicateFields.forEach(f => {
				})
			}
		}
	} catch (error) {
		console.error('Ошибка:', error)
	} finally {
		await client.close()
	}
}

// Функция для сохранения резервной копии
async function backupFormFields() {
	const client = new MongoClient(LOCAL_DOCKER_URI)

	try {
		await client.connect()
		const db = client.db('beton-crm')

		const forms = await db.collection('forms').find({}).toArray()
		const fields = await db.collection('formfields').find({}).toArray()

		const backup = {
			timestamp: new Date(),
			source: 'local-docker-beton-crm',
			forms: forms,
			fields: fields,
		}

		const fs = require('fs')
		const backupFile = `../backup-form-fields-${Date.now()}.json`
		fs.writeFileSync(backupFile, JSON.stringify(backup, null, 2))

		return backupFile
	} catch (error) {
		console.error('Ошибка создания резервной копии:', error)
	} finally {
		await client.close()
	}
}

// Функция для исправления порядка полей
async function fixFieldOrders() {
	const client = new MongoClient(LOCAL_DOCKER_URI)

	try {
		await client.connect()
		const db = client.db('beton-crm')

		const forms = await db.collection('forms').find({}).toArray()

		for (const form of forms) {

			const fields = await db
				.collection('formfields')
				.find({})
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
						updateCount++
					}
				}
			}

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
			await analyzeFormFields()
			break
		case 'backup':
			await backupFormFields()
			break
		case 'fix':
			await backupFormFields()
			await fixFieldOrders()
			await analyzeFormFields()
			break
		default:
				'  node analyze-form-fields.js analyze  - Анализ состояния полей'
			)
				'  node analyze-form-fields.js backup   - Создание резервной копии'
			)
				'  node analyze-form-fields.js fix      - Исправление порядка полей'
			)
	}
}

main().catch(console.error)
