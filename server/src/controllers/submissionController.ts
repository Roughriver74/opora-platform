import { Request, Response } from 'express'
import Form from '../models/Form'
import FormField, { IFormField } from '../models/FormField'
import Submission from '../models/Submission'
import SubmissionHistory from '../models/SubmissionHistory'
import User from '../models/User'
import bitrix24Service from '../services/bitrix24Service'

// Обработка отправки формы заявки
export const submitForm = async (req: Request, res: Response) => {
	try {
		const { formId, formData } = req.body

		if (!formId || !formData) {
			return res
				.status(400)
				.json({ message: 'Необходимо указать ID формы и данные формы' })
		}

		// Получаем форму с полями
		const form = await Form.findById(formId).populate('fields')
		if (!form) {
			return res.status(404).json({ message: 'Форма не найдена' })
		}

		// Проверяем, активна ли форма
		if (!form.isActive) {
			return res.status(400).json({ message: 'Форма не активна' })
		}

		// Создаем заявку в базе данных
		const submission = new Submission({
			formId: formId,
			userId: req.user?.id || null, // Если пользователь авторизован
			formData: formData,
			status: 'NEW',
			priority: 'medium',
			bitrixSyncStatus: 'pending',
		})

		await submission.save()

		// Подготавливаем данные для создания сделки в Битрикс24
		const dealData: Record<string, any> = {
			TITLE: `Заявка #${submission.submissionNumber}`,
			STAGE_ID: 'NEW', // Начальный статус
		}

		// Если пользователь авторизован, добавляем информацию о нем
		if (req.user?.id) {
			const user = await User.findById(req.user.id)
			if (user) {
				dealData['ASSIGNED_BY_ID'] = user.bitrix_id || user._id.toString()
				dealData['CONTACT_ID'] = user.bitrix_id // Если у пользователя есть Битрикс ID
			}
		}

		// Проходим по всем полям формы и заполняем данные для сделки
		for (const field of form.fields as unknown as IFormField[]) {
			// Проверяем, есть ли значение для этого поля
			if (formData[field.name] !== undefined) {
				// Маппинг поля формы на поле Битрикс24
				dealData[field.bitrixFieldId] = formData[field.name]
			} else if (field.required) {
				// Если поле обязательное, но значение не предоставлено
				return res
					.status(400)
					.json({ message: `Поле "${field.label}" обязательно для заполнения` })
			}
		}

		// Если указана категория сделки, устанавливаем её
		if (form.bitrixDealCategory) {
			dealData['CATEGORY_ID'] = form.bitrixDealCategory
			submission.bitrixCategoryId = form.bitrixDealCategory
		}

		try {
			// Создаем сделку в Битрикс24
			const dealResponse = await bitrix24Service.createDeal(dealData)

			// Обновляем заявку информацией о созданной сделке
			submission.bitrixDealId = dealResponse.result.toString()
			submission.bitrixSyncStatus = 'synced'
			await submission.save()

			// Добавляем запись в историю
			await new SubmissionHistory({
				submissionId: submission._id,
				action: 'created',
				changeType: 'data_update',
				description: 'Заявка создана и синхронизирована с Битрикс24',
				newValue: { bitrixDealId: dealResponse.result },
				changedBy: req.user?.id || null,
			}).save()
		} catch (bitrixError: any) {
			console.error('Ошибка синхронизации с Битрикс24:', bitrixError)

			// Обновляем статус синхронизации
			submission.bitrixSyncStatus = 'failed'
			submission.bitrixSyncError = bitrixError.message
			await submission.save()

			// Добавляем запись в историю об ошибке
			await new SubmissionHistory({
				submissionId: submission._id,
				action: 'sync_failed',
				changeType: 'data_update',
				description: 'Ошибка синхронизации с Битрикс24',
				newValue: { error: bitrixError.message },
				changedBy: req.user?.id || null,
			}).save()
		}

		// Возвращаем успешный ответ
		res.status(200).json({
			success: true,
			message:
				form.successMessage || 'Спасибо! Ваша заявка успешно отправлена.',
			submissionId: submission._id,
			submissionNumber: submission.submissionNumber,
			dealId: submission.bitrixDealId,
		})
	} catch (error: any) {
		console.error('Ошибка при отправке формы:', error)
		res
			.status(500)
			.json({
				message: 'Произошла ошибка при обработке заявки',
				error: error.message,
			})
	}
}

