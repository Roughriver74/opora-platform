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

const FormField = mongoose.model('FormField', FormFieldSchema)

async function fixOrderSystem() {
	try {
		console.log('=== ИСПРАВЛЕНИЕ СИСТЕМЫ ПОРЯДКА ===\n')

		const allFields = await FormField.find().sort({ order: 1 })
		console.log(`📝 Всего полей: ${allFields.length}`)

		// Группируем поля по типам
		const headers = allFields.filter(f => f.type === 'header')
		const dividers = allFields.filter(f => f.type === 'divider')
		const regularFields = allFields.filter(
			f => f.type !== 'header' && f.type !== 'divider'
		)

		console.log(`\n📊 АНАЛИЗ:`)
		console.log(`📋 Заголовков: ${headers.length}`)
		console.log(`➖ Разделителей: ${dividers.length}`)
		console.log(`📝 Обычных полей: ${regularFields.length}`)

		// Применяем новую систему порядка
		const updates = []
		let currentOrder = 100
		let sectionNumber = 1

		console.log(`\n🔧 НОВАЯ СИСТЕМА ПОРЯДКА:`)

		// Сначала обрабатываем по логическим группам
		const fieldGroups = [
			{
				name: 'Основная информация',
				headerKeywords: ['покупател', 'информация о покупателе', 'основ'],
				order: 100,
			},
			{
				name: 'Бетон',
				headerKeywords: ['бетон'],
				order: 200,
			},
			{
				name: 'Раствор',
				headerKeywords: ['раствор'],
				order: 300,
			},
			{
				name: 'Продукт',
				headerKeywords: ['продукт', 'информация о продукте'],
				order: 400,
			},
			{
				name: 'Завод',
				headerKeywords: ['завод', 'информация о заводе'],
				order: 500,
			},
			{
				name: 'Дополнительно',
				headerKeywords: ['раздел', 'дополн'],
				order: 600,
			},
		]

		// Находим и назначаем порядок заголовкам
		for (const group of fieldGroups) {
			const groupHeaders = headers.filter(header => {
				const label = header.label.toLowerCase()
				return group.headerKeywords.some(keyword => label.includes(keyword))
			})

			if (groupHeaders.length > 0) {
				console.log(`\n${group.name} (${group.order}):`)

				// Берем первый заголовок группы
				const mainHeader = groupHeaders[0]
				updates.push({
					updateOne: {
						filter: { _id: mainHeader._id },
						update: { order: group.order },
					},
				})
				console.log(`   ${group.order}: ${mainHeader.label} (header)`)

				// Находим поля этой группы и назначаем им порядок
				const groupFields = regularFields.filter(field => {
					const label = field.label.toLowerCase()
					const name = field.name.toLowerCase()
					return (
						group.headerKeywords.some(
							keyword => label.includes(keyword) || name.includes(keyword)
						) ||
						(field.order && Math.floor(field.order / 100) * 100 === group.order)
					)
				})

				groupFields.forEach((field, index) => {
					const newOrder = group.order + index + 1
					updates.push({
						updateOne: {
							filter: { _id: field._id },
							update: { order: newOrder },
						},
					})
					console.log(`   ${newOrder}: ${field.label} (${field.type})`)
				})

				// Удаляем обработанные поля из общего списка
				groupFields.forEach(field => {
					const index = regularFields.indexOf(field)
					if (index > -1) regularFields.splice(index, 1)
				})
			}
		}

		// Обрабатываем оставшиеся заголовки
		const remainingHeaders = headers.filter(
			header =>
				!fieldGroups.some(group =>
					group.headerKeywords.some(keyword =>
						header.label.toLowerCase().includes(keyword)
					)
				)
		)

		remainingHeaders.forEach((header, index) => {
			const newOrder = 700 + index * 100
			updates.push({
				updateOne: {
					filter: { _id: header._id },
					update: { order: newOrder },
				},
			})
			console.log(`\n${newOrder}: ${header.label} (header)`)
		})

		// Обрабатываем оставшиеся обычные поля
		regularFields.forEach((field, index) => {
			const newOrder = 900 + index + 1
			updates.push({
				updateOne: {
					filter: { _id: field._id },
					update: { order: newOrder },
				},
			})
		})

		// Обрабатываем разделители
		dividers.forEach((divider, index) => {
			const newOrder = 50 + index * 50
			updates.push({
				updateOne: {
					filter: { _id: divider._id },
					update: { order: newOrder },
				},
			})
		})

		// Выполняем обновления
		if (updates.length > 0) {
			console.log(`\n🔄 Выполняем обновление ${updates.length} полей...`)
			await FormField.bulkWrite(updates)
			console.log(`✅ Порядок обновлен для ${updates.length} полей`)
		}

		console.log('\n🎉 Система порядка исправлена!')
	} catch (error) {
		console.error('❌ Ошибка:', error)
	} finally {
		await mongoose.disconnect()
		console.log('\n🔌 Отключено')
	}
}

fixOrderSystem()
