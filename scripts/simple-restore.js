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
		console.log('=== ПРОСТОЕ ВОССТАНОВЛЕНИЕ ===\n')

		// Читаем бэкап
		const backup = JSON.parse(
			fs.readFileSync('./backup-form-fields-1750258946011.json', 'utf8')
		)

		console.log('📄 Бэкап содержит:')
		console.log(`   Форм: ${backup.forms.length}`)
		console.log(`   Полей: ${backup.fields.length}`)

		// Очищаем существующие данные
		console.log('\n🧹 Очистка...')
		await FormField.deleteMany({})
		await Form.deleteMany({})

		// Восстанавливаем поля (без timestamps)
		console.log('\n📝 Восстановление полей...')

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

		console.log(`✅ Восстановлено ${backup.fields.length} полей`)

		// Восстанавливаем формы (без timestamps)
		console.log('\n📋 Восстановление форм...')

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

		console.log(`✅ Восстановлено ${backup.forms.length} форм`)

		// Проверяем связи
		console.log('\n🔗 Проверка связей...')

		const forms = await Form.find()
		for (const form of forms) {
			console.log(`\n📋 Форма: ${form.title}`)
			console.log(`   ID полей в форме: ${form.fields.length}`)

			let foundFields = 0
			for (const fieldId of form.fields) {
				const field = await FormField.findById(fieldId)
				if (field) {
					foundFields++
				}
			}

			console.log(`   Найдено в базе: ${foundFields}`)

			if (foundFields === form.fields.length) {
				console.log('   ✅ Все поля найдены')
			} else {
				console.log(
					`   ❌ Не найдено ${form.fields.length - foundFields} полей`
				)
			}
		}

		console.log('\n🎉 Восстановление завершено!')
	} catch (error) {
		console.error('❌ Ошибка:', error)
	} finally {
		await mongoose.disconnect()
		console.log('\n🔌 Отключено')
	}
}

simpleRestore()
