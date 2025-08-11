const { MongoClient, ObjectId } = require('mongodb')

async function diagnoseFormIdIssue() {
	console.log('=== ДИАГНОСТИКА ПРОБЛЕМЫ С FORMID ===\n')

	const client = new MongoClient('mongodb://localhost:27017')

	try {
		await client.connect()
		const db = client.db('beton-crm-production')

		// 1. Получаем форму
		const form = await db.collection('forms').findOne()
		console.log('🔍 Форма найдена:')
		console.log(`  ID: ${form._id} (тип: ${typeof form._id})`)
		console.log(`  Название: ${form.title}`)

		// 2. Проверяем первые несколько полей
		const sampleFields = await db
			.collection('formfields')
			.find({})
			.limit(5)
			.toArray()
		console.log(
			`\n📊 Пример полей из базы (всего найдено: ${sampleFields.length}):`
		)

		sampleFields.forEach((field, index) => {
			console.log(`  ${index + 1}. label: "${field.label}"`)
			console.log(`     formId: ${field.formId} (тип: ${typeof field.formId})`)
			console.log(`     _id: ${field._id} (тип: ${typeof field._id})`)
			console.log(`     order: ${field.order}`)
			console.log()
		})

		// 3. Различные варианты поиска
		console.log('🔍 Тестируем разные варианты поиска:')

		// Как ObjectId
		const byObjectId = await db.collection('formfields').countDocuments({
			formId: form._id,
		})
		console.log(`  По ObjectId (${form._id}): ${byObjectId} полей`)

		// Как строка
		const byString = await db.collection('formfields').countDocuments({
			formId: form._id.toString(),
		})
		console.log(`  По строке (${form._id.toString()}): ${byString} полей`)

		// Как новый ObjectId
		const byNewObjectId = await db.collection('formfields').countDocuments({
			formId: new ObjectId(form._id),
		})
		console.log(`  По новому ObjectId: ${byNewObjectId} полей`)

		// Все поля с formId
		const withFormId = await db.collection('formfields').countDocuments({
			formId: { $exists: true },
		})
		console.log(`  Всего полей с formId: ${withFormId}`)

		// Все поля без formId
		const withoutFormId = await db.collection('formfields').countDocuments({
			formId: { $exists: false },
		})
		console.log(`  Всего полей без formId: ${withoutFormId}`)

		// 4. Проверяем конкретное поле
		if (sampleFields.length > 0) {
			const firstField = sampleFields[0]
			console.log(`\n🔍 Детали первого поля:`)
			console.log(`  formId === form._id: ${firstField.formId === form._id}`)
			console.log(
				`  formId.toString() === form._id.toString(): ${
					firstField.formId?.toString() === form._id.toString()
				}`
			)
		}

		await client.close()
	} catch (error) {
		console.error('❌ Ошибка:', error)
		await client.close()
	}
}

diagnoseFormIdIssue().catch(console.error)
