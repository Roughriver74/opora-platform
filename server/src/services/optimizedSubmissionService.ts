import Submission from '../models/Submission'
import User from '../models/User'
import Form from '../models/Form'

export interface SubmissionFilters {
	status?: string | string[]
	priority?: string | string[]
	assignedTo?: string
	userId?: string
	dateFrom?: string
	dateTo?: string
	search?: string
	tags?: string[]
	formId?: string
	bitrixSyncStatus?: string
}

export interface PaginationOptions {
	page: number
	limit: number
	sortBy?: string
	sortOrder?: 'asc' | 'desc'
}

/**
 * Оптимизированный сервис для работы с заявками
 * Использует денормализованные данные вместо populate для лучшей производительности
 */
export class OptimizedSubmissionService {
	/**
	 * Получение заявок с оптимизированными запросами
	 */
	async getSubmissions(filters: SubmissionFilters = {}, pagination: PaginationOptions) {
		const query: any = {}

		// Построение фильтров с использованием индексов
		if (filters.status) {
			query.status = Array.isArray(filters.status) 
				? { $in: filters.status }
				: filters.status
		}

		if (filters.priority) {
			query.priority = Array.isArray(filters.priority)
				? { $in: filters.priority }
				: filters.priority
		}

		if (filters.assignedTo) {
			query.assignedTo = filters.assignedTo
		}

		if (filters.userId) {
			query.userId = filters.userId
		}

		if (filters.formId) {
			query.formId = filters.formId
		}

		if (filters.bitrixSyncStatus) {
			query.bitrixSyncStatus = filters.bitrixSyncStatus
		}

		if (filters.tags && filters.tags.length > 0) {
			query.tags = { $in: filters.tags }
		}

		// Фильтр по дате (использует индекс createdAt)
		if (filters.dateFrom || filters.dateTo) {
			query.createdAt = {}
			if (filters.dateFrom) {
				query.createdAt.$gte = new Date(filters.dateFrom)
			}
			if (filters.dateTo) {
				query.createdAt.$lte = new Date(filters.dateTo)
			}
		}

		// Поиск по тексту в денормализованных полях (без populate!)
		if (filters.search) {
			const searchRegex = { $regex: filters.search, $options: 'i' }
			query.$or = [
				{ title: searchRegex },
				{ submissionNumber: searchRegex },
				{ userEmail: searchRegex },
				{ userName: searchRegex },
				{ formName: searchRegex },
				{ formTitle: searchRegex },
				{ assignedToName: searchRegex },
				{ notes: searchRegex }
			]
		}

		// Подсчет общего количества
		const total = await Submission.countDocuments(query)

		// Построение запроса с пагинацией
		const { page, limit, sortBy = 'createdAt', sortOrder = 'desc' } = pagination
		const skip = (page - 1) * limit
		const sort: any = { [sortBy]: sortOrder === 'desc' ? -1 : 1 }

		// Выполнение оптимизированного запроса БЕЗ populate
		const submissions = await Submission.find(query)
			.sort(sort)
			.skip(skip)
			.limit(limit)
			.select({
				// Выбираем только нужные поля для уменьшения объема данных
				submissionNumber: 1,
				title: 1,
				status: 1,
				priority: 1,
				bitrixDealId: 1,
				bitrixSyncStatus: 1,
				createdAt: 1,
				updatedAt: 1,
				notes: 1,
				tags: 1,
				// Денормализованные поля (без populate!)
				formName: 1,
				formTitle: 1,
				userEmail: 1,
				userName: 1,
				assignedToName: 1,
				// Предвычисленные поля
				processingTimeMinutes: 1,
				dayOfWeek: 1,
				monthOfYear: 1,
				yearCreated: 1
			})
			.lean() // Возвращает plain objects для лучшей производительности

		return {
			success: true,
			data: submissions,
			pagination: {
				page,
				limit,
				total,
				pages: Math.ceil(total / limit)
			}
		}
	}

