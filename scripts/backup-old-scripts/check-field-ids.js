const { MongoClient, ObjectId } = require('mongodb')

async function checkFieldIds() {

	const client = new MongoClient('mongodb://localhost:27017')

	try {
		await client.connect()
		const db = client.db('beton-crm-production')

		// Получаем форму
		const form = await db.collection('forms').findOne()
		const firstFieldId = form.fields[0]


		// Проверяем поиск как строка
		const fieldAsString = await db
			.collection('formfields')
			.findOne({ _id: firstFieldId })

		// Проверяем поиск как ObjectId
		const fieldAsObjectId = await db
			.collection('formfields')
			.findOne({ _id: new ObjectId(firstFieldId) })

		if (fieldAsObjectId) {
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
			}
		}

			`\n📊 Из первых 10 ID: ${validIds} валидных, ${invalidIds} невалидных`
		)

		await client.close()
	} catch (error) {
		await client.close()
	}
}

