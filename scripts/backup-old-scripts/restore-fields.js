const mongoose = require('mongoose')
const fs = require('fs')

mongoose.connect('mongodb://localhost:27017/beton-crm-production')

const FormFieldSchema = new mongoose.Schema(
	{
		name: String,
		label: String,
		type: String,
		order: Number,
		formId: String,
		required: Boolean,
		bitrixFieldId: String,
		bitrixFieldType: String,
		options: Array,
		dynamicSource: Object,
		linkedFields: Object,
		placeholder: String,
	},
	{ timestamps: true }
)

const FormSchema = new mongoose.Schema(
	{
		name: String,
		title: String,
		description: String,
		isActive: Boolean,
		fields: [String],
		bitrixDealCategory: String,
		successMessage: String,
	},
	{ timestamps: true }
)

const FormField = mongoose.model('FormField', FormFieldSchema)
const Form = mongoose.model('Form', FormSchema)

async function restoreFromBackup() {
	try {

		// Читаем бэкап
		const backup = JSON.parse(
			fs.readFileSync('../backup-form-fields-1750258946011.json', 'utf8')
		)


		// Очищаем существующие данные
		await FormField.deleteMany({})
		await Form.deleteMany({})


		// Восстанавливаем поля

		const fieldsToInsert = backup.fields.map(field => ({
			...field,
			_id: new mongoose.Types.ObjectId(field._id),
			createdAt: new Date(field.createdAt),
			updatedAt: new Date(field.updatedAt),
		}))

		const insertedFields = await FormField.insertMany(fieldsToInsert)

		// Восстанавливаем формы

		const formsToInsert = backup.forms.map(form => ({
			...form,
			_id: new mongoose.Types.ObjectId(form._id),
			createdAt: new Date(form.createdAt),
			updatedAt: new Date(form.updatedAt),
		}))

		const insertedForms = await Form.insertMany(formsToInsert)

		// Проверяем связи

		for (const form of insertedForms) {

			let foundFields = 0
			for (const fieldId of form.fields) {
				const field = await FormField.findById(fieldId)
				if (field) {
					foundFields++
				}
			}


			if (foundFields === form.fields.length) {
			} else {
					`   ❌ Не найдено ${form.fields.length - foundFields} полей`
				)
			}
		}

	} catch (error) {
	} finally {
		await mongoose.disconnect()
	}
}

restoreFromBackup()
