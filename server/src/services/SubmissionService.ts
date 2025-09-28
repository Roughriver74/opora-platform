import { BaseService } from './base/BaseService'
import {
	Submission,
	SubmissionPriority,
	BitrixSyncStatus,
} from '../database/entities/Submission.entity'
import {
	SubmissionRepository,
	SubmissionFilters,
	SubmissionStatistics,
} from '../database/repositories/SubmissionRepository'
import {
	getSubmissionRepository,
	getUserRepository,
	getFormRepository,
} from '../database/repositories'
import {
	PaginationOptions,
	PaginatedResult,
} from '../database/repositories/base/BaseRepository'
import {
	SubmissionHistory,
	HistoryActionType,
} from '../database/entities/SubmissionHistory.entity'
import { AppDataSource } from '../database/config/database.config'
import { ElasticsearchService } from './elasticsearchService'

export interface CreateSubmissionDTO {
	formId: string
	userId?: string
	title: string
	priority?: SubmissionPriority
	notes?: string
	tags?: string[]
	bitrixDealId?: string
	formData?: Record<string, any>
	// Денормализованные данные пользователя (для случаев, когда пользователь не авторизован)
	userName?: string
	userEmail?: string
}

export interface UpdateSubmissionDTO {
	title?: string
	status?: string
	priority?: SubmissionPriority
	assignedToId?: string
	notes?: string
	tags?: string[]
	formData?: Record<string, any>
}

export interface SubmissionSearchParams
	extends SubmissionFilters,
		PaginationOptions {}

export class SubmissionService extends BaseService<
	Submission,
	SubmissionRepository
