const { MongoClient } = require('mongodb')

/**
 * Скрипт для ручной проверки целостности базы данных
 * Использование: node scripts/validate-database.js [--fix]
 */

const DB_NAME = 'beton-crm-production'
const MONGO_URI = 'mongodb://localhost:27017'

async function validateDatabase() {
	console.log('🔍 === ВАЛИДАЦИЯ БАЗЫ ДАННЫХ ===\n')

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

		console.log('📊 Статистика:')
		console.log(`   Форм: ${formsCount}`)
		console.log(`   Полей: ${fieldsCount}`)
		console.log(`   Полей с formId: ${fieldsWithFormId}`)
		console.log(`   Полей без formId: ${fieldsWithoutFormId}\n`)

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
			console.log(`📋 Форма "${form.title}": ${fieldsInForm} полей`)

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
			console.log(`\n🔍 Тип formId в базе: ${formIdType}`)

			if (formIdType !== 'string') {
				issues.push(`❌ formId хранится как ${formIdType}, ожидается string`)
			}
		}

		// Результат
		console.log('\n📋 === РЕЗУЛЬТАТ ПРОВЕРКИ ===')

		if (issues.length === 0) {
			console.log('✅ Все проверки пройдены успешно!')
		} else {
			console.log('❌ Обнаружены проблемы:')
			issues.forEach(issue => console.log(`   ${issue}`))

			// Автоисправление если запрошено
			if (process.argv.includes('--fix')) {
				console.log('\n🔧 === АВТОИСПРАВЛЕНИЕ ===')
				await autoFix(db, forms)
			} else {
				console.log(
					'\n💡 Для автоисправления запустите: node scripts/validate-database.js --fix'
				)
			}
		}
	} catch (error) {
		console.error('❌ Ошибка:', error)
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

			console.log(
				`✅ Привязано ${result.modifiedCount} полей к форме "${firstForm.title}"`
			)
		}

		// Проверка после исправления
		console.log('\n🔍 Повторная проверка...')
		const fieldsWithoutFormIdAfter = await db
			.collection('formfields')
			.countDocuments({ formId: { $exists: false } })

		if (fieldsWithoutFormIdAfter === 0) {
			console.log('✅ Все поля теперь привязаны к формам!')
		} else {
			console.log(`⚠️ Осталось ${fieldsWithoutFormIdAfter} полей без формы`)
		}
	} catch (error) {
		console.error('❌ Ошибка автоисправления:', error)
	}
}

// Запуск
validateDatabase().catch(console.error)
