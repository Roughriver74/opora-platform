const { MongoClient } = require('mongodb')

async function analyzeFormFields() {
	const client = new MongoClient('mongodb://localhost:27017')

	try {
		await client.connect()

		const db = client.db('beton-crm-production')

		// Получаем все формы
		const forms = await db.collection('forms').find({}).toArray()

		for (const form of forms) {
			// Processing form

			// Получаем все поля этой формы
			const fields = await db
				.collection('formfields')
				.find({ formId: form._id })
				.sort({ order: 1 })
				.toArray()

			// Count fields in form

			// Анализируем порядок полей
			const orders = fields.map(f => f.order).sort((a, b) => a - b)
			const duplicateOrders = orders.filter(
				(item, index) => orders.indexOf(item) !== index
			)

			if (duplicateOrders.length > 0) {
				// Found duplicate orders
			}

			// Анализируем разделы
			const sections = {}
			const headerFields = fields.filter(f => f.type === 'header')
			const regularFields = fields.filter(f => f.type !== 'header')

			// Count header and regular fields

			// Группируем поля по разделам
			for (const field of fields) {
				const sectionOrder = Math.floor(field.order / 100) * 100
				if (!sections[sectionOrder]) {
					sections[sectionOrder] = []
				}
				sections[sectionOrder].push(field)
			}

			// Analyzing section structure
			for (const [sectionOrder, sectionFields] of Object.entries(sections)) {
				const headerField = sectionFields.find(f => f.type === 'header')
				const nonHeaderFields = sectionFields.filter(f => f.type !== 'header')

				// Process section fields
				if (headerField) {
					// Section has header
				} else {
					// Section missing header
				}

				// Process non-header fields
				nonHeaderFields.forEach(f => {
					// Field processing
				})
			}

			// Проверяем последовательность порядков
			// Checking order sequence
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
				// Found gaps in numbering
				gaps.forEach(gap => {
					// Gap in numbering
				})
			} else {
				// Numbering is sequential
			}
		}
	} catch (error) {
		// Error occurred
	} finally {
		await client.close()
	}
}

// Функция для сохранения резервной копии
async function backupFormFields() {
	const client = new MongoClient('mongodb://localhost:27017')

	try {
		await client.connect()
		const db = client.db('beton-crm-production')

		const forms = await db.collection('forms').find({}).toArray()
		const fields = await db.collection('formfields').find({}).toArray()

		const backup = {
			timestamp: new Date(),
			forms: forms,
			fields: fields,
		}

		const fs = require('fs')
		const backupFile = `backup-form-fields-${Date.now()}.json`
		fs.writeFileSync(backupFile, JSON.stringify(backup, null, 2))

		// Backup file saved
		return backupFile
	} catch (error) {
		// Error creating backup
	} finally {
		await client.close()
	}
}

// Функция для исправления порядка полей
async function fixFieldOrders() {
	const client = new MongoClient('mongodb://localhost:27017')

	try {
		await client.connect()
		const db = client.db('beton-crm-production')

		const forms = await db.collection('forms').find({}).toArray()

		for (const form of forms) {
			// Fixing form

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
						// Field order updated
						updateCount++
					}
				}
			}

			// Fields updated
		}
	} catch (error) {
		// Error fixing order
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
			// Creating backup before fixing
			await backupFormFields()
			// Starting fix
			await fixFieldOrders()
			// Checking result
			await analyzeFormFields()
			break
		default:
			// Show usage information
	}
}

main().catch(() => {})
