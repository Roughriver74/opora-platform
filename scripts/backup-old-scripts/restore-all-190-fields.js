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

async function restoreAll190Fields() {
	try {
		console.log('=== ВОССТАНОВЛЕНИЕ ВСЕХ 190 ПОЛЕЙ ===\n')

		// Читаем ПЕРВЫЙ бэкап (более полный)
		const backup = JSON.parse(
			fs.readFileSync('./backup-form-fields-1750258907838.json', 'utf8')
		)

		console.log('📄 Бэкап содержит:')
		console.log(`   Форм: ${backup.forms.length}`)
		console.log(`   Полей: ${backup.fields.length}`)

		// Показываем текущее состояние
		const currentFields = await FormField.find()
		console.log(`\n📝 Текущее состояние: ${currentFields.length} полей в базе`)

		// Анализируем поля с Битрикс интеграцией в бэкапе
		const bitrixFields = backup.fields.filter(
			field =>
				field.bitrixFieldId &&
				field.bitrixFieldId.trim() !== '' &&
				field.bitrixFieldId !== 'undefined' &&
				field.bitrixFieldId !== null
		)

		const structureFields = backup.fields.filter(
			field => field.type === 'header' || field.type === 'divider'
		)

		console.log('\n📊 АНАЛИЗ БЭКАПА:')
		console.log(`🔗 Поля с Битрикс интеграцией: ${bitrixFields.length}`)
		console.log(`📋 Структурные поля: ${structureFields.length}`)

		console.log('\n🔗 БИТРИКС ПОЛЯ В БЭКАПЕ:')
		bitrixFields.slice(0, 10).forEach(field => {
			console.log(`   ${field.label} → ${field.bitrixFieldId}`)
		})
		if (bitrixFields.length > 10) {
			console.log(`   ... и ещё ${bitrixFields.length - 10} полей`)
		}

		// Команда для восстановления
		if (process.argv[2] === 'restore-all') {
			console.log('\n🔧 ПОЛНОЕ ВОССТАНОВЛЕНИЕ...')

			// Очищаем текущие данные
			await FormField.deleteMany({})
			await Form.deleteMany({})
			console.log('✅ Очистили текущие данные')

			// Восстанавливаем ВСЕ поля из бэкапа
			for (const field of backup.fields) {
				try {
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
				} catch (error) {
					console.log(
						`⚠️  Ошибка восстановления поля ${field.label}: ${error.message}`
					)
				}
			}

			console.log(`✅ Восстановлено ${backup.fields.length} полей`)

			// Восстанавливаем формы
			for (const form of backup.forms) {
				const newForm = {
					_id: new mongoose.Types.ObjectId(form._id),
					name: form.name,
					title: 'Заявка', // Правильное название
					description: form.description,
					isActive: form.isActive,
					fields: form.fields, // ВСЕ 190 полей
					bitrixDealCategory: form.bitrixDealCategory,
					successMessage: form.successMessage,
				}

				await Form.create(newForm)
			}

			console.log(`✅ Восстановлено ${backup.forms.length} форм`)

			// Проверяем результат
			const restoredFields = await FormField.find()
			const restoredForms = await Form.find()

			console.log('\n📊 РЕЗУЛЬТАТ ВОССТАНОВЛЕНИЯ:')
			console.log(`📝 Полей в базе: ${restoredFields.length}`)
			if (restoredForms.length > 0) {
				console.log(`📋 Полей в форме: ${restoredForms[0].fields.length}`)
			}
		} else if (process.argv[2] === 'filter-bitrix') {
			console.log('\n🔧 ФИЛЬТРАЦИЯ ТОЛЬКО БИТРИКС ПОЛЕЙ...')

			// Находим поля с Битрикс интеграцией + структурные
			const fieldsToKeep = [...bitrixFields, ...structureFields]
			const fieldsToKeepIds = fieldsToKeep.map(f => f._id)

			// Удаляем ненужные поля
			const fieldsToDelete = backup.fields.filter(
				f => !fieldsToKeepIds.includes(f._id)
			)
			console.log(
				`🗑️  Будет удалено ${fieldsToDelete.length} полей без Битрикс интеграции`
			)

			// Очищаем и восстанавливаем только нужные
			await FormField.deleteMany({})
			await Form.deleteMany({})

			for (const field of fieldsToKeep) {
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

			// Создаем форму только с нужными полями
			const form = backup.forms[0]
			const newForm = {
				_id: new mongoose.Types.ObjectId(form._id),
				name: form.name,
				title: 'Заявка',
				description: form.description,
				isActive: form.isActive,
				fields: fieldsToKeepIds,
				bitrixDealCategory: form.bitrixDealCategory,
				successMessage: form.successMessage,
			}

			await Form.create(newForm)

			console.log(
				`✅ Сохранено ${fieldsToKeep.length} полей с Битрикс интеграцией`
			)
		} else {
			console.log('\n💡 КОМАНДЫ:')
			console.log(
				'   node restore-all-190-fields.js restore-all - восстановить ВСЕ 190 полей'
			)
			console.log(
				'   node restore-all-190-fields.js filter-bitrix - только поля с Битрикс интеграцией'
			)
		}
	} catch (error) {
		console.error('❌ Ошибка:', error)
	} finally {
		await mongoose.disconnect()
		console.log('\n🔌 Отключено')
	}
}

restoreAll190Fields()
