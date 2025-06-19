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
		console.log('=== ВОССТАНОВЛЕНИЕ ИЗ БЭКАПА ===\n')

		// Читаем бэкап
		const backup = JSON.parse(
			fs.readFileSync('../backup-form-fields-1750258946011.json', 'utf8')
		)

		console.log('📄 Бэкап содержит:')
		console.log(`   Форм: ${backup.forms.length}`)
		console.log(`   Полей: ${backup.fields.length}`)

		// Очищаем существующие данные
		console.log('\n🧹 Очистка существующих данных...')
		await FormField.deleteMany({})
		await Form.deleteMany({})

		console.log('✅ Очистка завершена')

		// Восстанавливаем поля
		console.log('\n📝 Восстановление полей...')

		const fieldsToInsert = backup.fields.map(field => ({
			...field,
			_id: new mongoose.Types.ObjectId(field._id),
			createdAt: new Date(field.createdAt),
			updatedAt: new Date(field.updatedAt),
		}))

		const insertedFields = await FormField.insertMany(fieldsToInsert)
		console.log(`✅ Восстановлено ${insertedFields.length} полей`)

		// Восстанавливаем формы
		console.log('\n📋 Восстановление форм...')

		const formsToInsert = backup.forms.map(form => ({
			...form,
			_id: new mongoose.Types.ObjectId(form._id),
			createdAt: new Date(form.createdAt),
			updatedAt: new Date(form.updatedAt),
		}))

		const insertedForms = await Form.insertMany(formsToInsert)
		console.log(`✅ Восстановлено ${insertedForms.length} форм`)

		// Проверяем связи
		console.log('\n🔗 Проверка связей...')

		for (const form of insertedForms) {
			console.log(`\n📋 Форма: ${form.title}`)
			console.log(`   Полей в форме: ${form.fields.length}`)

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
		console.error('❌ Ошибка восстановления:', error)
	} finally {
		await mongoose.disconnect()
		console.log('\n🔌 Отключено от MongoDB')
	}
}

restoreFromBackup()
