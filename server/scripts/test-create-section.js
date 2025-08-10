const mongoose = require('mongoose')
const FormField = require('../dist/models/FormField').default
const Form = require('../dist/models/Form').default

mongoose.connect('mongodb://localhost:27017/beton-crm', {
	useNewUrlParser: true,
	useUnifiedTopology: true,
})

mongoose.connection.once('open', async () => {
	try {

		// Получаем форму
		const form = await Form.findOne()
		if (!form) {
			process.exit(1)
		}


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

		const savedSection = await newSection.save()

		// Добавляем раздел в форму
		await Form.findByIdAndUpdate(form._id, {
			$push: { fields: savedSection._id },
		})

		// Создаем поле в этом разделе
		const newField = new FormField({
			name: `test_field_${Date.now()}`,
			label: 'Тестовое поле',
			type: 'text',
			order: 601,
			formId: form._id,
			required: false,
		})

		const savedField = await newField.save()

		// Добавляем поле в форму
		await Form.findByIdAndUpdate(form._id, {
			$push: { fields: savedField._id },
		})

		// Проверяем результат
		const updatedForm = await Form.findById(form._id)

		// Проверяем новые поля
		const newFields = await FormField.find({
			_id: { $in: [savedSection._id, savedField._id] },
		}).sort({ order: 1 })

		newFields.forEach(field => {
				`  ${field.order}: ${field.name} (${field.type}) - ${field.label}`
			)
		})


		// Удаляем тестовые поля
		await FormField.deleteMany({
			_id: { $in: [savedSection._id, savedField._id] },
		})

		await Form.findByIdAndUpdate(form._id, {
			$pull: { fields: { $in: [savedSection._id, savedField._id] } },
		})


		process.exit(0)
	} catch (error) {
		console.error('❌ Ошибка:', error)
		process.exit(1)
	}
})
