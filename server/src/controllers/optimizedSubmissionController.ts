import { Request, Response } from 'express'
import { optimizedSubmissionService } from '../services/optimizedSubmissionService'

/**
 * Оптимизированные методы для работы с заявками
 * Используют денормализованные данные и избегают populate операций
 */

// Получение всех заявок (для админов) - ОПТИМИЗИРОВАННАЯ ВЕРСИЯ
export const getOptimizedSubmissions = async (req: Request, res: Response): Promise<void> => {
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
			formId,
			bitrixSyncStatus,
			sortBy = 'createdAt',
			sortOrder = 'desc'
		} = req.query

		// Подготовка фильтров
		const filters = {
			status: status as string,
			priority: priority as string,
			assignedTo: assignedTo as string,
			userId: userId as string,
			dateFrom: dateFrom as string,
			dateTo: dateTo as string,
			search: search as string,
			tags: Array.isArray(tags) ? tags as string[] : tags ? [tags as string] : undefined,
			formId: formId as string,
			bitrixSyncStatus: bitrixSyncStatus as string
		}

		// Подготовка пагинации
		const pagination = {
			page: Number(page),
			limit: Number(limit),
			sortBy: sortBy as string,
			sortOrder: sortOrder as 'asc' | 'desc'
		}

		console.log(`🚀 Оптимизированный запрос заявок: страница ${page}, лимит ${limit}`)
		
		// Используем оптимизированный сервис (БЕЗ populate!)
		const result = await optimizedSubmissionService.getSubmissions(filters, pagination)
		
		console.log(`✅ Получено ${result.data.length} заявок из ${result.pagination.total}`)
		res.status(200).json(result)
	} catch (error: any) {
		console.error('Ошибка при получении заявок:', error)
		res.status(500).json({
			success: false,
			message: 'Ошибка при получении заявок',
			error: error.message,
		})
	}
}

// Получение заявок пользователя - ОПТИМИЗИРОВАННАЯ ВЕРСИЯ
export const getOptimizedUserSubmissions = async (req: Request, res: Response): Promise<void> => {
	try {
		const userId = req.user?.id
		if (!userId) {
			res.status(401).json({
				success: false,
				message: 'Пользователь не авторизован'
			})
			return
		}

		const {
			page = 1,
			limit = 20,
			status,
			priority,
			dateFrom,
			dateTo,
			search,
			tags,
			sortBy = 'createdAt',
			sortOrder = 'desc'
		} = req.query

		const filters = {
			status: status as string,
			priority: priority as string,
			dateFrom: dateFrom as string,
			dateTo: dateTo as string,
			search: search as string,
			tags: Array.isArray(tags) ? tags as string[] : tags ? [tags as string] : undefined,
		}

		const pagination = {
			page: Number(page),
			limit: Number(limit),
			sortBy: sortBy as string,
			sortOrder: sortOrder as 'asc' | 'desc'
		}

		console.log(`🚀 Оптимизированный запрос заявок пользователя ${userId}`)
		
		const result = await optimizedSubmissionService.getUserSubmissions(userId, filters, pagination)
		
		console.log(`✅ Получено ${result.data.length} заявок пользователя`)
		res.status(200).json(result)
	} catch (error: any) {
		console.error('Ошибка при получении заявок пользователя:', error)
		res.status(500).json({
			success: false,
			message: 'Ошибка при получении заявок пользователя',
			error: error.message,
		})
	}
}

// Получение статистики по заявкам - ОПТИМИЗИРОВАННАЯ ВЕРСИЯ
export const getSubmissionStats = async (req: Request, res: Response): Promise<void> => {
	try {
		const {
			assignedTo,
			userId,
			dateFrom,
			dateTo,
			formId
		} = req.query

		const filters = {
			assignedTo: assignedTo as string,
			userId: userId as string,
			dateFrom: dateFrom as string,
			dateTo: dateTo as string,
			formId: formId as string
		}

		console.log('🚀 Оптимизированный запрос статистики заявок')
		
		const stats = await optimizedSubmissionService.getSubmissionStats(filters)
		
		console.log('✅ Получена статистика заявок')
		res.status(200).json({
			success: true,
			data: stats
		})
	} catch (error: any) {
		console.error('Ошибка при получении статистики:', error)
		res.status(500).json({
			success: false,
			message: 'Ошибка при получении статистики',
			error: error.message,
		})
	}
}

// Обновление денормализованных данных
export const updateDenormalizedData = async (req: Request, res: Response): Promise<void> => {
	try {
		const { submissionIds } = req.body

		console.log('🔄 Запуск обновления денормализованных данных')
		
		const updatedCount = await optimizedSubmissionService.updateDenormalizedData(
			submissionIds ? submissionIds : undefined
		)
		
		res.status(200).json({
			success: true,
			message: `Обновлено ${updatedCount} заявок`,
			updatedCount
		})
	} catch (error: any) {
		console.error('Ошибка при обновлении денормализованных данных:', error)
		res.status(500).json({
			success: false,
			message: 'Ошибка при обновлении денормализованных данных',
			error: error.message,
		})
	}
}