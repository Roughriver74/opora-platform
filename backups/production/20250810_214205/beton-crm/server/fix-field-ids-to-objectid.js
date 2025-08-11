const { MongoClient, ObjectId } = require('mongodb')

async function fixFieldIdsToObjectId() {
	console.log('=== ПРЕОБРАЗОВАНИЕ ID ПОЛЕЙ В OBJECTID ===\n')

	const client = new MongoClient('mongodb://localhost:27017')

	try {
		await client.connect()
		const db = client.db('beton-crm-production')

		// Получаем форму
		const form = await db.collection('forms').findOne()
		console.log(`📋 Форма: "${form.title}"`)
		console.log(`📊 Массив fields содержит: ${form.fields.length} элементов`)
		console.log(`🔍 Тип первого элемента: ${typeof form.fields[0]}`)

		// Преобразуем все строковые ID в ObjectId
		const objectIdFields = form.fields
			.map(fieldId => {
				if (typeof fieldId === 'string') {
					try {
						return new ObjectId(fieldId)
					} catch (error) {
						console.log(`❌ Неверный ID: ${fieldId}`)
						return null
					}
				}
				return fieldId // уже ObjectId
			})
			.filter(id => id !== null)

		console.log(`🔄 Преобразовано: ${objectIdFields.length} валидных ObjectId`)

		// Проверяем, что поля существуют
		let validFields = 0
		for (const fieldId of objectIdFields.slice(0, 5)) {
			const field = await db.collection('formfields').findOne({ _id: fieldId })
			if (field) {
				validFields++
				console.log(`✅ Найдено поле: "${field.label}"`)
			}
		}

		if (validFields === 0) {
			console.log('❌ Не найдено ни одного поля! Проверьте данные.')
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

		if (updateResult.modifiedCount > 0) {
			console.log(`\n✅ Форма обновлена!`)
			console.log(`📊 Массив fields содержит ${objectIdFields.length} ObjectId`)

			console.log('\n🎉 ПРЕОБРАЗОВАНИЕ ЗАВЕРШЕНО!')
			console.log('\nРекомендации:')
			console.log('1. Перезапустите сервер: pm2 restart all')
			console.log('2. Проверьте API /forms - populate должен работать')
			console.log('3. Обновите редактор форм')
		} else {
			console.log('❌ Форма не была обновлена')
		}

		await client.close()
	} catch (error) {
		console.error('❌ Ошибка:', error)
		await client.close()
	}
}

fixFieldIdsToObjectId().catch(console.error)
