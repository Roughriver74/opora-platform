const mongoose = require('mongoose')
const FormField = require('../dist/models/FormField').default
const Form = require('../dist/models/Form').default

mongoose.connect('mongodb://localhost:27017/beton-crm', {
	useNewUrlParser: true,
	useUnifiedTopology: true,
})

mongoose.connection.once('open', async () => {
	try {
		console.log('=== Тест создания нового раздела ===')

		// Получаем форму
		const form = await Form.findOne()
		if (!form) {
			console.log('❌ Форма не найдена!')
			process.exit(1)
		}

		console.log('✅ Форма найдена:', form.title)

		// Создаем новый раздел
		const newSection = new FormField({
			name: `test_section_${Date.now()}`,
			label: 'Тестовый раздел',
			type: 'header',
			order: 600,
			formId: form._id,
			required: false,
			header: {
				label: 'Тестовый раздел',
				level: 2,
			},
		})

		console.log('🔨 Создание раздела...')
		const savedSection = await newSection.save()
		console.log('✅ Раздел создан:', savedSection._id)

		// Добавляем раздел в форму
		await Form.findByIdAndUpdate(form._id, {
			$push: { fields: savedSection._id },
		})
		console.log('✅ Раздел добавлен в форму')

		// Создаем поле в этом разделе
		const newField = new FormField({
			name: `test_field_${Date.now()}`,
			label: 'Тестовое поле',
			type: 'text',
			order: 601,
			formId: form._id,
			required: false,
		})

		console.log('🔨 Создание поля...')
		const savedField = await newField.save()
		console.log('✅ Поле создано:', savedField._id)

		// Добавляем поле в форму
		await Form.findByIdAndUpdate(form._id, {
			$push: { fields: savedField._id },
		})
		console.log('✅ Поле добавлено в форму')

		// Проверяем результат
		const updatedForm = await Form.findById(form._id)
		console.log('📋 Количество полей в форме:', updatedForm.fields.length)

		// Проверяем новые поля
		const newFields = await FormField.find({
			_id: { $in: [savedSection._id, savedField._id] },
		}).sort({ order: 1 })

		console.log('\n📊 Созданные поля:')
		newFields.forEach(field => {
			console.log(
				`  ${field.order}: ${field.name} (${field.type}) - ${field.label}`
			)
		})

		console.log('\n✅ Тест создания завершен успешно!')

		// Удаляем тестовые поля
		console.log('\n🗑️ Удаление тестовых полей...')
		await FormField.deleteMany({
			_id: { $in: [savedSection._id, savedField._id] },
		})

		await Form.findByIdAndUpdate(form._id, {
			$pull: { fields: { $in: [savedSection._id, savedField._id] } },
		})

		console.log('✅ Тестовые поля удалены')

		process.exit(0)
	} catch (error) {
		console.error('❌ Ошибка:', error)
		process.exit(1)
	}
})
