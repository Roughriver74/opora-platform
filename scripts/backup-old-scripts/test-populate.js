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
	try {
		await mongoose.connect('mongodb://localhost:27017/beton-crm-production')

		// Тест без populate
		const formWithoutPopulate = await Form.findOne()

		// Тест с populate
		const formWithPopulate = await Form.findOne().populate('fields')

		if (formWithPopulate.fields && formWithPopulate.fields[0]) {
			const firstField = formWithPopulate.fields[0]
			if (firstField.label) {
				// Populate works
			} else {
				// Populate doesn't work
			}
		} else {
			// No fields after populate
		}

		mongoose.disconnect()
	} catch (error) {
		mongoose.disconnect()
	}
})()
