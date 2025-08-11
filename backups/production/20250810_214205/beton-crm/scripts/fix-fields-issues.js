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
	console.log('=== ДИАГНОСТИКА ПРОБЛЕМ С ПОЛЯМИ ===\n')

	try {
		// 1. Проверяем все формы
		const forms = await Form.find()
		console.log(`📋 Найдено форм: ${forms.length}`)

		for (const form of forms) {
			console.log(`\n🔍 Форма: "${form.title}" (ID: ${form._id})`)
			console.log(`   Поля в форме: ${form.fields ? form.fields.length : 0}`)

			if (form.fields && form.fields.length > 0) {
				console.log(
					`   ID полей в форме:`,
					form.fields.slice(0, 5),
					form.fields.length > 5 ? '...' : ''
				)
			}
		}

		// 2. Проверяем все поля в базе
		const allFields = await FormField.find()
		console.log(`\n📝 Всего полей в базе: ${allFields.length}`)

		// 3. Проверяем несоответствия
		let orphanedFields = []
		let missingFields = []

		if (forms.length > 0) {
			const mainForm = forms[0] // Берем первую форму
			console.log(`\n🔗 Анализ связей для формы "${mainForm.title}":`)

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

			console.log(`❌ Поля в форме, но НЕТ в базе: ${missingFields.length}`)
			if (missingFields.length > 0) {
				console.log('   Отсутствующие ID:', missingFields)
			}

			console.log(
				`🚫 Поля в базе, но НЕ привязаны к форме: ${orphanedFields.length}`
			)
			if (orphanedFields.length > 0) {
				console.log('   Отвязанные поля:')
				orphanedFields.forEach(field => {
					console.log(
						`   - ${field.label} (${field.name}) - Order: ${field.order}`
					)
				})
			}
		}

		// 4. Анализ порядка полей
		console.log(`\n📊 АНАЛИЗ ПОРЯДКА ПОЛЕЙ:`)
		const fieldsByOrder = allFields.sort(
			(a, b) => (a.order || 0) - (b.order || 0)
		)

		let hasOrderIssues = false
		fieldsByOrder.forEach((field, index) => {
			if (index < 10) {
				// Показываем первые 10
				console.log(
					`   ${field.order || 'NO_ORDER'}: ${field.label} (${field.type})`
				)
			}

			// Проверяем проблемы с порядком
			if (!field.order || field.order <= 0) {
				hasOrderIssues = true
			}
		})

		if (hasOrderIssues) {
			console.log(`⚠️  Обнаружены поля без порядка или с некорректным порядком`)
		}

		return {
			forms,
			allFields,
			orphanedFields,
			missingFields,
			hasOrderIssues,
		}
	} catch (error) {
		console.error('❌ Ошибка диагностики:', error)
		throw error
	}
}

async function fixFieldsIssues(options = {}) {
	console.log('\n=== ИСПРАВЛЕНИЕ ПРОБЛЕМ ===\n')

	const diagnosis = await diagnoseFieldsIssues()
	const { forms, allFields, orphanedFields, missingFields } = diagnosis

	if (forms.length === 0) {
		console.log('❌ Нет форм для работы')
		return
	}

	const mainForm = forms[0]

	// 1. Удаляем из формы несуществующие поля
	if (missingFields.length > 0 && options.removeMissingFields) {
		console.log(
			`🔧 Удаляем ${missingFields.length} несуществующих полей из формы...`
		)

		const validFields = mainForm.fields.filter(
			fieldId => !missingFields.includes(fieldId)
		)
		await Form.findByIdAndUpdate(mainForm._id, { fields: validFields })

		console.log(`✅ Удалено ${missingFields.length} несуществующих ссылок`)
	}

	// 2. Привязываем отвязанные поля к форме
	if (orphanedFields.length > 0 && options.attachOrphanedFields) {
		console.log(
			`🔗 Привязываем ${orphanedFields.length} отвязанных полей к форме...`
		)

		const orphanedIds = orphanedFields.map(field => field._id.toString())
		const currentFields = mainForm.fields || []
		const newFields = [...currentFields, ...orphanedIds]

		await Form.findByIdAndUpdate(mainForm._id, { fields: newFields })

		console.log(`✅ Привязано ${orphanedFields.length} полей к форме`)
	}

	// 3. Исправляем порядок полей
	if (diagnosis.hasOrderIssues && options.fixOrder) {
		console.log(`📋 Исправляем порядок полей...`)

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
			console.log(`✅ Обновлен порядок для ${updates.length} полей`)
		}
	}

	// 4. Удаляем отвязанные поля если нужно
	if (orphanedFields.length > 0 && options.deleteOrphanedFields) {
		console.log(`🗑️  Удаляем ${orphanedFields.length} отвязанных полей...`)

		const orphanedIds = orphanedFields.map(field => field._id)
		const result = await FormField.deleteMany({ _id: { $in: orphanedIds } })

		console.log(`✅ Удалено ${result.deletedCount} отвязанных полей`)
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
			console.log('Использование:')
			console.log('  node fix-fields-issues.js diagnose - диагностика проблем')
			console.log('  node fix-fields-issues.js fix - исправление (безопасное)')
			console.log(
				'  node fix-fields-issues.js fix --delete-orphaned - удалить отвязанные поля'
			)
			console.log('  node fix-fields-issues.js clean - агрессивная очистка')
		}
	} catch (error) {
		console.error('❌ Ошибка:', error)
	} finally {
		await mongoose.disconnect()
		console.log('\n🔌 Отключено от базы данных')
	}
}

if (require.main === module) {
	main()
}
