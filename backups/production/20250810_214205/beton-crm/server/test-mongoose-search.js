const FormField = require('./dist/models/FormField.js').default
const Form = require('./dist/models/Form.js').default
const mongoose = require('mongoose')

;(async () => {
	try {
		await mongoose.connect('mongodb://localhost:27017/beton-crm-production')
		console.log('✅ Подключен к MongoDB')

		const form = await Form.findOne()
		console.log(`📋 Форма найдена: "${form.title}"`)
		console.log(`🔍 ID формы: ${form._id} (тип: ${typeof form._id})`)

		// Тест 1: как делаем сейчас в контроллере
		const fields1 = await FormField.find({ formId: form._id.toString() })
		console.log(`📊 Тест 1 (toString): ${fields1.length} полей`)

		// Тест 2: как ObjectId
		const fields2 = await FormField.find({ formId: form._id })
		console.log(`📊 Тест 2 (ObjectId): ${fields2.length} полей`)

		// Тест 3: проверяем первое поле
		if (fields1.length > 0) {
			console.log(
				`📝 Первое поле: "${fields1[0].label}" (order: ${fields1[0].order})`
			)
		} else if (fields2.length > 0) {
			console.log(
				`📝 Первое поле: "${fields2[0].label}" (order: ${fields2[0].order})`
			)
		} else {
			// Проверим что вообще есть в базе
			const allFields = await FormField.find({}).limit(3)
			console.log(`❌ Поля не найдены! Примеры из базы:`)
			allFields.forEach(field => {
				console.log(
					`   "${field.label}" - formId: ${
						field.formId
					} (тип: ${typeof field.formId})`
				)
			})
		}

		mongoose.disconnect()
	} catch (error) {
		console.error('❌ Ошибка:', error)
		mongoose.disconnect()
	}
})()