> {
	constructor() {
		super(getSubmissionRepository())
	}

	async createSubmission(data: CreateSubmissionDTO): Promise<Submission> {
		// Получение формы для денормализованных данных
		const formRepository = getFormRepository()
		const form = await formRepository.findById(data.formId)
		if (!form) {
			this.throwNotFound('Форма', data.formId)
		}

		// Получение пользователя для денормализованных данных
		let userData = null
		if (data.userId) {
			const userRepository = getUserRepository()
			const user = await userRepository.findById(data.userId)
			if (user) {
				userData = {
					userId: user.id,
					userEmail: user.email,
					userName: user.fullName,
				}
			}
		}

		// Создание заявки
		const submission = await this.repository.create({
			formId: data.formId,
			userId: data.userId,
			title: data.title,
			status: 'C1:NEW',
			priority: data.priority || SubmissionPriority.MEDIUM,
			notes: data.notes,
			tags: data.tags || [],
			bitrixDealId: data.bitrixDealId,
			bitrixSyncStatus: data.bitrixDealId
				? BitrixSyncStatus.SYNCED
				: BitrixSyncStatus.PENDING,
			formData: data.formData || {},
			// Денормализованные данные
			formName: form.name,
			formTitle: form.title,
			// Приоритет: сначала из переданных данных, затем из БД пользователя
			userEmail: data.userEmail || userData?.userEmail,
			userName: data.userName || userData?.userName,
		})

		// Создание записи в истории
		await this.createHistoryEntry(
			submission.id,
			HistoryActionType.CREATE,
			'Заявка создана',
			data.userId
		)

		// Индексация в Elasticsearch
		try {
			const elasticsearchService = new ElasticsearchService()
			await elasticsearchService.indexSubmission(submission)
		} catch (error) {
			console.error('Ошибка при индексации заявки в Elasticsearch:', error)
			// Не прерываем создание заявки из-за ошибки индексации
		}

		return submission
	}

	async updateSubmission(
		id: string,
		data: UpdateSubmissionDTO,
		updatedBy?: string
	): Promise<Submission | null> {
		const submission = await this.repository.findById(id)
		if (!submission) {
			this.throwNotFound('Заявка', id)
		}

		// Сохранение старых значений для истории
		const oldValues = {
			title: submission.title,
			status: submission.status,
			priority: submission.priority,
			assignedToId: submission.assignedToId,
			formData: submission.formData,
		}

		// Обновление заявки
		const updated = await this.repository.update(id, data)
		if (!updated) return null

		// Создание записей в истории для изменений
		const changes: any[] = []

		if (data.status && data.status !== oldValues.status) {
			await this.createHistoryEntry(
				id,
				HistoryActionType.STATUS_CHANGE,
				`Статус изменен с "${oldValues.status}" на "${data.status}"`,
				updatedBy,
				[{ field: 'status', oldValue: oldValues.status, newValue: data.status }]
			)
		}

		if (
			data.assignedToId !== undefined &&
			data.assignedToId !== oldValues.assignedToId
		) {
			const userRepository = getUserRepository()
			const newAssignee = data.assignedToId
				? await userRepository.findById(data.assignedToId)
				: null

			await this.createHistoryEntry(
				id,
				HistoryActionType.ASSIGN,
				newAssignee
					? `Заявка назначена на ${newAssignee.fullName}`
					: 'Назначение заявки снято',
				updatedBy,
				[
					{
						field: 'assignedToId',
						oldValue: oldValues.assignedToId,
						newValue: data.assignedToId,
					},
				]
			)
		}

		// Специальная обработка для formData
		if (
			data.formData &&
			JSON.stringify(data.formData) !== JSON.stringify(oldValues.formData)
		) {
			changes.push({
				field: 'formData',
				oldValue: oldValues.formData,
				newValue: data.formData,
			})
		}

		// Общее обновление для остальных полей
		Object.keys(data).forEach(key => {
			if (
				key !== 'status' &&
				key !== 'assignedToId' &&
				key !== 'formData' &&
				(data as any)[key] !== (oldValues as any)[key]
			) {
				changes.push({
					field: key,
					oldValue: (oldValues as any)[key],
					newValue: (data as any)[key],
				})
			}
		})

		if (changes.length > 0) {
			await this.createHistoryEntry(
				id,
				HistoryActionType.UPDATE,
				'Заявка обновлена',
				updatedBy,
				changes
			)
		}

		// Индексация обновленной заявки в Elasticsearch
		try {
			const elasticsearchService = new ElasticsearchService()
			await elasticsearchService.indexSubmission(updated)
		} catch (error) {
			console.error(
				'Ошибка при индексации обновленной заявки в Elasticsearch:',
				error
			)
			// Не прерываем обновление заявки из-за ошибки индексации
		}

		return updated
	}

	async findBySubmissionNumber(
		submissionNumber: string
	): Promise<Submission | null> {
		return this.repository.findBySubmissionNumber(submissionNumber)
	}

	async searchSubmissions(
		params: SubmissionSearchParams
	): Promise<PaginatedResult<Submission>> {
		// Если есть поисковый запрос, используем Elasticsearch
		if (params.search && params.search.trim()) {
			try {
				console.log(
					'🔍 SubmissionService.searchSubmissions: поиск через Elasticsearch:',
					{
						query: params.search.trim(),
						type: 'submission',
						limit: params.limit || 20,
						offset: ((params.page || 1) - 1) * (params.limit || 20),
					}
				)

				const elasticsearchService = new ElasticsearchService()
				const searchResults = await elasticsearchService.search({
					query: params.search.trim(),
					type: 'submission',
					limit: params.limit || 20,
					offset: ((params.page || 1) - 1) * (params.limit || 20),
					includeHighlights: false,
					fuzzy: true,
				})

				console.log(
					'🔍 SubmissionService.searchSubmissions: результаты Elasticsearch:',
					{
						count: searchResults.length,
						results: searchResults
							.slice(0, 3)
							.map(r => ({ id: r.id, name: r.name })),
					}
				)

				// Получаем полные данные submissions по ID из Elasticsearch
				// ID в Elasticsearch имеют формат "submission_${id}", нужно извлечь только id
				const submissionIds = searchResults.map(result => {
					// Если ID начинается с "submission_", убираем этот префикс
					return result.id.startsWith('submission_')
						? result.id.replace('submission_', '')
						: result.id
				})

				if (submissionIds.length === 0) {
					return {
						data: [],
						total: 0,
						page: params.page || 1,
						limit: params.limit || 20,
						totalPages: 0,
						hasNext: false,
						hasPrev: false,
					}
				}

				console.log(
					'🔍 SubmissionService.searchSubmissions: получение данных из БД для ID:',
					submissionIds.slice(0, 3)
				)

				const submissions = await this.repository.findByIds(submissionIds, {
					relations: ['user', 'form', 'assignedTo'],
				})

				console.log(
					'🔍 SubmissionService.searchSubmissions: получено из БД:',
					submissions.length,
					'заявок'
				)

				// Сортируем по порядку из Elasticsearch результатов
				const sortedSubmissions = submissionIds
					.map(id => submissions.find(s => s.id === id))
					.filter(Boolean) as Submission[]

				const page = params.page || 1
				const limit = params.limit || 20
				const totalPages = Math.ceil(searchResults.length / limit)

				console.log(
					'🔍 SubmissionService.searchSubmissions: возвращаем результат:',
					{
						dataCount: sortedSubmissions.length,
						total: searchResults.length,
						page,
						limit,
						totalPages,
					}
				)

				return {
					data: sortedSubmissions,
					total: searchResults.length,
					page,
					limit,
					totalPages,
					hasNext: page < totalPages,
					hasPrev: page > 1,
				}
			} catch (error) {
				console.error('❌ Ошибка поиска через Elasticsearch:', error)
				console.error('❌ Детали ошибки:', {
					message: error.message,
					stack: error.stack,
					query: params.search.trim(),
					type: 'submission',
				})
				// Fallback к обычному поиску
				console.log('🔄 Переход к fallback поиску через базу данных')
				return this.repository.findWithFilters(params, params)
			}
		}

		// Обычный поиск без Elasticsearch
		return this.repository.findWithFilters(params, params)
	}

	async findPendingSync(limit: number = 100): Promise<Submission[]> {
		return this.repository.findPendingSync(limit)
	}

	async findByBitrixDealId(bitrixDealId: string): Promise<Submission | null> {
		return this.repository.findByBitrixDealId(bitrixDealId)
	}

	async updateSyncStatus(
		submissionId: string,
		status: BitrixSyncStatus,
		bitrixDealId?: string,
		error?: string
	): Promise<boolean> {
		const result = await this.repository.updateSyncStatus(
			submissionId,
			status,
			bitrixDealId,
			error
		)

		if (result) {
			await this.createHistoryEntry(
				submissionId,
				HistoryActionType.SYNC_BITRIX,
				status === BitrixSyncStatus.SYNCED
					? `Синхронизация с Bitrix24 успешна (ID: ${bitrixDealId})`
					: `Ошибка синхронизации с Bitrix24: ${error}`,
				undefined,
				undefined,
				{ bitrixDealId, error }
			)
		}

		return result
	}

	async assignToUser(
		submissionId: string,
		userId: string | null,
		assignedBy?: string
	): Promise<boolean> {
		const submission = await this.repository.findById(submissionId)
		if (!submission) {
			this.throwNotFound('Заявка', submissionId)
		}

		const result = await this.repository.assignToUser(submissionId, userId)

		if (result && userId) {
			const userRepository = getUserRepository()
			const user = await userRepository.findById(userId)

			await this.createHistoryEntry(
				submissionId,
				HistoryActionType.ASSIGN,
				user ? `Заявка назначена на ${user.fullName}` : 'Заявка назначена',
				assignedBy
			)
		}

		return result
	}

	async updateStatus(
		submissionId: string,
		status: string,
		updatedBy?: string
	): Promise<boolean> {
		const submission = await this.repository.findById(submissionId)
		if (!submission) {
			this.throwNotFound('Заявка', submissionId)
		}

		const oldStatus = submission.status
		const result = await this.repository.updateStatus(submissionId, status)

		if (result) {
			await this.createHistoryEntry(
				submissionId,
				HistoryActionType.STATUS_CHANGE,
				`Статус изменен с "${oldStatus}" на "${status}"`,
				updatedBy,
				[{ field: 'status', oldValue: oldStatus, newValue: status }]
			)
		}

		return result
	}

	async addTags(
		submissionId: string,
		tags: string[],
		updatedBy?: string
	): Promise<boolean> {
		const result = await this.repository.addTags(submissionId, tags)

		if (result) {
			await this.createHistoryEntry(
				submissionId,
				HistoryActionType.UPDATE,
				`Добавлены теги: ${tags.join(', ')}`,
				updatedBy
			)
		}

		return result
	}

	async removeTags(
		submissionId: string,
		tags: string[],
		updatedBy?: string
	): Promise<boolean> {
		const result = await this.repository.removeTags(submissionId, tags)

		if (result) {
			await this.createHistoryEntry(
				submissionId,
				HistoryActionType.UPDATE,
				`Удалены теги: ${tags.join(', ')}`,
				updatedBy
			)
		}

		return result
	}

	async addComment(
		submissionId: string,
		comment: string,
		userId?: string
	): Promise<boolean> {
		const submission = await this.repository.findById(submissionId)
		if (!submission) {
			this.throwNotFound('Заявка', submissionId)
		}

		await this.createHistoryEntry(
			submissionId,
			HistoryActionType.COMMENT,
			comment,
			userId
		)

		return true
	}

	async getStatistics(
		filters?: SubmissionFilters
	): Promise<SubmissionStatistics> {
		return this.repository.getStatistics(filters)
	}

	async getUnassignedSubmissions(): Promise<Submission[]> {
		return this.repository.getUnassignedSubmissions()
	}

	async getOverdueSubmissions(daysOverdue: number = 3): Promise<Submission[]> {
		return this.repository.getOverdueSubmissions(daysOverdue)
	}

	async getSubmissionHistory(
		submissionId: string
	): Promise<SubmissionHistory[]> {
		const historyRepository = AppDataSource.getRepository(SubmissionHistory)

		return historyRepository.find({
			where: { submissionId },
			relations: ['user'],
			order: { createdAt: 'DESC' },
		})
	}

	private async createHistoryEntry(
		submissionId: string,
		actionType: HistoryActionType,
		description: string,
		userId?: string,
		changes?: any[],
		metadata?: Record<string, any>
	): Promise<void> {
		const historyRepository = AppDataSource.getRepository(SubmissionHistory)

		const entry = SubmissionHistory.createEntry(
			submissionId,
			actionType,
			description,
			userId,
			changes,
			metadata
		)

		await historyRepository.save(entry)
	}

	async getUserSubmissions(
		userId: string,
		filters?: SubmissionFilters
	): Promise<PaginatedResult<Submission>> {
		return this.repository.findWithFilters(
			{ ...filters, userId },
			{ page: 1, limit: 20, sortBy: 'createdAt', sortOrder: 'DESC' }
		)
	}

	async getAssignedSubmissions(
		assignedToId: string,
		filters?: SubmissionFilters
	): Promise<PaginatedResult<Submission>> {
		return this.repository.findWithFilters(
			{ ...filters, assignedToId },
			{ page: 1, limit: 20, sortBy: 'createdAt', sortOrder: 'DESC' }
		)
	}

	async createFromFormData(
		formId: string,
		formData: Record<string, any>,
		userId?: string
	): Promise<Submission> {
		// Получение формы
		const formRepository = getFormRepository()
		const form = await formRepository.findWithFields(formId)
		if (!form) {
			this.throwNotFound('Форма', formId)
		}

		// Генерация заголовка заявки
		const title = this.generateSubmissionTitle(form.title, formData)

		// Создание заявки
		return this.createSubmission({
			formId,
			userId,
			title,
			priority: SubmissionPriority.MEDIUM,
		})
	}

	private generateSubmissionTitle(
		formTitle: string,
		formData: Record<string, any>
	): string {
		// Попытка найти имя или email в данных формы
		const name = formData.name || formData.firstName || formData.fullName
		const email = formData.email
		const phone = formData.phone

		if (name) {
			return `${formTitle} - ${name}`
		} else if (email) {
			return `${formTitle} - ${email}`
		} else if (phone) {
			return `${formTitle} - ${phone}`
		}

		return `${formTitle} - ${new Date().toLocaleString('ru-RU')}`
	}

	/**
	 * Получение данных полей формы для заявки из Elasticsearch
	 */
	async getSubmissionFormFields(
		submissionId: string
	): Promise<Record<string, any> | null> {
		try {
			const elasticsearchService = new ElasticsearchService()
			return await elasticsearchService.getSubmissionFormFields(submissionId)
		} catch (error) {
			console.error('Ошибка получения данных полей формы:', error)
			return null
		}
	}
}

// Синглтон для сервиса
let submissionService: SubmissionService | null = null

export const getSubmissionService = (): SubmissionService => {
	if (!submissionService) {
		submissionService = new SubmissionService()
	}
	return submissionService
}
