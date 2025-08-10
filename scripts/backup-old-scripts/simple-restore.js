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

async function simpleRestore() {
	try {

		// Читаем бэкап
		const backup = JSON.parse(
			fs.readFileSync('./backup-form-fields-1750258946011.json', 'utf8')
		)


		// Очищаем существующие данные
		await FormField.deleteMany({})
		await Form.deleteMany({})

		// Восстанавливаем поля (без timestamps)

		for (const field of backup.fields) {
			const newField = {
				_id: new mongoose.Types.ObjectId(field._id),
				name: field.name,
				label: field.label,
				type: field.type,
				order: field.order,
				formId: field.formId,
				required: field.required,
				bitrixFieldId: field.bitrixFieldId,
				bitrixFieldType: field.bitrixFieldType,
				options: field.options || [],
				dynamicSource: field.dynamicSource || {},
				linkedFields: field.linkedFields || {},
				placeholder: field.placeholder,
			}

			await FormField.create(newField)
		}


		// Восстанавливаем формы (без timestamps)

		for (const form of backup.forms) {
			const newForm = {
				_id: new mongoose.Types.ObjectId(form._id),
				name: form.name,
				title: form.title,
				description: form.description,
				isActive: form.isActive,
				fields: form.fields,
				bitrixDealCategory: form.bitrixDealCategory,
				successMessage: form.successMessage,
			}

			await Form.create(newForm)
		}


		// Проверяем связи

		const forms = await Form.find()
		for (const form of forms) {

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

simpleRestore()
