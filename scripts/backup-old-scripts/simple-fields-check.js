const mongoose = require('mongoose')

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

async function main() {
	try {

		const forms = await Form.find()

		for (const form of forms) {
		}

		const allFields = await FormField.find()

		if (forms.length > 0) {
			const mainForm = forms[0]

			// Поля которые есть в форме но нет в базе
			let missingFields = []
			if (mainForm.fields) {
				for (const fieldId of mainForm.fields) {
					const field = await FormField.findById(fieldId)
					if (!field) {
						missingFields.push(fieldId)
					}
				}
			}

			// Поля которые есть в базе но не привязаны к форме
			let orphanedFields = []
			for (const field of allFields) {
				if (
					!mainForm.fields ||
					!mainForm.fields.includes(field._id.toString())
				) {
					orphanedFields.push(field)
				}
			}

			if (missingFields.length > 0) {
			}

				'🚫 Поля в базе НО НЕ привязаны к форме:',
				orphanedFields.length
			)
			if (orphanedFields.length > 0) {
				orphanedFields.slice(0, 10).forEach(field => {
						`   - ${field.label} (${field.name}) Order: ${field.order}`
					)
				})
				if (orphanedFields.length > 10) {
				}
			}

			if (missingFields.length > 0) {
			}
			if (orphanedFields.length > 0) {
			}

			// Команда для исправления
			if (process.argv[2] === 'fix') {

				// Удаляем ссылки на несуществующие поля
				if (missingFields.length > 0) {
					const validFields = mainForm.fields.filter(
						fieldId => !missingFields.includes(fieldId)
					)
					await Form.findByIdAndUpdate(mainForm._id, { fields: validFields })
						`✅ Удалено ${missingFields.length} битых ссылок из формы`
					)
				}

				// Удаляем отвязанные поля из базы
				if (orphanedFields.length > 0) {
					const orphanedIds = orphanedFields.map(field => field._id)
					const result = await FormField.deleteMany({
						_id: { $in: orphanedIds },
					})
						`✅ Удалено ${result.deletedCount} отвязанных полей из базы`
					)
				}

			}
		}
	} catch (error) {
	} finally {
		await mongoose.disconnect()
	}
}

main()
