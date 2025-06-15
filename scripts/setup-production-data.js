const mongoose = require('mongoose')

// Схемы без импорта (для работы на продакшн сервере)
const formFieldSchema = new mongoose.Schema(
	{
		name: { type: String, required: true },
		type: { type: String, required: true },
		label: { type: String, required: true },
		order: { type: Number, default: 0 },
		required: { type: Boolean, default: false },
		bitrixField: String,
		options: [{ value: String, label: String }],
		validation: {
			minLength: Number,
			maxLength: Number,
			pattern: String,
			customMessage: String,
		},
		placeholder: String,
		defaultValue: mongoose.Schema.Types.Mixed,
		description: String,
		section: String,
		dependsOn: String,
		showWhen: String,
		bitrixMapping: {
			create: String,
			update: String,
			value: String,
		},
	},
	{
		timestamps: true,
	}
)

const FormField = mongoose.model('FormField', formFieldSchema)

async function setupProductionData() {
	try {
		console.log('🚀 Настройка данных для продакшн среды...')

		// Подключение через переменную окружения или локальный URI
		const MONGODB_URI =
			process.env.MONGODB_URI ||
			'mongodb://localhost:27017/beton-crm-production'
		await mongoose.connect(MONGODB_URI)
		console.log('✅ Подключение к базе данных успешно')
		console.log(`📍 База данных: ${MONGODB_URI}`)

		// Проверяем существующие данные
		const existingFields = await FormField.countDocuments()
		console.log(`📊 Найдено полей: ${existingFields}`)

		// Создаем header поля
		const headerFields = [
			{
				name: 'section_company_info',
				type: 'header',
				label: 'Информация о компании',
				order: 10,
				required: false,
				description: 'Раздел с информацией о компании-заказчике',
			},
			{
				name: 'section_order_details',
				type: 'header',
				label: 'Детали заказа',
				order: 50,
				required: false,
				description: 'Раздел с деталями заказа бетона',
			},
			{
				name: 'section_technical_params',
				type: 'header',
				label: 'Технические параметры',
				order: 100,
				required: false,
				description: 'Раздел с техническими характеристиками бетона',
			},
			{
				name: 'section_delivery',
				type: 'header',
				label: 'Логистика и доставка',
				order: 150,
				required: false,
				description: 'Раздел с информацией о доставке',
			},
		]

		// Создаем обычные поля
		const regularFields = [
			// Поля для секции "Информация о компании"
			{
				name: 'company_name',
				type: 'text',
				label: 'Название компании',
				order: 11,
				required: true,
				placeholder: 'Введите название компании',
			},
			{
				name: 'company_contact',
				type: 'text',
				label: 'Контактное лицо',
				order: 12,
				required: true,
				placeholder: 'ФИО контактного лица',
			},
			{
				name: 'company_phone',
				type: 'text',
				label: 'Телефон',
				order: 13,
				required: true,
				placeholder: '+7 (999) 123-45-67',
			},

			// Поля для секции "Детали заказа"
			{
				name: 'concrete_volume',
				type: 'number',
				label: 'Объем бетона (м³)',
				order: 51,
				required: true,
				placeholder: 'Введите объем в кубометрах',
			},
			{
				name: 'concrete_grade',
				type: 'select',
				label: 'Марка бетона',
				order: 52,
				required: true,
				options: [
					{ value: 'M100', label: 'M100' },
					{ value: 'M150', label: 'M150' },
					{ value: 'M200', label: 'M200' },
					{ value: 'M250', label: 'M250' },
					{ value: 'M300', label: 'M300' },
					{ value: 'M350', label: 'M350' },
					{ value: 'M400', label: 'M400' },
				],
			},

			// Поля для секции "Технические параметры"
			{
				name: 'concrete_class',
				type: 'select',
				label: 'Класс бетона',
				order: 101,
				required: true,
				options: [
					{ value: 'B15', label: 'B15' },
					{ value: 'B20', label: 'B20' },
					{ value: 'B25', label: 'B25' },
					{ value: 'B30', label: 'B30' },
				],
			},
			{
				name: 'additives',
				type: 'textarea',
				label: 'Добавки и требования',
				order: 102,
				required: false,
				placeholder: 'Укажите специальные требования к бетону',
			},

			// Поля для секции "Логистика и доставка"
			{
				name: 'delivery_address',
				type: 'textarea',
				label: 'Адрес доставки',
				order: 151,
				required: true,
				placeholder: 'Полный адрес объекта доставки',
			},
			{
				name: 'delivery_date',
				type: 'date',
				label: 'Желаемая дата доставки',
				order: 152,
				required: true,
			},
		]

		let createdFieldsCount = 0

		// Создаем все поля
		for (const field of [...headerFields, ...regularFields]) {
			const existingField = await FormField.findOne({ name: field.name })
			if (!existingField) {
				const newField = new FormField(field)
				await newField.save()
				console.log(`✅ Создано поле: ${field.label} (тип: ${field.type})`)
				createdFieldsCount++
			} else {
				console.log(`ℹ️  Поле "${field.label}" уже существует`)
			}
		}

		// Итоговая статистика
		const totalFields = await FormField.countDocuments()
		const headerFieldsCount = await FormField.countDocuments({ type: 'header' })

		console.log('\n=== ИТОГОВАЯ СТАТИСТИКА ===')
		console.log(`📊 Всего полей в базе: ${totalFields}`)
		console.log(`📊 Header полей: ${headerFieldsCount}`)
		console.log(`✅ Создано новых полей: ${createdFieldsCount}`)

		await mongoose.disconnect()
		console.log('🔌 Отключение от базы данных')
		console.log('🎉 Настройка данных завершена успешно!')
	} catch (error) {
		console.error('❌ Ошибка при настройке данных:', error)
		process.exit(1)
	}
}

setupProductionData()
