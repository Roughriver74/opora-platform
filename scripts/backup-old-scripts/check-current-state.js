const mongoose = require('mongoose')
const FormField = require('../server/src/models/FormField').default
const Form = require('../server/src/models/Form').default

mongoose.connect('mongodb://localhost:27017/beton-crm', {
	useNewUrlParser: true,
	useUnifiedTopology: true,
})

mongoose.connection.once('open', async () => {
	try {
		// Checking current state

		// Проверяем форму
		const form = await Form.findOne()
		if (!form) {
			process.exit(1)
		}

		// Form found and field count checked

		// Проверяем поля в базе
		const totalFields = await FormField.countDocuments()
		// Total fields in database

		// Проверяем привязанные поля
		const linkedFields = await FormField.countDocuments({
			_id: { $in: form.fields },
		})
		// Linked fields found

		// Проверяем порядок полей
		const fields = await FormField.find({ _id: { $in: form.fields } }).sort({
			order: 1,
		})

		// Analyzing field order
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
				// Process section
				sections[sectionOrder].forEach(field => {
					// Process field
				})
			})

		process.exit(0)
	} catch (error) {
		process.exit(1)
	}
})
