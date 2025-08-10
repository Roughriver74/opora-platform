const mongoose = require('mongoose')
const FormField = require('./src/models/FormField')

// Подключение к MongoDB
const connectDB = async () => {
	try {
		await mongoose.connect(
			process.env.MONGODB_URI || 'mongodb://localhost:27017/beton-crm',
			{
				useNewUrlParser: true,
				useUnifiedTopology: true,
			}
		)
	} catch (error) {
		process.exit(1)
	}
}

// Создаем тестовые поля с новой функциональностью связанных полей
const createTestFieldsWithLinkedFields = async () => {
	try {
			'\n🔗 Создание тестовых полей с новой функциональностью связанных полей...'
		)

		// Удаляем существующие тестовые поля
		await FormField.deleteMany({ name: { $regex: /^test_linked_/ } })

		// 1. Поля первого раздела (Раздел 1 - Информация о заказчике)
		const customerNameField = await FormField.create({
			name: 'test_linked_customer_name',
			label: 'Название организации заказчика',
			type: 'text',
			required: true,
			order: 101,
			bitrixFieldId: 'COMPANY',
			bitrixFieldType: 'string',
			linkedFields: {
				enabled: false, // Это поле-источник, связи не нужны
				mappings: [],
			},
		})

		const customerContactField = await FormField.create({
			name: 'test_linked_customer_contact',
			label: 'Контактное лицо заказчика',
			type: 'text',
			required: true,
			order: 102,
			bitrixFieldId: 'CONTACT',
			bitrixFieldType: 'string',
			linkedFields: {
				enabled: false,
				mappings: [],
			},
		})

		const customerPhoneField = await FormField.create({
			name: 'test_linked_customer_phone',
			label: 'Телефон заказчика',
			type: 'text',
			required: true,
			order: 103,
			bitrixFieldId: 'PHONE',
			bitrixFieldType: 'string',
			linkedFields: {
				enabled: false,
				mappings: [],
			},
		})

		// 2. Поля второго раздела (Раздел 2 - Информация о доставке)
		const deliveryNameField = await FormField.create({
			name: 'test_linked_delivery_name',
			label: 'Название организации для доставки',
			type: 'text',
			required: false,
			order: 201,
			bitrixFieldId: 'DELIVERY_COMPANY',
			bitrixFieldType: 'string',
			linkedFields: {
				enabled: true,
				// Новая простая настройка - копировать из поля заказчика
				sourceField: {
					sourceFieldName: 'test_linked_customer_name',
					sourceFieldLabel: 'Название организации заказчика',
					sourceSectionName: 'Раздел 1',
				},
				mappings: [],
			},
		})

		const deliveryContactField = await FormField.create({
			name: 'test_linked_delivery_contact',
			label: 'Контактное лицо для доставки',
			type: 'text',
			required: false,
			order: 202,
			bitrixFieldId: 'DELIVERY_CONTACT',
			bitrixFieldType: 'string',
			linkedFields: {
				enabled: true,
				sourceField: {
					sourceFieldName: 'test_linked_customer_contact',
					sourceFieldLabel: 'Контактное лицо заказчика',
					sourceSectionName: 'Раздел 1',
				},
				mappings: [],
			},
		})

		const deliveryPhoneField = await FormField.create({
			name: 'test_linked_delivery_phone',
			label: 'Телефон для доставки',
			type: 'text',
			required: false,
			order: 203,
			bitrixFieldId: 'DELIVERY_PHONE',
			bitrixFieldType: 'string',
			linkedFields: {
				enabled: true,
				sourceField: {
					sourceFieldName: 'test_linked_customer_phone',
					sourceFieldLabel: 'Телефон заказчика',
					sourceSectionName: 'Раздел 1',
				},
				mappings: [],
			},
		})

		// 3. Поля третьего раздела (Раздел 3 - Документооборот) с расширенными связями
		const billingNameField = await FormField.create({
			name: 'test_linked_billing_name',
			label: 'Плательщик (название организации)',
			type: 'text',
			required: false,
			order: 301,
			bitrixFieldId: 'BILLING_COMPANY',
			bitrixFieldType: 'string',
			linkedFields: {
				enabled: true,
				// Простая связь с полем заказчика
				sourceField: {
					sourceFieldName: 'test_linked_customer_name',
					sourceFieldLabel: 'Название организации заказчика',
					sourceSectionName: 'Раздел 1',
				},
				// Дополнительная расширенная связь с полем доставки (двунаправленная)
				mappings: [
					{
						targetFieldName: 'test_linked_delivery_name',
						targetFieldLabel: 'Название организации для доставки',
						copyDirection: 'both',
					},
				],
			},
		})

			`  👤 ${customerContactField.label} (${customerContactField.name})`
		)
			`     ↳ 🔗 Источник: "${deliveryNameField.linkedFields.sourceField.sourceFieldLabel}"`
		)
			`  👤 ${deliveryContactField.label} (${deliveryContactField.name})`
		)
			`     ↳ 🔗 Источник: "${deliveryContactField.linkedFields.sourceField.sourceFieldLabel}"`
		)
			`     ↳ 🔗 Источник: "${deliveryPhoneField.linkedFields.sourceField.sourceFieldLabel}"`
		)
			`     ↳ 🔗 Основной источник: "${billingNameField.linkedFields.sourceField.sourceFieldLabel}"`
		)
			`     ↳ 🔗 Дополнительная связь: "${billingNameField.linkedFields.mappings[0].targetFieldLabel}" (двунаправленная)`
		)
			'   1. В разделе "Информация о доставке" будет кнопка "Копировать из Раздел 1"'
		)
			'      - Название организации для доставки ← Название организации заказчика'
		)
			'      - Контактное лицо для доставки ← Контактное лицо заказчика'
		)
			'   3. В разделе "Документооборот" также будет кнопка копирования'
		)
			'   4. Поле "Плательщик" имеет двунаправленную связь с полем доставки'
		)

		return {
			section1: [customerNameField, customerContactField, customerPhoneField],
			section2: [deliveryNameField, deliveryContactField, deliveryPhoneField],
			section3: [billingNameField],
		}
	} catch (error) {
		throw error
	}
}

// Основная функция
const main = async () => {
	try {
		await connectDB()

		const fields = await createTestFieldsWithLinkedFields()

			'4. В разделе "Связанные поля" увидите новую упрощенную настройку'
		)
			'7. Нажмите кнопку и убедитесь, что данные копируются правильно'
		)
	} catch (error) {
	} finally {
		await mongoose.connection.close()
	}
}

// Запуск скрипта
if (require.main === module) {
	main()
}

module.exports = { createTestFieldsWithLinkedFields }