	/**
	 * Получение заявок пользователя (оптимизировано)
	 */
	async getUserSubmissions(userId: string, filters: SubmissionFilters = {}, pagination: PaginationOptions) {
		return this.getSubmissions({ ...filters, userId }, pagination)
	}

	/**
	 * Получение заявок ответственного (оптимизировано)
	 */
	async getAssignedSubmissions(assignedTo: string, filters: SubmissionFilters = {}, pagination: PaginationOptions) {
		return this.getSubmissions({ ...filters, assignedTo }, pagination)
	}

	/**
	 * Batch загрузка связанных данных только при необходимости
	 */
	async batchLoadRelatedData(submissionIds: string[]) {
		const submissions = await Submission.find({ 
			_id: { $in: submissionIds } 
		}).select('formId userId assignedTo')

		const formIds = [...new Set(submissions.map(s => s.formId).filter(Boolean))]
		const userIds = [...new Set([
			...submissions.map(s => s.userId).filter(Boolean),
			...submissions.map(s => s.assignedTo).filter(Boolean)
		])]

		// Параллельная загрузка связанных данных
		const [forms, users] = await Promise.all([
			formIds.length > 0 ? Form.find({ _id: { $in: formIds } }).select('name title').lean() : [],
			userIds.length > 0 ? User.find({ _id: { $in: userIds } }).select('email firstName lastName').lean() : []
		])

		// Создаем maps для быстрого поиска
		const formsMap = new Map(forms.map(f => [f._id.toString(), f] as [string, any]))
		const usersMap = new Map(users.map(u => [u._id.toString(), u] as [string, any]))

		return { formsMap, usersMap }
	}

	/**
	 * Получение статистики по заявкам (использует денормализованные поля)
	 */
	async getSubmissionStats(filters: SubmissionFilters = {}) {
		const matchStage: any = {}

		// Применяем те же фильтры, что и в основном методе
		if (filters.dateFrom || filters.dateTo) {
			matchStage.createdAt = {}
			if (filters.dateFrom) matchStage.createdAt.$gte = new Date(filters.dateFrom)
			if (filters.dateTo) matchStage.createdAt.$lte = new Date(filters.dateTo)
		}

		if (filters.assignedTo) matchStage.assignedTo = filters.assignedTo
		if (filters.userId) matchStage.userId = filters.userId
		if (filters.formId) matchStage.formId = filters.formId

		const stats = await Submission.aggregate([
			{ $match: matchStage },
			{
				$group: {
					_id: null,
					totalSubmissions: { $sum: 1 },
					byStatus: {
						$push: {
							status: '$status',
							count: 1
						}
					},
					byPriority: {
						$push: {
							priority: '$priority',
							count: 1
						}
					},
					byForm: {
						$push: {
							formName: '$formName',
							count: 1
						}
					},
					avgProcessingTime: { $avg: '$processingTimeMinutes' },
					totalProcessingTime: { $sum: '$processingTimeMinutes' }
				}
			}
		])

		return stats[0] || {
			totalSubmissions: 0,
			byStatus: [],
			byPriority: [],
			byForm: [],
			avgProcessingTime: 0,
			totalProcessingTime: 0
		}
	}

	/**
	 * Обновление денормализованных данных для существующих заявок
	 */
	async updateDenormalizedData(submissionIds?: string[]) {
		const query = submissionIds 
			? { _id: { $in: submissionIds } }
			: {}

		const submissions = await Submission.find(query)

		console.log(`🔄 Обновление денормализованных данных для ${submissions.length} заявок`)

		for (const submission of submissions) {
			// Принудительно пересохраняем для срабатывания pre-save hooks
			await submission.save()
		}

		console.log(`✅ Обновлено ${submissions.length} заявок`)
		return submissions.length
	}
}

export const optimizedSubmissionService = new OptimizedSubmissionService()