// Получение всех заявок (для админов)
export const getAllSubmissions = async (req: Request, res: Response) => {
	try {
		const {
			page = 1,
			limit = 20,
			status,
			priority,
			assignedTo,
			userId,
			dateFrom,
			dateTo,
			search,
			tags,
		} = req.query

		// Строим фильтр
		const filter: any = {}

		if (status) filter.status = status
		if (priority) filter.priority = priority
		if (assignedTo) filter.assignedTo = assignedTo
		if (userId) filter.userId = userId
		if (tags && Array.isArray(tags)) filter.tags = { $in: tags }

		// Фильтр по дате
		if (dateFrom || dateTo) {
			filter.createdAt = {}
			if (dateFrom) filter.createdAt.$gte = new Date(dateFrom as string)
			if (dateTo) filter.createdAt.$lte = new Date(dateTo as string)
		}

		// Поиск по номеру заявки или данным формы
		if (search) {
			filter.$or = [
				{ submissionNumber: { $regex: search, $options: 'i' } },
				{ 'formData.company': { $regex: search, $options: 'i' } },
				{ 'formData.contact_name': { $regex: search, $options: 'i' } },
			]
		}

		const skip = (Number(page) - 1) * Number(limit)

		const submissions = await Submission.find(filter)
			.populate('formId', 'name title')
			.populate('userId', 'firstName lastName email')
			.populate('assignedTo', 'firstName lastName email')
			.sort({ createdAt: -1 })
			.skip(skip)
			.limit(Number(limit))

		const total = await Submission.countDocuments(filter)

		res.json({
			success: true,
			data: submissions,
			pagination: {
				page: Number(page),
				limit: Number(limit),
				total,
				pages: Math.ceil(total / Number(limit)),
			},
		})
	} catch (error: any) {
		console.error('Ошибка получения заявок:', error)
		res.status(500).json({
			success: false,
			message: 'Ошибка получения заявок',
		})
	}
}

// Получение заявок текущего пользователя
export const getMySubmissions = async (req: Request, res: Response) => {
	try {
		const { page = 1, limit = 20 } = req.query
		const userId = req.user?.id

		if (!userId) {
			return res.status(401).json({
				success: false,
				message: 'Пользователь не авторизован',
			})
		}

		const skip = (Number(page) - 1) * Number(limit)

		const submissions = await Submission.find({ userId })
			.populate('formId', 'name title')
			.populate('assignedTo', 'firstName lastName email')
			.sort({ createdAt: -1 })
			.skip(skip)
			.limit(Number(limit))

		const total = await Submission.countDocuments({ userId })

		res.json({
			success: true,
			data: submissions,
			pagination: {
				page: Number(page),
				limit: Number(limit),
				total,
				pages: Math.ceil(total / Number(limit)),
			},
		})
	} catch (error: any) {
		console.error('Ошибка получения заявок пользователя:', error)
		res.status(500).json({
			success: false,
			message: 'Ошибка получения заявок',
		})
	}
}

// Получение заявки по ID
export const getSubmissionById = async (req: Request, res: Response) => {
	try {
		const { id } = req.params
		const userId = req.user?.id
		const isAdmin = req.isAdmin

		const submission = await Submission.findById(id)
			.populate('formId', 'name title')
			.populate('userId', 'firstName lastName email')
			.populate('assignedTo', 'firstName lastName email')

		if (!submission) {
			return res.status(404).json({
				success: false,
				message: 'Заявка не найдена',
			})
		}

		// Проверяем права доступа
		if (!isAdmin && submission.userId?.toString() !== userId) {
			return res.status(403).json({
				success: false,
				message: 'Нет прав для просмотра этой заявки',
			})
		}

		// Получаем историю изменений
		const history = await SubmissionHistory.find({ submissionId: id })
			.populate('changedBy', 'firstName lastName email')
			.sort({ createdAt: -1 })

		res.json({
			success: true,
			data: {
				submission,
				history,
			},
		})
	} catch (error: any) {
		console.error('Ошибка получения заявки:', error)
		res.status(500).json({
			success: false,
			message: 'Ошибка получения заявки',
		})
	}
}

