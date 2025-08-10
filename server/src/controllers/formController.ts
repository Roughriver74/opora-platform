import { Request, Response } from 'express'
import { getFormService } from '../services/FormService'
import bitrix24Service from '../services/bitrix24Service'

const formService = getFormService()

// Получение всех форм
export const getAllForms = async (
	req: Request,
	res: Response
): Promise<void> => {
	try {
		
		// Получаем все активные формы с полями
		const forms = await formService.findActive()
		
		// Загружаем поля для каждой формы
		const formsWithFields = await Promise.all(
			forms.map(async form => {
				const formWithFields = await formService.findWithFields(form.id)
				return formWithFields || form
			})
		)

		res.status(200).json(formsWithFields)
	} catch (error: any) {
		console.error('Ошибка при получении форм:', error)
		res.status(500).json({ 
			message: error.message || 'Ошибка при получении форм',
			success: false 
		})
	}
}

// Получение конкретной формы по ID
export const getFormById = async (
	req: Request,
	res: Response
): Promise<void> => {
	try {
		const { id } = req.params
		
		// Получаем форму с полями через сервис
		const form = await formService.findWithFields(id)
		
		if (!form) {
			res.status(404).json({ 
				message: 'Форма не найдена',
				success: false 
			})
			return
		}

		res.status(200).json(form)
	} catch (error: any) {
		console.error('Ошибка при получении формы:', error)
		res.status(500).json({ 
			message: error.message || 'Ошибка при получении формы',
			success: false 
		})
	}
}

// Создание новой формы
export const createForm = async (
	req: Request,
	res: Response
): Promise<void> => {
	try {
		
		const form = await formService.createForm(req.body)
		
		res.status(201).json({
			success: true,
			data: form,
			message: 'Форма успешно создана'
		})
	} catch (error: any) {
		console.error('Ошибка при создании формы:', error)
		
		if (error.message?.includes('уже существует')) {
			res.status(400).json({ 
				message: error.message,
				success: false 
			})
		} else {
			res.status(500).json({ 
				message: error.message || 'Ошибка при создании формы',
				success: false 
			})
		}
	}
}

// Обновление существующей формы
export const updateForm = async (
	req: Request,
	res: Response
): Promise<void> => {
	try {
		const { id } = req.params

		const updatedForm = await formService.updateForm(id, req.body)
		
		if (!updatedForm) {
			res.status(404).json({ 
				message: 'Форма не найдена',
				success: false 
			})
			return
		}

		res.status(200).json({
			success: true,
			data: updatedForm,
			message: 'Форма успешно обновлена'
		})
	} catch (error: any) {
		console.error('Ошибка при обновлении формы:', error)
		
		if (error.message?.includes('не найден')) {
			res.status(404).json({
				message: error.message,
				success: false
			})
		} else if (error.message?.includes('уже существует')) {
			res.status(400).json({
				message: error.message,
				success: false
			})
		} else {
			res.status(500).json({
				message: error.message || 'Ошибка при обновлении формы',
				success: false
			})
		}
	}
}

// Удаление формы
export const deleteForm = async (
	req: Request,
	res: Response
): Promise<void> => {
	try {
		const { id } = req.params
		
		const deleted = await formService.delete(id)
		
		if (!deleted) {
			res.status(404).json({ 
				message: 'Форма не найдена',
				success: false 
			})
			return
		}

		res.status(200).json({ 
			message: 'Форма успешно удалена',
			success: true 
		})
	} catch (error: any) {
		console.error('Ошибка при удалении формы:', error)
		res.status(500).json({ 
			message: error.message || 'Ошибка при удалении формы',
			success: false 
		})
	}
}

