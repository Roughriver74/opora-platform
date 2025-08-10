const { MongoClient } = require('mongodb')

async function fixFormFieldsArray() {

	const client = new MongoClient('mongodb://localhost:27017')

	try {
		await client.connect()

		const db = client.db('beton-crm-production')

		// Получаем форму
		const form = await db.collection('forms').findOne()
			`📊 Текущий массив fields: ${
				form.fields ? form.fields.length : 0
			} элементов`
		)

		// Получаем все поля с этим formId
		const fieldsWithFormId = await db
			.collection('formfields')
			.find({ formId: form._id })
			.sort({ order: 1 })
			.toArray()


		if (fieldsWithFormId.length === 0) {
			return
		}

		// Создаем массив ID полей
		const fieldIds = fieldsWithFormId.map(field => field._id)

		fieldIds.slice(0, 5).forEach((id, index) => {
			const field = fieldsWithFormId[index]
				`  ${index + 1}. ${id} - "${field.label}" (order: ${field.order})`
			)
		})

		// Обновляем форму
		const updateResult = await db.collection('forms').updateOne(
			{ _id: form._id },
			{
				$set: {
					fields: fieldIds,
					updatedAt: new Date(),
				},
			}
		)

		if (updateResult.modifiedCount > 0) {

			// Проверяем результат
			const updatedForm = await db
				.collection('forms')
				.findOne({ _id: form._id })
				`🔍 Проверка: форма теперь содержит ${updatedForm.fields.length} полей`
			)

		} else {
		}
	} catch (error) {
	} finally {
		await client.close()
	}
}

