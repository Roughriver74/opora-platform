const mongoose = require('mongoose')

const FormSchema = new mongoose.Schema(
	{
		name: String,
		title: String,
		fields: [{ type: mongoose.Schema.Types.ObjectId, ref: 'FormField' }],
	},
	{ timestamps: true }
)

const FormFieldSchema = new mongoose.Schema(
	{
		name: String,
		label: String,
		type: String,
		order: Number,
	},
	{ timestamps: true }
)

const Form = mongoose.model('Form', FormSchema)
const FormField = mongoose.model('FormField', FormFieldSchema)

;(async () => {
	console.log('=== ТЕСТ POPULATE ПОЛЕЙ ФОРМЫ ===\n')

	try {
		await mongoose.connect('mongodb://localhost:27017/beton-crm-production')
		console.log('✅ Подключение к базе данных успешно')

		// Тест без populate
		const formWithoutPopulate = await Form.findOne()
		console.log(
			`📋 Форма без populate: ${
				formWithoutPopulate.fields.length
			} полей (тип: ${typeof formWithoutPopulate.fields[0]})`
		)

		// Тест с populate
		const formWithPopulate = await Form.findOne().populate('fields')
		console.log(
			`📋 Форма с populate: ${
				formWithPopulate.fields.length
			} полей (тип: ${typeof formWithPopulate.fields[0]})`
		)

		if (formWithPopulate.fields && formWithPopulate.fields[0]) {
			const firstField = formWithPopulate.fields[0]
			if (firstField.label) {
				console.log(
					`✅ Первое поле: "${firstField.label}" (order: ${firstField.order})`
				)
				console.log('🎉 POPULATE РАБОТАЕТ!')
			} else {
				console.log('❌ Первое поле не содержит label - populate не работает')
			}
		} else {
			console.log('❌ Нет полей после populate')
		}

		mongoose.disconnect()
	} catch (error) {
		console.error('❌ Ошибка:', error)
		mongoose.disconnect()
	}
})()
