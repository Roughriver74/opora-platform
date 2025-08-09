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

async function filterBitrixFields() {
	try {
		console.log('=== ФИЛЬТРАЦИЯ БИТРИКС ПОЛЕЙ ===\n')

		const allFields = await FormField.find()
		console.log(`📝 Всего полей в базе: ${allFields.length}`)

		// Находим поля с Битрикс интеграцией
		const bitrixFields = allFields.filter(
			field =>
				field.bitrixFieldId &&
				field.bitrixFieldId.trim() !== '' &&
				field.bitrixFieldId !== 'undefined'
		)

		// Находим заголовки и разделители (они нужны для структуры)
		const structureFields = allFields.filter(
			field => field.type === 'header' || field.type === 'divider'
		)

		// Объединяем нужные поля
		const fieldsToKeep = [...bitrixFields, ...structureFields]

		console.log('\n📊 АНАЛИЗ ПОЛЕЙ:')
		console.log(`🔗 Поля с Битрикс интеграцией: ${bitrixFields.length}`)
		console.log(
			`📋 Структурные поля (заголовки/разделители): ${structureFields.length}`
		)
		console.log(`✅ Всего полей для сохранения: ${fieldsToKeep.length}`)
		console.log(
			`🗑️  Полей для удаления: ${allFields.length - fieldsToKeep.length}`
		)

		console.log('\n🔗 ПОЛЯ С БИТРИКС ИНТЕГРАЦИЕЙ:')
		bitrixFields.forEach(field => {
			console.log(`   ${field.order}: ${field.label} → ${field.bitrixFieldId}`)
		})

		console.log('\n📋 СТРУКТУРНЫЕ ПОЛЯ:')
		structureFields.forEach(field => {
			console.log(`   ${field.order}: ${field.label} (${field.type})`)
		})

		// Команда для выполнения фильтрации
		if (process.argv[2] === 'execute') {
			console.log('\n🔧 ВЫПОЛНЕНИЕ ФИЛЬТРАЦИИ...')

			// Получаем ID полей для сохранения
			const fieldsToKeepIds = fieldsToKeep.map(field => field._id.toString())

			// Удаляем ненужные поля
			const fieldsToDeleteIds = allFields
				.filter(field => !fieldsToKeepIds.includes(field._id.toString()))
				.map(field => field._id)

			if (fieldsToDeleteIds.length > 0) {
				const deleteResult = await FormField.deleteMany({
					_id: { $in: fieldsToDeleteIds },
				})
				console.log(`✅ Удалено ${deleteResult.deletedCount} ненужных полей`)
			}

			// Обновляем форму - привязываем только нужные поля
			const forms = await Form.find()
			if (forms.length > 0) {
				const mainForm = forms[0]

				// Сортируем поля по порядку
				const sortedFields = fieldsToKeep
					.sort((a, b) => (a.order || 0) - (b.order || 0))
					.map(field => field._id.toString())

				await Form.findByIdAndUpdate(mainForm._id, {
					fields: sortedFields,
					title: 'Заявка', // Устанавливаем правильное название
				})

				console.log(
					`✅ Обновлена форма "${mainForm.title}" - привязано ${sortedFields.length} полей`
				)
			}

			console.log('\n🎉 Фильтрация завершена!')

			// Финальная проверка
			const remainingFields = await FormField.find()
			const finalForms = await Form.find()

			console.log('\n📊 ФИНАЛЬНЫЙ РЕЗУЛЬТАТ:')
			console.log(`📝 Полей в базе: ${remainingFields.length}`)
			if (finalForms.length > 0) {
				console.log(`📋 Полей в форме: ${finalForms[0].fields.length}`)
			}
		} else {
			console.log('\n💡 Для выполнения фильтрации запустите:')
			console.log('   node filter-bitrix-fields.js execute')
		}
	} catch (error) {
		console.error('❌ Ошибка:', error)
	} finally {
		await mongoose.disconnect()
		console.log('\n🔌 Отключено')
	}
}

filterBitrixFields()
