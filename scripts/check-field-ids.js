const { MongoClient, ObjectId } = require('mongodb')

async function checkFieldIds() {
	console.log('=== ПРОВЕРКА СООТВЕТСТВИЯ ID ПОЛЕЙ ===\n')

	const client = new MongoClient('mongodb://localhost:27017')

	try {
		await client.connect()
		const db = client.db('beton-crm-production')

		// Получаем форму
		const form = await db.collection('forms').findOne()
		const firstFieldId = form.fields[0]

		console.log('🔍 Первый ID поля в форме:', firstFieldId)
		console.log('📊 Тип ID:', typeof firstFieldId)
		console.log('📏 Длина ID:', firstFieldId.length)

		// Проверяем поиск как строка
		const fieldAsString = await db
			.collection('formfields')
			.findOne({ _id: firstFieldId })
		console.log('🔍 Поле найдено (как строка):', !!fieldAsString)

		// Проверяем поиск как ObjectId
		const fieldAsObjectId = await db
			.collection('formfields')
			.findOne({ _id: new ObjectId(firstFieldId) })
		console.log('🔍 Поле найдено (как ObjectId):', !!fieldAsObjectId)

		if (fieldAsObjectId) {
			console.log('✅ Поле найдено:', fieldAsObjectId.label)
		}

		// Проверяем все ID в форме
		let validIds = 0
		let invalidIds = 0

		for (const fieldId of form.fields.slice(0, 10)) {
			// проверяем первые 10
			const field = await db
				.collection('formfields')
				.findOne({ _id: new ObjectId(fieldId) })
			if (field) {
				validIds++
			} else {
				invalidIds++
				console.log('❌ Не найдено поле с ID:', fieldId)
			}
		}

		console.log(
			`\n📊 Из первых 10 ID: ${validIds} валидных, ${invalidIds} невалидных`
		)

		await client.close()
	} catch (error) {
		console.error('❌ Ошибка:', error)
		await client.close()
	}
}

checkFieldIds().catch(console.error)
