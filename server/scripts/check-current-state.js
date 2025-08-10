const mongoose = require('mongoose')
const FormField = require('../dist/models/FormField').default
const Form = require('../dist/models/Form').default

mongoose.connect('mongodb://localhost:27017/beton-crm', {
	useNewUrlParser: true,
	useUnifiedTopology: true,
})

mongoose.connection.once('open', async () => {
	try {

		// Проверяем форму
		const form = await Form.findOne()
		if (!form) {
			process.exit(1)
		}


		// Проверяем поля в базе
		const totalFields = await FormField.countDocuments()

		// Проверяем привязанные поля
		const linkedFields = await FormField.countDocuments({
			_id: { $in: form.fields },
		})

		// Проверяем порядок полей
		const fields = await FormField.find({ _id: { $in: form.fields } }).sort({
			order: 1,
		})

		const sections = {}
		fields.forEach(field => {
			const sectionOrder = Math.floor(field.order / 100) * 100
			if (!sections[sectionOrder]) {
				sections[sectionOrder] = []
			}
			sections[sectionOrder].push({
				id: field._id,
				name: field.name,
				type: field.type,
				order: field.order,
			})
		})

		Object.keys(sections)
			.sort((a, b) => a - b)
			.forEach(sectionOrder => {
				sections[sectionOrder].forEach(field => {
				})
			})

		process.exit(0)
	} catch (error) {
		console.error('❌ Ошибка:', error)
		process.exit(1)
	}
})
