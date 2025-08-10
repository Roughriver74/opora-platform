const { MongoClient } = require('mongodb')

async function checkFormFieldsConnection() {

	const client = new MongoClient('mongodb://localhost:27017')

	try {
		await client.connect()

		const db = client.db('beton-crm-production')

		// Получаем формы
		const forms = await db.collection('forms').find({}).toArray()

		for (const form of forms) {
				`Массив fields: ${form.fields ? form.fields.length : 0} элементов`
			)

			// Получаем поля с formId
			const fieldsWithFormId = await db
				.collection('formfields')
				.find({ formId: form._id })
				.toArray()

			// Получаем все поля без formId
			const fieldsWithoutFormId = await db
				.collection('formfields')
				.find({ formId: { $exists: false } })
				.toArray()


			if (fieldsWithoutFormId.length > 0) {
				fieldsWithoutFormId.slice(0, 5).forEach(field => {
						`  - "${field.label}" (order: ${field.order}, type: ${field.type})`
					)
				})


				// Привязываем все поля без formId к этой форме
				const updateResult = await db
					.collection('formfields')
					.updateMany(
						{ formId: { $exists: false } },
						{ $set: { formId: form._id } }
					)


				// Получаем ID всех полей для массива fields в форме
				const allFields = await db
					.collection('formfields')
					.find({ formId: form._id })
					.sort({ order: 1 })
					.toArray()

				const fieldIds = allFields.map(field => field._id)

				// Обновляем массив fields в форме
				await db
					.collection('forms')
					.updateOne({ _id: form._id }, { $set: { fields: fieldIds } })

					`✅ Обновлен массив fields в форме: ${fieldIds.length} полей`
				)
			}
		}

		// Финальная проверка
		const totalFields = await db.collection('formfields').countDocuments()
		const fieldsWithForm = await db
			.collection('formfields')
			.countDocuments({ formId: { $exists: true } })
		const fieldsWithoutForm = totalFields - fieldsWithForm


		if (fieldsWithoutForm === 0) {
		} else {
		}

	} catch (error) {
	} finally {
		await client.close()
	}
}

