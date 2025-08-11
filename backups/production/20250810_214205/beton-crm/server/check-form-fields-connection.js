const { MongoClient } = require('mongodb')

async function checkFormFieldsConnection() {
	console.log('=== ПРОВЕРКА СВЯЗИ ПОЛЕЙ С ФОРМОЙ ===\n')

	const client = new MongoClient('mongodb://localhost:27017')

	try {
		await client.connect()
		console.log('✅ Подключение к продакшн базе успешно')

		const db = client.db('beton-crm-production')

		// Получаем формы
		const forms = await db.collection('forms').find({}).toArray()
		console.log(`📋 Найдено форм: ${forms.length}`)

		for (const form of forms) {
			console.log(`\nФорма: "${form.title}" (ID: ${form._id})`)
			console.log(
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

			console.log(`Полей с formId: ${fieldsWithFormId.length}`)
			console.log(`Полей без formId: ${fieldsWithoutFormId.length}`)

			if (fieldsWithoutFormId.length > 0) {
				console.log('\n⚠️  ПРОБЛЕМА: Найдены поля без привязки к форме!')
				console.log('Примеры полей без formId:')
				fieldsWithoutFormId.slice(0, 5).forEach(field => {
					console.log(
						`  - "${field.label}" (order: ${field.order}, type: ${field.type})`
					)
				})

				console.log('\n🔧 РЕШЕНИЕ: Привязываем все поля к форме...')

				// Привязываем все поля без formId к этой форме
				const updateResult = await db
					.collection('formfields')
					.updateMany(
						{ formId: { $exists: false } },
						{ $set: { formId: form._id } }
					)

				console.log(`✅ Обновлено полей: ${updateResult.modifiedCount}`)

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

				console.log(
					`✅ Обновлен массив fields в форме: ${fieldIds.length} полей`
				)
			}
		}

		// Финальная проверка
		console.log('\n🔍 Финальная проверка...')
		const totalFields = await db.collection('formfields').countDocuments()
		const fieldsWithForm = await db
			.collection('formfields')
			.countDocuments({ formId: { $exists: true } })
		const fieldsWithoutForm = totalFields - fieldsWithForm

		console.log(`Всего полей: ${totalFields}`)
		console.log(`Полей с формой: ${fieldsWithForm}`)
		console.log(`Полей без формы: ${fieldsWithoutForm}`)

		if (fieldsWithoutForm === 0) {
			console.log('\n🎉 ВСЕ ПОЛЯ КОРРЕКТНО ПРИВЯЗАНЫ К ФОРМЕ!')
		} else {
			console.log('\n⚠️  Остались поля без привязки к форме')
		}

		console.log('\nРекомендации:')
		console.log('1. Перезапустите сервер: pm2 restart all')
		console.log('2. Проверьте форму в админке')
		console.log('3. Убедитесь, что поля отображаются')
	} catch (error) {
		console.error('❌ Ошибка:', error)
	} finally {
		await client.close()
	}
}

checkFormFieldsConnection().catch(console.error)
