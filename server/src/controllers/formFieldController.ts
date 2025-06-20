import { Request, Response } from 'express'
import FormField from '../models/FormField'
import Form from '../models/Form'
import bitrix24Service from '../services/bitrix24Service'

// Получение всех полей формы
export const getAllFields = async (
	req: Request,
	res: Response
): Promise<void> => {
	try {
		const fields = await FormField.find().sort({ order: 1 })
		res.status(200).json(fields)
	} catch (error: any) {
		res.status(500).json({ message: error.message })
	}
}

// Получение конкретного поля формы по ID
export const getFieldById = async (
	req: Request,
	res: Response
): Promise<void> => {
	try {
		const field = await FormField.findById(req.params.id)
		if (!field) {
			res.status(404).json({ message: 'Поле не найдено' })
			return
		}
		res.status(200).json(field)
	} catch (error: any) {
		res.status(500).json({ message: error.message })
	}
}

// Создание нового поля формы
export const createField = async (
	req: Request,
	res: Response
): Promise<void> => {
	try {
		const fieldData = req.body
		console.log('📝 Создание поля с данными:', {
			name: fieldData.name,
			type: fieldData.type,
			formId: fieldData.formId,
		})

		const field = new FormField(fieldData)
		const savedField = await field.save()

		// Автоматически добавляем поле в форму
		if (fieldData.formId) {
			// Используем formId из запроса
			const form = await Form.findById(fieldData.formId)
			if (form) {
				await Form.findByIdAndUpdate(fieldData.formId, {
					$push: { fields: savedField._id },
				})
				console.log(
					`📋 Поле ${savedField.name} добавлено в форму ${form.title} (ID: ${fieldData.formId})`
				)
			} else {
				console.warn(`⚠️ Форма с ID ${fieldData.formId} не найдена`)
			}
		} else {
			// Если formId не передан, используем первую найденную форму (backward compatibility)
			const form = await Form.findOne()
			if (form) {
				await Form.findByIdAndUpdate(form._id, {
					$push: { fields: savedField._id },
				})
				console.log(
					`📋 Поле ${savedField.name} добавлено в первую найденную форму ${form.title} (ID: ${form._id})`
				)
			} else {
				console.warn(
					'⚠️ Ни одной формы не найдено, поле создано но не привязано'
				)
			}
		}

		res.status(201).json(savedField)
	} catch (error: any) {
		console.error('❌ Ошибка при создании поля:', error)
		res.status(400).json({ message: error.message })
	}
}

// Обновление существующего поля формы
export const updateField = async (
	req: Request,
	res: Response
): Promise<void> => {
	try {
		console.log('🔄 Обновление поля ID:', req.params.id)
		console.log('📝 Данные для обновления:', JSON.stringify(req.body, null, 2))

		const field = await FormField.findById(req.params.id)
		if (!field) {
			console.log('❌ Поле не найдено:', req.params.id)
			res.status(404).json({ message: 'Поле не найдено' })
			return
		}

		console.log('📋 Оригинальное поле:', {
			_id: field._id,
			name: field.name,
			label: field.label,
			type: field.type,
			order: field.order,
		})

		Object.assign(field, req.body)

		console.log('📝 Поле после объединения данных:', {
			_id: field._id,
			name: field.name,
			label: field.label,
			type: field.type,
			order: field.order,
		})

		const updatedField = await field.save()

		console.log('✅ Поле успешно обновлено:', {
			_id: updatedField._id,
			name: updatedField.name,
			label: updatedField.label,
			type: updatedField.type,
			order: updatedField.order,
		})

		res.status(200).json(updatedField)
	} catch (error: any) {
		console.error('❌ Ошибка при обновлении поля:', error)
		console.error('📋 Детали ошибки:', error.message)
		if (error.name === 'ValidationError') {
			console.error('💥 Ошибки валидации:', error.errors)
		}
		res.status(400).json({ message: error.message })
	}
}

// Удаление поля формы
export const deleteField = async (
	req: Request,
	res: Response
): Promise<void> => {
	try {
		const field = await FormField.findById(req.params.id)
		if (!field) {
			res.status(404).json({ message: 'Поле не найдено' })
			return
		}

		// Удаляем поле из всех форм
		await Form.updateMany(
			{ fields: req.params.id },
			{ $pull: { fields: req.params.id } }
		)

		// Удаляем само поле
		await FormField.findByIdAndDelete(req.params.id)

		console.log(`🗑️ Поле ${field.name} удалено из базы и всех форм`)
		res.status(200).json({ message: 'Поле успешно удалено' })
	} catch (error: any) {
		console.error('❌ Ошибка при удалении поля:', error)
		res.status(500).json({ message: error.message })
	}
}

