const { MongoClient } = require('mongodb')

/**
 * Скрипт для ручной проверки целостности базы данных
 * Использование: node scripts/validate-database.js [--fix]
 */

const DB_NAME = 'beton-crm-production'
const MONGO_URI = 'mongodb://localhost:27017'

async function validateDatabase() {

	const client = new MongoClient(MONGO_URI)

	try {
		await client.connect()
		const db = client.db(DB_NAME)

		// Статистика
		const formsCount = await db.collection('forms').countDocuments()
		const fieldsCount = await db.collection('formfields').countDocuments()
		const fieldsWithFormId = await db
			.collection('formfields')
			.countDocuments({ formId: { $exists: true } })
		const fieldsWithoutFormId = await db
			.collection('formfields')
			.countDocuments({ formId: { $exists: false } })


		// Проверки
		const issues = []

		// 1. Поля без formId
		if (fieldsWithoutFormId > 0) {
			issues.push(`❌ ${fieldsWithoutFormId} полей не привязаны к формам`)
		}

		// 2. Проверка связей
		const forms = await db.collection('forms').find({}).toArray()

		for (const form of forms) {
			const fieldsInForm = await db
				.collection('formfields')
				.countDocuments({ formId: form._id.toString() })

			if (fieldsInForm === 0) {
				issues.push(`⚠️ Форма "${form.title}" не имеет полей`)
			}
		}

		// 3. Проверка типов данных
		const sampleField = await db
			.collection('formfields')
			.findOne({ formId: { $exists: true } })
		if (sampleField) {
			const formIdType = typeof sampleField.formId

			if (formIdType !== 'string') {
				issues.push(`❌ formId хранится как ${formIdType}, ожидается string`)
			}
		}

		// Результат

		if (issues.length === 0) {
		} else {

			// Автоисправление если запрошено
			if (process.argv.includes('--fix')) {
				await autoFix(db, forms)
			} else {
					'\n💡 Для автоисправления запустите: node scripts/validate-database.js --fix'
				)
			}
		}
	} catch (error) {
	} finally {
		await client.close()
	}
}

async function autoFix(db, forms) {
	try {
		// Привязка полей без formId к первой форме
		const fieldsWithoutFormId = await db
			.collection('formfields')
			.find({ formId: { $exists: false } })
			.toArray()

		if (fieldsWithoutFormId.length > 0 && forms.length > 0) {
			const firstForm = forms[0]
			const result = await db
				.collection('formfields')
				.updateMany(
					{ formId: { $exists: false } },
					{ $set: { formId: firstForm._id.toString() } }
				)

				`✅ Привязано ${result.modifiedCount} полей к форме "${firstForm.title}"`
			)
		}

		// Проверка после исправления
		const fieldsWithoutFormIdAfter = await db
			.collection('formfields')
			.countDocuments({ formId: { $exists: false } })

		if (fieldsWithoutFormIdAfter === 0) {
		} else {
		}
	} catch (error) {
	}
}

// Запуск
