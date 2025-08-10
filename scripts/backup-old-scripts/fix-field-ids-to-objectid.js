const { MongoClient, ObjectId } = require('mongodb')

async function fixFieldIdsToObjectId() {
	const client = new MongoClient('mongodb://localhost:27017')

	try {
		await client.connect()
		const db = client.db('beton-crm-production')

		// Получаем форму
		const form = await db.collection('forms').findOne()

		// Преобразуем все строковые ID в ObjectId
		const objectIdFields = form.fields
			.map(fieldId => {
				if (typeof fieldId === 'string') {
					try {
						return new ObjectId(fieldId)
					} catch (error) {
						return null
					}
				}
				return fieldId // уже ObjectId
			})
			.filter(id => id !== null)

		// Проверяем, что поля существуют
		let validFields = 0
		for (const fieldId of objectIdFields.slice(0, 5)) {
			const field = await db.collection('formfields').findOne({ _id: fieldId })
			if (field) {
				validFields++
			}
		}

		if (validFields === 0) {
			return
		}

		// Обновляем форму с ObjectId
		const updateResult = await db.collection('forms').updateOne(
			{ _id: form._id },
			{
				$set: {
					fields: objectIdFields,
					updatedAt: new Date(),
				},
			}
		)

		await client.close()
	} catch (error) {
		await client.close()
	}
}

fixFieldIdsToObjectId().catch(() => {})
