const { MongoClient, ObjectId } = require('mongodb')

;(async () => {
	const client = new MongoClient('mongodb://localhost:27017')
	await client.connect()
	const db = client.db('beton-crm-production')

	// Проверяем первое поле более детально
	const field = await db.collection('formfields').findOne()
	console.log('🔍 Поле из базы:')
	console.log(`  formId: ${field.formId} (тип: ${typeof field.formId})`)
	console.log(`  _id: ${field._id} (тип: ${typeof field._id})`)
	console.log(
		`  formId instanceof ObjectId: ${field.formId instanceof ObjectId}`
	)

	const form = await db.collection('forms').findOne()
	console.log('\n📋 Форма из базы:')
	console.log(`  _id: ${form._id} (тип: ${typeof form._id})`)
	console.log(`  _id instanceof ObjectId: ${form._id instanceof ObjectId}`)

	console.log('\n🔄 Сравнение:')
	console.log(`  field.formId === form._id: ${field.formId === form._id}`)
	console.log(
		`  field.formId.toString() === form._id.toString(): ${
			field.formId.toString() === form._id.toString()
		}`
	)

	// Тестируем поиск разными способами
	console.log('\n🔍 Тест поиска в базе данных:')

	// 1. Прямой поиск как есть
	const test1 = await db
		.collection('formfields')
		.countDocuments({ formId: form._id })
	console.log(`  Поиск formId: form._id (${form._id}): ${test1} полей`)

	// 2. Поиск по строке
	const test2 = await db
		.collection('formfields')
		.countDocuments({ formId: form._id.toString() })
	console.log(`  Поиск formId: form._id.toString(): ${test2} полей`)

	// 3. Поиск через новый ObjectId
	const test3 = await db
		.collection('formfields')
		.countDocuments({ formId: new ObjectId(form._id) })
	console.log(`  Поиск formId: new ObjectId(form._id): ${test3} полей`)

	// 4. Проверим что именно хранится в formId
	const sampleField = await db
		.collection('formfields')
		.findOne({}, { projection: { formId: 1, label: 1 } })
	console.log(`\n📝 Пример поля:`, sampleField)

	await client.close()
})()
