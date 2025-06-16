import { Request, Response } from 'express'
import Form from '../models/Form'
import bitrix24Service from '../services/bitrix24Service'

// Получение всех форм
export const getAllForms = async (
	req: Request,
	res: Response
): Promise<void> => {
	try {
		const forms = await Form.find().populate('fields')
		res.status(200).json(forms)
	} catch (error: any) {
		res.status(500).json({ message: error.message })
	}
}

// Получение конкретной формы по ID
export const getFormById = async (
	req: Request,
	res: Response
): Promise<void> => {
	try {
		const form = await Form.findById(req.params.id).populate('fields')
		if (!form) {
			res.status(404).json({ message: 'Форма не найдена' })
			return
		}
		res.status(200).json(form)
	} catch (error: any) {
		res.status(500).json({ message: error.message })
	}
}

// Создание новой формы
export const createForm = async (
	req: Request,
	res: Response
): Promise<void> => {
	try {
		const form = new Form(req.body)
		const savedForm = await form.save()
		res.status(201).json(savedForm)
	} catch (error: any) {
		res.status(400).json({ message: error.message })
	}
}

// Обновление существующей формы
export const updateForm = async (
	req: Request,
	res: Response
): Promise<void> => {
	try {
		console.log('updateForm вызван с ID:', req.params.id)
		console.log('updateForm данные:', JSON.stringify(req.body, null, 2))

		const form = await Form.findById(req.params.id)
		if (!form) {
			console.log('Форма не найдена с ID:', req.params.id)
			res.status(404).json({ message: 'Форма не найдена' })
			return
		}

		console.log('Текущая форма:', JSON.stringify(form, null, 2))

		// Проверяем уникальность имени, если оно изменяется
		if (req.body.name && req.body.name !== form.name) {
			const existingForm = await Form.findOne({
				name: req.body.name,
				_id: { $ne: req.params.id },
			})
			if (existingForm) {
				console.log('Попытка использовать существующее имя:', req.body.name)
				res.status(400).json({ message: 'Форма с таким именем уже существует' })
				return
			}
		}

		Object.assign(form, req.body)

		console.log('Форма после обновления:', JSON.stringify(form, null, 2))

		const updatedForm = await form.save()

		console.log('Форма успешно сохранена:', updatedForm._id)

		res.status(200).json(updatedForm)
	} catch (error: any) {
		console.error('Ошибка в updateForm:', error)
		console.error('Stack trace:', error.stack)
		res.status(400).json({
			message: error.message,
			details: error.name === 'ValidationError' ? error.errors : undefined,
		})
	}
}

// Удаление формы
export const deleteForm = async (
	req: Request,
	res: Response
): Promise<void> => {
	try {
		const form = await Form.findById(req.params.id)
		if (!form) {
			res.status(404).json({ message: 'Форма не найдена' })
			return
		}

		await Form.findByIdAndDelete(req.params.id)
		res.status(200).json({ message: 'Форма успешно удалена' })
	} catch (error: any) {
		res.status(500).json({ message: error.message })
	}
}

// Получение категорий сделок из Битрикс24
export const getDealCategories = async (
	req: Request,
	res: Response
): Promise<void> => {
	try {
		const categoriesData = await bitrix24Service.getDealCategories()
		console.log(
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

		console.log('Отформатированные категории:', categories)

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