// Получение доступных полей из Битрикс24
export const getBitrixFields = async (
	req: Request,
	res: Response
): Promise<void> => {
	try {
		const fieldsResponse = await bitrix24Service.getDealFields()

		if (!fieldsResponse || !fieldsResponse.result) {
			res.status(404).json({ message: 'Не удалось получить поля из Битрикс24' })
			return
		}

		const formattedFields = Object.entries(fieldsResponse.result).reduce(
			(acc: any, [fieldCode, fieldData]: [string, any]) => {
				const fieldName =
					fieldData.formLabel ||
					fieldData.listLabel ||
					fieldData.title ||
					fieldCode

				acc[fieldCode] = {
					code: fieldCode,
					name: fieldName,
					type: fieldData.type,
					isRequired: fieldData.isRequired,
					isMultiple: fieldData.isMultiple,
					items: fieldData.items, // Для полей типа enumeration
					originalData: fieldData, // Сохраняем исходные данные для полной совместимости
				}

				return acc
			},
			{}
		)

		res.status(200).json({
			result: formattedFields,
			time: fieldsResponse.time,
		})
	} catch (error: any) {
		console.error('Ошибка при получении полей из Битрикс24:', error)
		res.status(500).json({ message: error.message })
	}
}

// Получение номенклатуры из Битрикс24 для динамических полей
export const getProductsList = async (
	req: Request,
	res: Response
): Promise<void> => {
	try {
		const { query } = req.query
		const products = await bitrix24Service.getProducts(query as string)
		res.status(200).json(products)
	} catch (error: any) {
		res.status(500).json({ message: error.message })
	}
}

// Получение списка компаний из Битрикс24
export const getCompaniesList = async (
	req: Request,
	res: Response
): Promise<void> => {
	try {
		const { query } = req.query
		const companies = await bitrix24Service.getCompanies(query as string)
		res.status(200).json(companies)
	} catch (error: any) {
		res.status(500).json({ message: error.message })
	}
}

// Получение списка контактов из Битрикс24
export const getContactsList = async (
	req: Request,
	res: Response
): Promise<void> => {
	try {
		const { query } = req.query
		const contacts = await bitrix24Service.getContacts(query as string)
		res.status(200).json(contacts)
	} catch (error: any) {
		res.status(500).json({ message: error.message })
	}
}

// Получение пользовательских полей из Битрикс24
export const getUserFields = async (
	req: Request,
	res: Response
): Promise<void> => {
	try {
		const userFields = await bitrix24Service.getUserFields()
		res.status(200).json(userFields)
	} catch (error: any) {
		console.error('Ошибка при получении пользовательских полей:', error)
		res.status(500).json({ message: error.message })
	}
}

// Получение значений для конкретного поля типа enumeration
export const getEnumFieldValues = async (
	req: Request,
	res: Response
): Promise<void> => {
	try {
		const { fieldId } = req.params
		const enumValues = await bitrix24Service.getEnumFieldValues(fieldId)
		res.status(200).json(enumValues)
	} catch (error: any) {
		console.error(
			`Ошибка при получении значений для поля ${req.params.fieldId}:`,
			error
		)
		res.status(500).json({ message: error.message })
	}
}

// Получение всех полей типа enumeration с их значениями
export const getAllEnumFieldsWithValues = async (
	req: Request,
	res: Response
): Promise<void> => {
	try {
		const enumFieldsWithValues =
			await bitrix24Service.getAllEnumFieldsWithValues()
		res.status(200).json(enumFieldsWithValues)
	} catch (error: any) {
		console.error('Ошибка при получении полей с их значениями:', error)
		res.status(500).json({ message: error.message })
	}
}

// Отладочный метод для исследования структуры полей
export const debugFieldStructure = async (
	req: Request,
	res: Response
): Promise<void> => {
	try {
		const debugInfo = await bitrix24Service.debugFieldStructure()
		res.status(200).json(debugInfo)
	} catch (error: any) {
		console.error('Ошибка при отладке структуры полей:', error)
		res.status(500).json({ message: error.message })
	}
}
