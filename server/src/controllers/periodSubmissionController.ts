import { Request, Response } from 'express'
import { getPeriodSubmissionService } from '../services/PeriodSubmissionService'
import { SubmissionPriority } from '../database/entities/Submission.entity'
import { getUserService } from '../services/UserService'

const periodSubmissionService = getPeriodSubmissionService()
const userService = getUserService()

/**
 * Создание периодических заявок
 * POST /api/submissions/period
 */
export const createPeriodSubmissions = async (req: Request, res: Response): Promise<void> => {
	try {
		const { formId, formData, periodConfig } = req.body

		console.log('[CREATE_PERIOD] Запрос на создание периодических заявок:', {
			formId,
			periodConfig,
			userId: req.user?.id,
			formDataKeys: Object.keys(formData || {}).length,
			hasFormData: !!formData,
			formDataSample: formData ? Object.fromEntries(Object.entries(formData).slice(0, 5)) : null,
		})

		// Валидация параметров
		if (!formId || !formData || !periodConfig) {
			res.status(400).json({
				success: false,
				message: 'Необходимо указать formId, formData и periodConfig',
			})
			return
		}

		if (
			!periodConfig.startDate ||
			!periodConfig.endDate ||
			!periodConfig.dateFieldName
		) {
			res.status(400).json({
				success: false,
				message:
					'В periodConfig необходимо указать startDate, endDate и dateFieldName',
			})
			return
		}

		// Проверяем авторизацию
		if (!req.user?.id) {
			res.status(401).json({
				success: false,
				message: 'Необходима авторизация для создания периодических заявок',
			})
			return
		}

		// Получаем данные пользователя
		const user = await userService.findById(req.user.id)
		if (!user) {
			res.status(404).json({
				success: false,
				message: 'Пользователь не найден',
			})
			return
		}

		const userData = {
			userId: user.id,
			userName: user.fullName,
			userEmail: user.email,
		}

		// Создаем периодические заявки
		const result = await periodSubmissionService.createPeriodSubmissions({
			formId,
			formData,
			periodConfig: {
				startDate: periodConfig.startDate,
				endDate: periodConfig.endDate,
				dateFieldName: periodConfig.dateFieldName,
				time: periodConfig.time,
				timeFieldName: periodConfig.timeFieldName,
			},
			userId: userData.userId,
			userName: userData.userName,
			userEmail: userData.userEmail,
			// Ответственный: если не указан явно, используем Bitrix ID создателя заявки
		assignedToId: periodConfig.assignedToId || user.bitrixUserId,
			priority: periodConfig.priority || SubmissionPriority.MEDIUM,
		})

		console.log('[CREATE_PERIOD] ✅ Успешно запланировано заявок:', result.totalScheduled)

		res.status(200).json({
			success: true,
			message: `Успешно запланировано ${result.totalScheduled} заявок на период ${result.period.daysCount} дней`,
			data: {
				periodGroupId: result.periodGroupId,
				totalScheduled: result.totalScheduled,
				period: result.period,
				scheduledSubmissions: result.scheduledSubmissions.map(s => ({
					id: s.id,
					scheduledDate: s.scheduledDate,
					periodPosition: s.periodPosition,
				})),
			},
		})
	} catch (error: any) {
		console.error('[CREATE_PERIOD] ❌ Ошибка создания периодических заявок:', error)
		res.status(500).json({
			success: false,
			message: 'Ошибка создания периодических заявок',
			error: error.message,
		})
	}
}

/**
 * Получение информации о группе периода
 * GET /api/submissions/period/:periodGroupId
 */
export const getPeriodGroup = async (req: Request, res: Response): Promise<void> => {
	try {
		const { periodGroupId } = req.params

		const group = await periodSubmissionService.getPeriodGroup(periodGroupId)

		if (!group) {
			res.status(404).json({
				success: false,
				message: 'Группа периода не найдена',
			})
			return
		}

		res.status(200).json({
			success: true,
			data: group.toPublicJSON(),
		})
	} catch (error: any) {
		console.error('[GET_PERIOD_GROUP] Ошибка:', error)
		res.status(500).json({
			success: false,
			message: 'Ошибка получения группы периода',
			error: error.message,
		})
	}
}

/**
 * Получение всех заявок периода
 * GET /api/submissions/period/:periodGroupId/submissions
 */
export const getPeriodSubmissions = async (req: Request, res: Response): Promise<void> => {
	try {
		const { periodGroupId } = req.params

		const submissions = await periodSubmissionService.getPeriodSubmissions(
			periodGroupId
		)

		res.status(200).json({
			success: true,
			data: submissions,
		})
	} catch (error: any) {
		console.error('[GET_PERIOD_SUBMISSIONS] Ошибка:', error)
		res.status(500).json({
			success: false,
			message: 'Ошибка получения заявок периода',
			error: error.message,
		})
	}
}

/**
 * Отмена всех заявок периода
 * POST /api/submissions/period/:periodGroupId/cancel
 */
export const cancelPeriodGroup = async (req: Request, res: Response): Promise<void> => {
	try {
		const { periodGroupId } = req.params
		const userId = req.user?.id

		await periodSubmissionService.cancelPeriodGroup(periodGroupId, userId)

		res.status(200).json({
			success: true,
			message: 'Группа периода успешно отменена',
		})
	} catch (error: any) {
		console.error('[CANCEL_PERIOD_GROUP] Ошибка:', error)
		res.status(500).json({
			success: false,
			message: 'Ошибка отмены группы периода',
			error: error.message,
		})
	}
}

/**
 * Обновление всех заявок периода
 * PATCH /api/submissions/period/:periodGroupId
 */
export const updatePeriodGroup = async (req: Request, res: Response): Promise<void> => {
	try {
		const { periodGroupId } = req.params
		const { updates } = req.body
		const userId = req.user?.id

		if (!updates) {
			res.status(400).json({
				success: false,
				message: 'Необходимо указать updates',
			})
			return
		}

		await periodSubmissionService.updatePeriodSubmissions(
			periodGroupId,
			updates,
			userId
		)

		res.status(200).json({
			success: true,
			message: 'Группа периода успешно обновлена',
		})
	} catch (error: any) {
		console.error('[UPDATE_PERIOD_GROUP] Ошибка:', error)
		res.status(500).json({
			success: false,
			message: 'Ошибка обновления группы периода',
			error: error.message,
		})
	}
}