// Обновление статуса заявки
export const updateSubmissionStatus = async (req: Request, res: Response) => {
	try {
		const { id } = req.params
		const { status, comment } = req.body
		const userId = req.user?.id

		const submission = await Submission.findById(id)
		if (!submission) {
			return res.status(404).json({
				success: false,
				message: 'Заявка не найдена',
			})
		}

		const oldStatus = submission.status
		submission.status = status
		await submission.save()

		// Добавляем запись в историю
		await new SubmissionHistory({
			submissionId: id,
			action: 'status_changed',
			changeType: 'status_change',
			description: `Статус изменен с "${oldStatus}" на "${status}"`,
			oldValue: oldStatus,
			newValue: status,
			comment,
			changedBy: userId,
		}).save()

		// Синхронизируем с Битрикс24 если есть dealId
		if (submission.bitrixDealId) {
			try {
				await bitrix24Service.updateDealStatus(
					submission.bitrixDealId,
					status,
					submission.bitrixCategoryId
				)
				submission.bitrixSyncStatus = 'synced'
				await submission.save()
			} catch (bitrixError: any) {
				console.error('Ошибка синхронизации статуса с Битрикс24:', bitrixError)
				submission.bitrixSyncStatus = 'failed'
				submission.bitrixSyncError = bitrixError.message
				await submission.save()
			}
		}

		res.json({
			success: true,
			message: 'Статус заявки обновлен',
		})
	} catch (error: any) {
		console.error('Ошибка обновления статуса:', error)
		res.status(500).json({
			success: false,
			message: 'Ошибка обновления статуса',
		})
	}
}

// Обновление заявки
export const updateSubmission = async (req: Request, res: Response) => {
	try {
		const { id } = req.params
		const updateData = req.body
		const userId = req.user?.id

		const submission = await Submission.findById(id)
		if (!submission) {
			return res.status(404).json({
				success: false,
				message: 'Заявка не найдена',
			})
		}

		// Проверяем права доступа
		const isAdmin = req.isAdmin
		if (!isAdmin && submission.userId?.toString() !== userId) {
			return res.status(403).json({
				success: false,
				message: 'Нет прав для редактирования этой заявки',
			})
		}

		const oldData = { ...submission.toObject() }

		// Обновляем поля
		Object.assign(submission, updateData)
		await submission.save()

		// Добавляем запись в историю
		await new SubmissionHistory({
			submissionId: id,
			action: 'updated',
			changeType: 'data_update',
			description: 'Заявка обновлена',
			oldValue: oldData,
			newValue: updateData,
			changedBy: userId,
		}).save()

		res.json({
			success: true,
			data: submission,
			message: 'Заявка обновлена',
		})
	} catch (error: any) {
		console.error('Ошибка обновления заявки:', error)
		res.status(500).json({
			success: false,
			message: 'Ошибка обновления заявки',
		})
	}
}

// Удаление заявки
export const deleteSubmission = async (req: Request, res: Response) => {
	try {
		const { id } = req.params

		const submission = await Submission.findById(id)
		if (!submission) {
			return res.status(404).json({
				success: false,
				message: 'Заявка не найдена',
			})
		}

		await Submission.findByIdAndDelete(id)
		await SubmissionHistory.deleteMany({ submissionId: id })

		res.json({
			success: true,
			message: 'Заявка удалена',
		})
	} catch (error: any) {
		console.error('Ошибка удаления заявки:', error)
		res.status(500).json({
			success: false,
			message: 'Ошибка удаления заявки',
		})
	}
}

// Получение статусов из Битрикс24
export const getBitrixStages = async (req: Request, res: Response) => {
	try {
		const { categoryId } = req.params

		const stages = await bitrix24Service.getDealStages(categoryId)

		res.json({
			success: true,
			data: stages,
		})
	} catch (error: any) {
		console.error('Ошибка получения статусов из Битрикс24:', error)
		res.status(500).json({
			success: false,
			message: 'Ошибка получения статусов',
		})
	}
}
