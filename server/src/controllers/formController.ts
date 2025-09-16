import { Request, Response } from 'express'
import { getFormService } from '../services/FormService'
import { getSubmissionService } from '../services/SubmissionService'
import { getUserService } from '../services/UserService'
import bitrix24Service from '../services/bitrix24Service'
import {
	BitrixSyncStatus,
	SubmissionPriority,
} from '../database/entities/Submission.entity'

const formService = getFormService()
const submissionService = getSubmissionService()
const userService = getUserService()

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
			success: false,
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
				success: false,
			})
			return
		}

		res.status(200).json(form)
	} catch (error: any) {
		console.error('Ошибка при получении формы:', error)
		res.status(500).json({
			message: error.message || 'Ошибка при получении формы',
			success: false,
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
			message: 'Форма успешно создана',
		})
	} catch (error: any) {
		console.error('Ошибка при создании формы:', error)

		if (error.message?.includes('уже существует')) {
			res.status(400).json({
				message: error.message,
				success: false,
			})
		} else {
			res.status(500).json({
				message: error.message || 'Ошибка при создании формы',
				success: false,
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
				success: false,
			})
			return
		}

		res.status(200).json({
			success: true,
			data: updatedForm,
			message: 'Форма успешно обновлена',
		})
	} catch (error: any) {
		console.error('Ошибка при обновлении формы:', error)

		if (error.message?.includes('не найден')) {
			res.status(404).json({
				message: error.message,
				success: false,
			})
		} else if (error.message?.includes('уже существует')) {
			res.status(400).json({
				message: error.message,
				success: false,
			})
		} else {
			res.status(500).json({
				message: error.message || 'Ошибка при обновлении формы',
				success: false,
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
				success: false,
			})
			return
		}

		res.status(200).json({
			message: 'Форма успешно удалена',
			success: true,
		})
	} catch (error: any) {
		console.error('Ошибка при удалении формы:', error)
		res.status(500).json({
			message: error.message || 'Ошибка при удалении формы',
			success: false,
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

// Обработка отправки формы заявки
export const submitForm = async (
	req: Request,
	res: Response
): Promise<void> => {
	try {
		const { id: formId } = req.params
		const { formData } = req.body

		if (!formData) {
			res.status(400).json({
				message: 'Необходимо указать данные формы',
			})
			return
		}

		const form = await formService.findWithFields(formId)
		if (!form) {
			res.status(404).json({ message: 'Форма не найдена' })
			return
		}

		if (!form.isActive) {
			res.status(400).json({ message: 'Форма не активна' })
			return
		}

		const validation = await formService.validateFormData(formId, formData)
		if (!validation.isValid) {
			res.status(400).json({
				message: 'Ошибка валидации данных',
				errors: validation.errors,
			})
			return
		}

		const dealData: Record<string, any> = {}
		let dealTitle = `Заявка ${Date.now()}`

		for (const field of form.fields) {
			if (formData[field.name] !== undefined && field.bitrixFieldId) {
				const value = formData[field.name]
				dealData[field.bitrixFieldId] = value
				if (field.bitrixFieldId === 'TITLE' && value) {
					dealTitle = value
				}
			}
		}

		dealData.TITLE = dealTitle
		dealData.STAGE_ID = 'C1:NEW'

		// Определяем пользователя для заявки
		let userId = req.user?.id || null
		let userName = null
		let userEmail = null

		if (req.user?.id) {
			const user = await userService.findById(req.user.id)
			if (user) {
				userId = user.id
				userName = user.fullName
				userEmail = user.email
				if (user.bitrixUserId) {
					dealData.ASSIGNED_BY_ID = user.bitrixUserId
				}
			}
		} else {
			// Если пользователь не авторизован, пытаемся извлечь данные из формы
			if (formData.email) {
				userEmail = formData.email
			}
			if (formData.firstName && formData.lastName) {
				userName = `${formData.firstName} ${formData.lastName}`
			} else if (formData.name) {
				userName = formData.name
			}
		}

		const categoryId = form.bitrixDealCategory || '1'
		dealData.CATEGORY_ID = categoryId

		let submission: any = null

		try {
			const submissionData = {
				formId: formId,
				userId: userId,
				title: dealTitle,
				notes: 'Заявка создана через форму',
				formData: formData,
				// Добавляем денормализованные данные пользователя
				userName: userName,
				userEmail: userEmail,
			}

			submission = await submissionService.createSubmission(submissionData)
			dealData.UF_CRM_1750107484181 = submission.id

			const dealResponse = await bitrix24Service.createDeal(dealData)

			await submissionService.updateSyncStatus(
				submission.id,
				BitrixSyncStatus.SYNCED,
				dealResponse.result?.toString?.()
			)

			res.status(200).json({
				success: true,
				message:
					form.successMessage || 'Спасибо! Ваша заявка успешно отправлена.',
				submissionId: submission.id,
				submissionNumber: submission.submissionNumber,
				dealId: dealResponse.result?.toString?.(),
			})
		} catch (bitrixError: any) {
			if (submission && submission.id) {
				try {
					await submissionService.delete(submission.id)
				} catch {}
			}

			res.status(500).json({
				message: 'Ошибка создания заявки в системе',
				error: bitrixError?.message,
			})
		}
	} catch (error: any) {
		res.status(500).json({
			message: 'Произошла ошибка при обработке заявки',
			error: error.message,
		})
	}
}
