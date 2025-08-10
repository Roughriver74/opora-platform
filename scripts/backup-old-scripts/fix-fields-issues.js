const mongoose = require('mongoose')

// Подключение к базе данных
mongoose.connect('mongodb://31.128.39.123:27017/beton-crm-production')

// Схемы
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

async function diagnoseFieldsIssues() {

	try {
		// 1. Проверяем все формы
		const forms = await Form.find()

		for (const form of forms) {

			if (form.fields && form.fields.length > 0) {
					`   ID полей в форме:`,
					form.fields.slice(0, 5),
					form.fields.length > 5 ? '...' : ''
				)
			}
		}

		// 2. Проверяем все поля в базе
		const allFields = await FormField.find()

		// 3. Проверяем несоответствия
		let orphanedFields = []
		let missingFields = []

		if (forms.length > 0) {
			const mainForm = forms[0] // Берем первую форму

			// Поля, которые есть в форме, но нет в базе
			if (mainForm.fields) {
				for (const fieldId of mainForm.fields) {
					const field = await FormField.findById(fieldId)
					if (!field) {
						missingFields.push(fieldId)
					}
				}
			}

			// Поля, которые есть в базе, но не привязаны к форме
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

				`🚫 Поля в базе, но НЕ привязаны к форме: ${orphanedFields.length}`
			)
			if (orphanedFields.length > 0) {
				orphanedFields.forEach(field => {
						`   - ${field.label} (${field.name}) - Order: ${field.order}`
					)
				})
			}
		}

		// 4. Анализ порядка полей
		const fieldsByOrder = allFields.sort(
			(a, b) => (a.order || 0) - (b.order || 0)
		)

		let hasOrderIssues = false
		fieldsByOrder.forEach((field, index) => {
			if (index < 10) {
				// Показываем первые 10
					`   ${field.order || 'NO_ORDER'}: ${field.label} (${field.type})`
				)
			}

			// Проверяем проблемы с порядком
			if (!field.order || field.order <= 0) {
				hasOrderIssues = true
			}
		})

		if (hasOrderIssues) {
		}

		return {
			forms,
			allFields,
			orphanedFields,
			missingFields,
			hasOrderIssues,
		}
	} catch (error) {
		throw error
	}
}

async function fixFieldsIssues(options = {}) {

	const diagnosis = await diagnoseFieldsIssues()
	const { forms, allFields, orphanedFields, missingFields } = diagnosis

	if (forms.length === 0) {
		return
	}

	const mainForm = forms[0]

	// 1. Удаляем из формы несуществующие поля
	if (missingFields.length > 0 && options.removeMissingFields) {
			`🔧 Удаляем ${missingFields.length} несуществующих полей из формы...`
		)

		const validFields = mainForm.fields.filter(
			fieldId => !missingFields.includes(fieldId)
		)
		await Form.findByIdAndUpdate(mainForm._id, { fields: validFields })

	}

	// 2. Привязываем отвязанные поля к форме
	if (orphanedFields.length > 0 && options.attachOrphanedFields) {
			`🔗 Привязываем ${orphanedFields.length} отвязанных полей к форме...`
		)

		const orphanedIds = orphanedFields.map(field => field._id.toString())
		const currentFields = mainForm.fields || []
		const newFields = [...currentFields, ...orphanedIds]

		await Form.findByIdAndUpdate(mainForm._id, { fields: newFields })

	}

	// 3. Исправляем порядок полей
	if (diagnosis.hasOrderIssues && options.fixOrder) {

		// Группируем поля по типам
		const headers = allFields
			.filter(f => f.type === 'header')
			.sort((a, b) => (a.order || 0) - (b.order || 0))
		const regularFields = allFields
			.filter(f => f.type !== 'header')
			.sort((a, b) => (a.order || 0) - (b.order || 0))

		const updates = []

		// Переупорядочиваем заголовки: 100, 200, 300...
		headers.forEach((header, index) => {
			const newOrder = (index + 1) * 100
			if (header.order !== newOrder) {
				updates.push({
					updateOne: {
						filter: { _id: header._id },
						update: { order: newOrder },
					},
				})
			}
		})

		// Переупорядочиваем обычные поля
		let currentSection = 1
		let fieldInSection = 1

		regularFields.forEach(field => {
			const newOrder = currentSection * 100 + fieldInSection

			if (field.order !== newOrder) {
				updates.push({
					updateOne: {
						filter: { _id: field._id },
						update: { order: newOrder },
					},
				})
			}

			fieldInSection++
			if (fieldInSection > 99) {
				// Переходим к следующей секции
				currentSection++
				fieldInSection = 1
			}
		})

		if (updates.length > 0) {
			await FormField.bulkWrite(updates)
		}
	}

	// 4. Удаляем отвязанные поля если нужно
	if (orphanedFields.length > 0 && options.deleteOrphanedFields) {

		const orphanedIds = orphanedFields.map(field => field._id)
		const result = await FormField.deleteMany({ _id: { $in: orphanedIds } })

	}
}

async function main() {
	const command = process.argv[2]

	try {
		if (command === 'diagnose') {
			await diagnoseFieldsIssues()
		} else if (command === 'fix') {
			const options = {
				removeMissingFields: true,
				attachOrphanedFields: false, // Не привязываем автоматически
				fixOrder: true,
				deleteOrphanedFields: false, // Не удаляем автоматически
			}

			if (process.argv.includes('--delete-orphaned')) {
				options.deleteOrphanedFields = true
			}

			if (process.argv.includes('--attach-orphaned')) {
				options.attachOrphanedFields = true
			}

			await fixFieldsIssues(options)
		} else if (command === 'clean') {
			// Агрессивная очистка - удаляем все отвязанные поля
			await fixFieldsIssues({
				removeMissingFields: true,
				attachOrphanedFields: false,
				fixOrder: true,
				deleteOrphanedFields: true,
			})
		} else {
				'  node fix-fields-issues.js fix --delete-orphaned - удалить отвязанные поля'
			)
		}
	} catch (error) {
	} finally {
		await mongoose.disconnect()
	}
}

if (require.main === module) {
	main()
}
