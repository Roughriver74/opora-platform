const { MongoClient } = require('mongodb')

async function fixFormFieldsArray() {
	console.log('=== ИСПРАВЛЕНИЕ МАССИВА FIELDS В ФОРМЕ ===\n')

	const client = new MongoClient('mongodb://localhost:27017')

	try {
		await client.connect()
		console.log('✅ Подключение к продакшн базе успешно')

		const db = client.db('beton-crm-production')

		// Получаем форму
		const form = await db.collection('forms').findOne()
		console.log(`📋 Форма найдена: "${form.title}" (ID: ${form._id})`)
		console.log(
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

		console.log(`🔍 Найдено полей с formId: ${fieldsWithFormId.length}`)

		if (fieldsWithFormId.length === 0) {
			console.log('❌ Нет полей с правильным formId!')
			return
		}

		// Создаем массив ID полей
		const fieldIds = fieldsWithFormId.map(field => field._id)

		console.log('📝 Первые 5 ID полей:')
		fieldIds.slice(0, 5).forEach((id, index) => {
			const field = fieldsWithFormId[index]
			console.log(
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
			console.log(`\n✅ Массив fields в форме обновлен!`)
			console.log(`📊 Добавлено полей в форму: ${fieldIds.length}`)

			// Проверяем результат
			const updatedForm = await db
				.collection('forms')
				.findOne({ _id: form._id })
			console.log(
				`🔍 Проверка: форма теперь содержит ${updatedForm.fields.length} полей`
			)

			console.log('\n🎉 ИСПРАВЛЕНИЕ ЗАВЕРШЕНО УСПЕШНО!')
			console.log('\nРекомендации:')
			console.log('1. Перезапустите сервер: pm2 restart all')
			console.log('2. Обновите страницу редактора форм')
			console.log('3. Все поля должны теперь отображаться')
		} else {
			console.log('❌ Форма не была обновлена')
		}
	} catch (error) {
		console.error('❌ Ошибка:', error)
	} finally {
		await client.close()
	}
}

fixFormFieldsArray().catch(console.error)
