const mongoose = require('mongoose')
const FormField = require('../server/src/models/FormField').default
const Form = require('../server/src/models/Form').default

mongoose.connect('mongodb://localhost:27017/beton-crm', {
	useNewUrlParser: true,
	useUnifiedTopology: true,
})

mongoose.connection.once('open', async () => {
	try {
		console.log('=== Проверка текущего состояния ===')

		// Проверяем форму
		const form = await Form.findOne()
		if (!form) {
			console.log('❌ Форма не найдена!')
			process.exit(1)
		}

		console.log('✅ Форма найдена:', form.title)
		console.log('📋 Количество полей в форме:', form.fields.length)

		// Проверяем поля в базе
		const totalFields = await FormField.countDocuments()
		console.log('🗂️ Всего полей в базе данных:', totalFields)

		// Проверяем привязанные поля
		const linkedFields = await FormField.countDocuments({
			_id: { $in: form.fields },
		})
		console.log('🔗 Привязанных полей найдено:', linkedFields)

		// Проверяем порядок полей
		const fields = await FormField.find({ _id: { $in: form.fields } }).sort({
			order: 1,
		})

		console.log('\n📊 Анализ порядка полей:')
		const sections = {}
		fields.forEach(field => {
			const sectionOrder = Math.floor(field.order / 100) * 100
			if (!sections[sectionOrder]) {
				sections[sectionOrder] = []
			}
			sections[sectionOrder].push({
				id: field._id,
				name: field.name,
				type: field.type,
				order: field.order,
			})
		})

		Object.keys(sections)
			.sort((a, b) => a - b)
			.forEach(sectionOrder => {
				console.log(`\n📁 Раздел ${sectionOrder}:`)
				sections[sectionOrder].forEach(field => {
					console.log(`  ${field.order}: ${field.name} (${field.type})`)
				})
			})

		process.exit(0)
	} catch (error) {
		console.error('❌ Ошибка:', error)
		process.exit(1)
	}
})