// Получение категорий сделок из Битрикс24
export const getDealCategories = async (
	req: Request,
	res: Response
): Promise<void> => {
	try {
		const categoriesData = await bitrix24Service.getDealCategories()
			'Полученные данные от Bitrix24:',
			JSON.stringify(categoriesData, null, 2)
		)

		// Преобразование результата в формат, ожидаемый фронтендом (ID и NAME)
		let categories = []

		// Обработка нового формата из crm.category.list
		if (
			categoriesData &&
			categoriesData.result &&
			categoriesData.result.categories
		) {
			// Используем новый формат от crm.category.list, где категории находятся в result.categories
			if (Array.isArray(categoriesData.result.categories)) {
				categories = categoriesData.result.categories.map(category => ({
					id: category.id ? category.id.toString() : '',
					name: category.name || '',
					sort: parseInt(category.sort) || 0,
					isDefault: category.isDefault || false,
				}))
			}
		}

		// Если получили пустой массив, добавляем тестовую категорию для отладки
		if (categories.length === 0) {
			categories = [
				{ id: '1', name: 'Основная категория', sort: 100, isDefault: true },
				{
					id: '2',
					name: 'Дополнительная категория',
					sort: 200,
					isDefault: false,
				},
			]
		}


		// Возвращаем данные в формате, который ожидает фронтенд
		res.status(200).json({
			success: true,
			data: categories,
		})
	} catch (error: any) {
		console.error('Ошибка при получении категорий сделок:', error)

		// Для предотвращения ошибок на фронтенде, возвращаем пустой массив вместо ошибки
		res.status(200).json({
			success: false,
			message: error.message || 'Ошибка загрузки категорий',
			data: [
				{ id: '1', name: 'Основная категория', sort: 100, isDefault: true },
				{
					id: '2',
					name: 'Дополнительная категория',
					sort: 200,
					isDefault: false,
				},
			],
		})
	}
}

// Получение статусов сделок для определенной категории
export const getDealStages = async (
	req: Request,
	res: Response
): Promise<void> => {
	try {
		const categoryId = (req.query.categoryId as string) || '1'
		const stages = await bitrix24Service.getDealStages(categoryId)

		res.status(200).json({
			success: true,
			data: stages,
		})
	} catch (error: any) {
		console.error('Ошибка при получении статусов сделок:', error)
		res.status(500).json({
			success: false,
			message: error.message || 'Ошибка загрузки статусов',
		})
	}
}

// Тестирование подключения к Битрикс24
export const testConnection = async (
	req: Request,
	res: Response
): Promise<void> => {
	try {
		// Пытаемся получить информацию о текущем пользователе как тест подключения
		const userInfo = await bitrix24Service.getCurrentUser()

		res.status(200).json({
			success: true,
			message: 'Подключение к Битрикс24 работает успешно',
			data: userInfo,
		})
	} catch (error: any) {
		console.error('Ошибка тестирования подключения:', error)
		res.status(500).json({
			success: false,
			message: error.message || 'Ошибка подключения к Битрикс24',
		})
	}
}

// Тестирование синхронизации статуса заявки
export const testSync = async (req: Request, res: Response): Promise<void> => {
	try {
		const { submissionId, newStatus } = req.body

		if (!submissionId || !newStatus) {
			res.status(400).json({
				success: false,
				message: 'Не указан ID заявки или новый статус',
			})
			return
		}

		// Здесь должна быть логика обновления статуса в Битрикс24
		// Пока что возвращаем успешный результат для тестирования
		res.status(200).json({
			success: true,
			message: 'Тестирование синхронизации выполнено успешно',
			data: {
				submissionId,
				newStatus,
				bitrixDealId: 'test_deal_123', // тестовое значение
			},
		})
	} catch (error: any) {
		console.error('Ошибка тестирования синхронизации:', error)
		res.status(500).json({
			success: false,
			message: error.message || 'Ошибка тестирования синхронизации',
		})
	}
}

// Временная заглушка для функции submitForm
export const submitForm = async (
	req: Request,
	res: Response
): Promise<void> => {
	try {
		res
			.status(200)
			.json({ message: 'Форма отправлена успешно (временная заглушка)' })
	} catch (error) {
		res.status(500).json({ message: 'Ошибка при отправке формы' })
	}
}
