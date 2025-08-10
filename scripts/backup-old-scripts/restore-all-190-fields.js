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

		// Читаем ПЕРВЫЙ бэкап (более полный)
		const backup = JSON.parse(
			fs.readFileSync('./backup-form-fields-1750258907838.json', 'utf8')
		)


		// Показываем текущее состояние
		const currentFields = await FormField.find()

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


		bitrixFields.slice(0, 10).forEach(field => {
		})
		if (bitrixFields.length > 10) {
		}

		// Команда для восстановления
		if (process.argv[2] === 'restore-all') {

			// Очищаем текущие данные
			await FormField.deleteMany({})
			await Form.deleteMany({})

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
						`⚠️  Ошибка восстановления поля ${field.label}: ${error.message}`
					)
				}
			}


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


			// Проверяем результат
			const restoredFields = await FormField.find()
			const restoredForms = await Form.find()

			if (restoredForms.length > 0) {
			}
		} else if (process.argv[2] === 'filter-bitrix') {

			// Находим поля с Битрикс интеграцией + структурные
			const fieldsToKeep = [...bitrixFields, ...structureFields]
			const fieldsToKeepIds = fieldsToKeep.map(f => f._id)

			// Удаляем ненужные поля
			const fieldsToDelete = backup.fields.filter(
				f => !fieldsToKeepIds.includes(f._id)
			)
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

				`✅ Сохранено ${fieldsToKeep.length} полей с Битрикс интеграцией`
			)
		} else {
				'   node restore-all-190-fields.js restore-all - восстановить ВСЕ 190 полей'
			)
				'   node restore-all-190-fields.js filter-bitrix - только поля с Битрикс интеграцией'
			)
		}
	} catch (error) {
	} finally {
		await mongoose.disconnect()
	}
}

restoreAll190Fields()
