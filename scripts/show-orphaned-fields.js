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

async function showOrphanedFields() {
	try {
		console.log('=== ОТВЯЗАННЫЕ ПОЛЯ ===\n')

		const forms = await Form.find()
		const allFields = await FormField.find().sort({ order: 1 })

		if (forms.length === 0) {
			console.log('❌ Нет форм')
			return
		}

		const mainForm = forms[0]
		console.log(`📋 Форма: "${mainForm.title}"`)
		console.log(`   Привязанных полей: ${mainForm.fields.length}\n`)

		// Показываем привязанные поля
		console.log('✅ ПРИВЯЗАННЫЕ ПОЛЯ:')
		for (const fieldId of mainForm.fields) {
			const field = await FormField.findById(fieldId)
			if (field) {
				console.log(`   ${field.order}: ${field.label} (${field.type})`)
			}
		}

		// Находим отвязанные поля
		const orphanedFields = []
		for (const field of allFields) {
			if (!mainForm.fields.includes(field._id.toString())) {
				orphanedFields.push(field)
			}
		}

		console.log(`\n🚫 ОТВЯЗАННЫЕ ПОЛЯ (${orphanedFields.length}):`)

		// Группируем по порядку (разделы)
		const sections = {}
		orphanedFields.forEach(field => {
			const sectionOrder = Math.floor(field.order / 100) * 100
			if (!sections[sectionOrder]) {
				sections[sectionOrder] = []
			}
			sections[sectionOrder].push(field)
		})

		Object.keys(sections)
			.sort((a, b) => Number(a) - Number(b))
			.forEach(sectionOrder => {
				console.log(`\n   === РАЗДЕЛ ${sectionOrder} ===`)
				sections[sectionOrder].forEach(field => {
					console.log(
						`   ${field.order}: ${field.label} (${field.type}) - ${field.name}`
					)
				})
			})

		// Команды для действий
		console.log('\n💡 ВАРИАНТЫ ДЕЙСТВИЙ:')
		console.log(
			'1. node show-orphaned-fields.js attach-all - привязать ВСЕ отвязанные поля к форме'
		)
		console.log(
			'2. node show-orphaned-fields.js delete-orphaned - удалить все отвязанные поля'
		)
		console.log(
			'3. node show-orphaned-fields.js attach-section 100 - привязать поля из раздела 100'
		)

		// Обработка команд
		const command = process.argv[2]
		const param = process.argv[3]

		if (command === 'attach-all') {
			console.log('\n🔗 Привязываем все отвязанные поля...')
			const orphanedIds = orphanedFields.map(field => field._id.toString())
			const newFields = [...mainForm.fields, ...orphanedIds]
			await Form.findByIdAndUpdate(mainForm._id, { fields: newFields })
			console.log(`✅ Привязано ${orphanedIds.length} полей к форме`)
		} else if (command === 'delete-orphaned') {
			console.log('\n🗑️ Удаляем все отвязанные поля...')
			const orphanedIds = orphanedFields.map(field => field._id)
			const result = await FormField.deleteMany({ _id: { $in: orphanedIds } })
			console.log(`✅ Удалено ${result.deletedCount} полей`)
		} else if (command === 'attach-section' && param) {
			const sectionOrder = Number(param)
			console.log(`\n🔗 Привязываем поля из раздела ${sectionOrder}...`)

			const sectionFields = orphanedFields.filter(
				field => Math.floor(field.order / 100) * 100 === sectionOrder
			)

			if (sectionFields.length > 0) {
				const sectionIds = sectionFields.map(field => field._id.toString())
				const newFields = [...mainForm.fields, ...sectionIds]
				await Form.findByIdAndUpdate(mainForm._id, { fields: newFields })
				console.log(
					`✅ Привязано ${sectionIds.length} полей из раздела ${sectionOrder}`
				)
			} else {
				console.log(`❌ Поля раздела ${sectionOrder} не найдены`)
			}
		}
	} catch (error) {
		console.error('❌ Ошибка:', error)
	} finally {
		await mongoose.disconnect()
		console.log('\n🔌 Отключено')
	}
}

showOrphanedFields()
