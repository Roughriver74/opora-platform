import { Request, Response } from 'express'
import { getFormFieldService } from '../services/FormFieldService'
import { getFormService } from '../services/FormService'
import bitrix24Service from '../services/bitrix24Service'

const formFieldService = getFormFieldService()
const formService = getFormService()

// Получение всех полей формы
export const getAllFields = async (
	req: Request,
	res: Response
): Promise<void> => {
	try {
		const { formId } = req.query
		
		if (formId) {
			const fields = await formFieldService.findByFormId(formId as string)
			res.status(200).json(fields)
		} else {
			// Если formId не указан, возвращаем пустой массив
			res.status(200).json([])
		}
	} catch (error: any) {
		console.error('❌ Ошибка при получении полей:', error)
		res.status(500).json({ message: error.message })
	}
}

// Получение конкретного поля формы по ID
export const getFieldById = async (
	req: Request,
	res: Response
): Promise<void> => {
	try {
		const field = await formFieldService.findById(req.params.id)
		
		if (!field) {
			res.status(404).json({ message: 'Поле не найдено' })
			return
		}
		res.status(200).json(field)
	} catch (error: any) {
		console.error('❌ Ошибка при получении поля:', error)
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

		if (!fieldData.formId) {
			res.status(400).json({ message: 'formId обязателен для создания поля' })
			return
		}

		// Проверяем существование формы
		const form = await formService.findById(fieldData.formId)
		if (!form) {
			res.status(404).json({ message: `Форма с ID ${fieldData.formId} не найдена` })
			return
		}

		const savedField = await formFieldService.createField(fieldData)
		console.log(`📋 Поле ${savedField.name} создано для формы ${form.title}`)

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

		const updatedField = await formFieldService.updateField(req.params.id, req.body)

		if (!updatedField) {
			res.status(404).json({ message: 'Поле не найдено' })
			return
		}

		console.log('✅ Поле успешно обновлено:', {
			id: updatedField.id,
			name: updatedField.name,
			label: updatedField.label,
			type: updatedField.type,
			order: updatedField.order,
		})

		res.status(200).json(updatedField)
	} catch (error: any) {
		console.error('❌ Ошибка при обновлении поля:', error)
		res.status(400).json({ message: error.message })
	}
}

// Удаление поля формы
export const deleteField = async (
	req: Request,
	res: Response
): Promise<void> => {
	try {
		const deleted = await formFieldService.deleteField(req.params.id)
		
		if (!deleted) {
			res.status(404).json({ message: 'Поле не найдено' })
			return
		}

		console.log(`🗑️ Поле ${req.params.id} удалено`)
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
		const user = req.user // Получаем пользователя из middleware

		// Определяем параметры фильтрации
		let assignedFilter = null
		// @ts-ignore - bitrix_id добавлен в AuthUser
		if (user && user.settings?.onlyMyCompanies && user.bitrix_id) {
			// @ts-ignore
			assignedFilter = user.bitrix_id
		}

		console.log('🔍 Запрос компаний:', {
			query: query as string,
			userId: user?.id,
			// @ts-ignore
			bitrixId: user?.bitrix_id,
			onlyMyCompanies: user?.settings?.onlyMyCompanies,
			assignedFilter,
		})

		const companies = await bitrix24Service.getCompanies(
			query as string,
			50,
			assignedFilter
		)
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

// POST методы для поиска битрикс данных (новые)

// Поиск продуктов (POST)
export const searchProducts = async (
	req: Request,
	res: Response
): Promise<void> => {
	try {
		const { query } = req.body
		console.log('🔍 POST Поиск продуктов:', query)
		const products = await bitrix24Service.getProducts(query as string)
		res.status(200).json(products)
	} catch (error: any) {
		console.error('Ошибка при поиске продуктов:', error)
		res.status(500).json({ message: error.message })
	}
}

// Поиск компаний (POST)
export const searchCompanies = async (
	req: Request,
	res: Response
): Promise<void> => {
	try {
		const { query } = req.body
		const user = req.user // Получаем пользователя из middleware

		// Определяем параметры фильтрации
		let assignedFilter = null
		// @ts-ignore - bitrix_id добавлен в AuthUser
		if (user && user.settings?.onlyMyCompanies && user.bitrix_id) {
			// @ts-ignore
			assignedFilter = user.bitrix_id
		}

		console.log('🔍 POST Поиск компаний:', {
			query: query as string,
			userId: user?.id,
			// @ts-ignore
			bitrixId: user?.bitrix_id,
			onlyMyCompanies: user?.settings?.onlyMyCompanies,
			assignedFilter,
		})

		const companies = await bitrix24Service.getCompanies(
			query as string,
			50,
			assignedFilter
		)
		res.status(200).json(companies)
	} catch (error: any) {
		console.error('Ошибка при поиске компаний:', error)
		res.status(500).json({ message: error.message })
	}
}

// Поиск контактов (POST)
export const searchContacts = async (
	req: Request,
	res: Response
): Promise<void> => {
	try {
		const { query } = req.body
		console.log('🔍 POST Поиск контактов:', query)
		const contacts = await bitrix24Service.getContacts(query as string)
		res.status(200).json(contacts)
	} catch (error: any) {
		console.error('Ошибка при поиске контактов:', error)
		res.status(500).json({ message: error.message })
	}
}

// Обновление порядка полей
export const updateFieldsOrder = async (
	req: Request,
	res: Response
): Promise<void> => {
	try {
		const { updates } = req.body
		console.log('📝 Обновление порядка полей:', updates)

		if (!updates || !Array.isArray(updates)) {
			res.status(400).json({ 
				success: false,
				message: 'Требуется массив обновлений' 
			})
			return
		}

		const result = await formFieldService.updateFieldsOrder(updates)
		
		console.log(`✅ Обновлен порядок для ${result.updatedCount} полей`)
		
		res.status(200).json({
			success: result.success,
			message: 'Порядок полей обновлен',
			updatedCount: result.updatedCount,
			failedCount: updates.length - result.updatedCount
		})
	} catch (error: any) {
		console.error('Ошибка при обновлении порядка полей:', error)
		res.status(500).json({ 
			success: false,
			message: error.message 
		})
	}
}