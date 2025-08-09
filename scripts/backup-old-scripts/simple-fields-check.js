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
		console.log('=== ДИАГНОСТИКА ПОЛЕЙ ===\n')

		const forms = await Form.find()
		console.log('📋 Найдено форм:', forms.length)

		for (const form of forms) {
			console.log('\n🔍 Форма:', form.title, 'ID:', form._id)
			console.log('   Поля в форме:', form.fields ? form.fields.length : 0)
		}

		const allFields = await FormField.find()
		console.log('\n📝 Всего полей в базе:', allFields.length)

		if (forms.length > 0) {
			const mainForm = forms[0]
			console.log('\n🔗 Анализ связей для формы:', mainForm.title)

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

			console.log('❌ Поля в форме НО НЕТ в базе:', missingFields.length)
			if (missingFields.length > 0) {
				console.log('   Отсутствующие ID:', missingFields)
			}

			console.log(
				'🚫 Поля в базе НО НЕ привязаны к форме:',
				orphanedFields.length
			)
			if (orphanedFields.length > 0) {
				console.log('   Отвязанные поля:')
				orphanedFields.slice(0, 10).forEach(field => {
					console.log(
						`   - ${field.label} (${field.name}) Order: ${field.order}`
					)
				})
				if (orphanedFields.length > 10) {
					console.log(`   ... и ещё ${orphanedFields.length - 10} полей`)
				}
			}

			console.log('\n💡 РЕКОМЕНДАЦИИ:')
			if (missingFields.length > 0) {
				console.log('1. Удалить ссылки на несуществующие поля из формы')
			}
			if (orphanedFields.length > 0) {
				console.log('2. Удалить отвязанные поля из базы (они не используются)')
			}

			// Команда для исправления
			if (process.argv[2] === 'fix') {
				console.log('\n🔧 ИСПРАВЛЕНИЕ...')

				// Удаляем ссылки на несуществующие поля
				if (missingFields.length > 0) {
					const validFields = mainForm.fields.filter(
						fieldId => !missingFields.includes(fieldId)
					)
					await Form.findByIdAndUpdate(mainForm._id, { fields: validFields })
					console.log(
						`✅ Удалено ${missingFields.length} битых ссылок из формы`
					)
				}

				// Удаляем отвязанные поля из базы
				if (orphanedFields.length > 0) {
					const orphanedIds = orphanedFields.map(field => field._id)
					const result = await FormField.deleteMany({
						_id: { $in: orphanedIds },
					})
					console.log(
						`✅ Удалено ${result.deletedCount} отвязанных полей из базы`
					)
				}

				console.log('\n🎉 Исправление завершено!')
			}
		}
	} catch (error) {
		console.error('❌ Ошибка:', error)
	} finally {
		await mongoose.disconnect()
		console.log('\n🔌 Отключено от MongoDB')
	}
}

main()
