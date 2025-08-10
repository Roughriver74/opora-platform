const mongoose = require('mongoose')
const FormField = require('../dist/models/FormField').default
const Form = require('../dist/models/Form').default

mongoose.connect('mongodb://localhost:27017/beton-crm', {
	useNewUrlParser: true,
	useUnifiedTopology: true,
})

mongoose.connection.once('open', async () => {
	try {

		// Получаем форму и все её поля
		const form = await Form.findOne()
		if (!form) {
			process.exit(1)
		}

		const fields = await FormField.find({ _id: { $in: form.fields } }).sort({
			order: 1,
		})


		// Группируем поля логически
		const sections = [
			{
				name: 'Основная информация о покупателе',
				headerOrder: 100,
				startOrder: 101,
				fields: [],
			},
			{
				name: 'Информация о продукте',
				headerOrder: 200,
				startOrder: 201,
				fields: [],
			},
			{
				name: 'Бетон',
				headerOrder: 300,
				startOrder: 301,
				fields: [],
			},
			{
				name: 'Раствор',
				headerOrder: 400,
				startOrder: 401,
				fields: [],
			},
			{
				name: 'Информация о заводе',
				headerOrder: 500,
				startOrder: 501,
				fields: [],
			},
		]

		// Распределяем поля по логическим секциям
		fields.forEach(field => {
			if (field.type === 'header') {
				// Заголовки остаются как есть, но проверим их порядок
				return
			}

			if (field.type === 'divider') {
				// Разделители относим к первой секции
				sections[0].fields.push(field)
				return
			}

			// Определяем секцию по названию поля или битрикс ID
			const fieldName = field.name?.toLowerCase() || ''
			const bitrixId = field.bitrixFieldId || ''

			if (
				fieldName.includes('customer') ||
				fieldName.includes('покупател') ||
				fieldName.includes('компан') ||
				fieldName.includes('contact') ||
				fieldName.includes('phone') ||
				fieldName.includes('контакт') ||
				bitrixId === 'COMPANY_ID' ||
				bitrixId === 'CONTACT_ID'
			) {
				sections[0].fields.push(field)
			} else if (
				fieldName.includes('product') ||
				fieldName.includes('продукт') ||
				bitrixId === 'UF_CRM_PRODUCT'
			) {
				sections[1].fields.push(field)
			} else if (
				fieldName.includes('бетон') ||
				fieldName.includes('concrete') ||
				fieldName.includes('класс') ||
				fieldName.includes('марка')
			) {
				sections[2].fields.push(field)
			} else if (
				fieldName.includes('раствор') ||
				fieldName.includes('solution') ||
				fieldName.includes('mortart')
			) {
				sections[3].fields.push(field)
			} else if (
				fieldName.includes('завод') ||
				fieldName.includes('plant') ||
				fieldName.includes('factory')
			) {
				sections[4].fields.push(field)
			} else {
				// Неопределенные поля относим к первой секции
				sections[0].fields.push(field)
			}
		})

		// Создаем новые заголовки секций и назначаем правильные порядки
		const updates = []
		let createdHeaders = []

		for (let i = 0; i < sections.length; i++) {
			const section = sections[i]

			if (section.fields.length === 0) continue

			// Создаем заголовок секции если его нет
			const existingHeader = fields.find(
				f =>
					f.type === 'header' &&
					Math.floor(f.order / 100) * 100 === section.headerOrder
			)

			if (!existingHeader) {
				const newHeader = new FormField({
					name: section.name,
					type: 'header',
					order: section.headerOrder,
					formId: form._id,
					isRequired: false,
					header: {
						label: section.name,
						level: 2,
					},
				})
				createdHeaders.push(newHeader)
					`➕ Создан заголовок: ${section.name} (order: ${section.headerOrder})`
				)
			}

			// Назначаем правильный порядок полям в секции
			section.fields.forEach((field, index) => {
				const newOrder = section.startOrder + index
				if (field.order !== newOrder) {
					updates.push({
						updateOne: {
							filter: { _id: field._id },
							update: { order: newOrder },
						},
					})
				}
			})
		}

		// Сохраняем новые заголовки
		if (createdHeaders.length > 0) {
			await FormField.insertMany(createdHeaders)

			// Добавляем их ID в форму
			const headerIds = createdHeaders.map(h => h._id)
			await Form.findByIdAndUpdate(form._id, {
				$push: { fields: { $each: headerIds } },
			})

		}

		// Выполняем массовое обновление порядков
		if (updates.length > 0) {
			await FormField.bulkWrite(updates)
		}

		// Проверяем результат
		const updatedFields = await FormField.find({
			_id: { $in: form.fields },
		}).sort({ order: 1 })

		const resultSections = {}
		updatedFields.forEach(field => {
			const sectionOrder = Math.floor(field.order / 100) * 100
			if (!resultSections[sectionOrder]) {
				resultSections[sectionOrder] = []
			}
			resultSections[sectionOrder].push({
				name: field.name,
				type: field.type,
				order: field.order,
			})
		})

		Object.keys(resultSections)
			.sort((a, b) => a - b)
			.forEach(sectionOrder => {
				resultSections[sectionOrder].forEach(field => {
				})
			})

		process.exit(0)
	} catch (error) {
		console.error('❌ Ошибка:', error)
		process.exit(1)
	}
})
