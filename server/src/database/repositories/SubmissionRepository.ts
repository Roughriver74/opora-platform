import { BaseRepository, PaginationOptions, PaginatedResult } from './base/BaseRepository'
import { Submission, SubmissionPriority, BitrixSyncStatus } from '../entities/Submission.entity'
import { Between, In, IsNull, Not } from 'typeorm'

export interface SubmissionFilters {
	status?: string | string[]
	priority?: SubmissionPriority
	userId?: string
	assignedToId?: string
	formId?: string
	bitrixSyncStatus?: BitrixSyncStatus
	tags?: string[]
	dateFrom?: Date
	dateTo?: Date
	search?: string
}

export interface SubmissionStatistics {
	total: number
	byStatus: Record<string, number>
	byPriority: Record<string, number>
	byForm: Record<string, number>
	avgProcessingTime: number
	todayCount: number
	weekCount: number
	monthCount: number
}

export class SubmissionRepository extends BaseRepository<Submission> {
	constructor() {
		super(Submission, 'submission')
		this.cacheTTL = 300 // 5 минут для заявок
	}

	async findBySubmissionNumber(submissionNumber: string): Promise<Submission | null> {
		return this.repository.findOne({
			where: { submissionNumber },
			relations: ['user', 'form', 'assignedTo'],
		})
	}

	async findWithFilters(
		filters: SubmissionFilters,
		pagination?: PaginationOptions
	): Promise<PaginatedResult<Submission>> {
		const queryBuilder = this.createQueryBuilder('submission')
			.leftJoinAndSelect('submission.user', 'user')
			.leftJoinAndSelect('submission.form', 'form')
			.leftJoinAndSelect('submission.assignedTo', 'assignedTo')

		// Применение фильтров
		if (filters.status) {
			if (Array.isArray(filters.status)) {
				queryBuilder.andWhere('submission.status IN (:...statuses)', { 
					statuses: filters.status 
				})
			} else {
				queryBuilder.andWhere('submission.status = :status', { 
					status: filters.status 
				})
			}
		}

		if (filters.priority) {
			queryBuilder.andWhere('submission.priority = :priority', { 
				priority: filters.priority 
			})
		}

		if (filters.userId) {
			queryBuilder.andWhere('submission.userId = :userId', { 
				userId: filters.userId 
			})
		}

		if (filters.assignedToId) {
			queryBuilder.andWhere('submission.assignedToId = :assignedToId', { 
				assignedToId: filters.assignedToId 
			})
		}

		if (filters.formId) {
			queryBuilder.andWhere('submission.formId = :formId', { 
				formId: filters.formId 
			})
		}

		if (filters.bitrixSyncStatus) {
			queryBuilder.andWhere('submission.bitrixSyncStatus = :syncStatus', { 
				syncStatus: filters.bitrixSyncStatus 
			})
		}

		if (filters.tags && filters.tags.length > 0) {
			queryBuilder.andWhere('submission.tags && :tags', { 
				tags: filters.tags 
			})
		}

		if (filters.dateFrom && filters.dateTo) {
			queryBuilder.andWhere('submission.createdAt BETWEEN :dateFrom AND :dateTo', {
				dateFrom: filters.dateFrom,
				dateTo: filters.dateTo,
			})
		}

		if (filters.search) {
			queryBuilder.andWhere(
				'(submission.submissionNumber LIKE :search OR ' +
				'submission.title LIKE :search OR ' +
				'submission.userEmail LIKE :search OR ' +
				'submission.userName LIKE :search)',
				{ search: `%${filters.search}%` }
			)
		}

		// Подсчет общего количества
		const total = await queryBuilder.getCount()

		// Применение пагинации
		const page = pagination?.page || 1
		const limit = pagination?.limit || 20
		const offset = (page - 1) * limit

		queryBuilder.skip(offset).take(limit)

		// Сортировка
		const sortBy = pagination?.sortBy || 'createdAt'
		const sortOrder = pagination?.sortOrder || 'DESC'
		queryBuilder.orderBy(`submission.${sortBy}`, sortOrder)

		const data = await queryBuilder.getMany()

		return {
			data,
			total,
			page,
			limit,
			totalPages: Math.ceil(total / limit),
			hasNext: page * limit < total,
			hasPrev: page > 1,
		}
	}

	async findPendingSync(limit: number = 100): Promise<Submission[]> {
		return this.repository.find({
			where: {
				bitrixSyncStatus: BitrixSyncStatus.PENDING,
			},
			order: {
				createdAt: 'ASC',
			},
			take: limit,
		})
	}

	async findByBitrixDealId(bitrixDealId: string): Promise<Submission | null> {
		return this.repository.findOne({
			where: { bitrixDealId },
			relations: ['user', 'form'],
		})
	}

	async updateSyncStatus(
		submissionId: string,
		status: BitrixSyncStatus,
		bitrixDealId?: string,
		error?: string
	): Promise<boolean> {
		const updateData: any = {
			bitrixSyncStatus: status,
		}

		if (bitrixDealId) {
			updateData.bitrixDealId = bitrixDealId
		}

		if (error) {
			updateData.bitrixSyncError = error
		}

		const result = await this.repository.update(submissionId, updateData)
		await this.invalidateCache(submissionId)
		
		return result.affected ? result.affected > 0 : false
	}

	async getStatistics(filters?: SubmissionFilters): Promise<SubmissionStatistics> {
		const cacheKey = `${this.cachePrefix}:stats:${JSON.stringify(filters || {})}`
		const cached = await this.cacheGet<SubmissionStatistics>(cacheKey)
		if (cached) return cached

		const queryBuilder = this.createQueryBuilder('submission')

		// Применение базовых фильтров
		if (filters?.userId) {
			queryBuilder.where('submission.userId = :userId', { userId: filters.userId })
		}
		if (filters?.formId) {
			queryBuilder.andWhere('submission.formId = :formId', { formId: filters.formId })
		}

		// Общее количество
		const total = await queryBuilder.getCount()

		// По статусам
		const byStatus = await this.repository
			.createQueryBuilder('submission')
			.select('submission.status', 'status')
			.addSelect('COUNT(*)', 'count')
			.groupBy('submission.status')
			.getRawMany()

		// По приоритетам
		const byPriority = await this.repository
			.createQueryBuilder('submission')
			.select('submission.priority', 'priority')
			.addSelect('COUNT(*)', 'count')
			.groupBy('submission.priority')
			.getRawMany()

		// По формам
		const byForm = await this.repository
			.createQueryBuilder('submission')
			.select('submission.formName', 'formName')
			.addSelect('COUNT(*)', 'count')
			.groupBy('submission.formName')
			.getRawMany()

		// Среднее время обработки
		const avgProcessing = await this.repository
			.createQueryBuilder('submission')
			.select('AVG(submission.processingTimeMinutes)', 'avg')
			.where('submission.processingTimeMinutes IS NOT NULL')
			.getRawOne()

		// Подсчеты за периоды
		const now = new Date()
		const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
		const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
		const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

		const todayCount = await this.repository.count({
			where: { createdAt: Between(todayStart, now) },
		})

		const weekCount = await this.repository.count({
			where: { createdAt: Between(weekStart, now) },
		})

		const monthCount = await this.repository.count({
			where: { createdAt: Between(monthStart, now) },
		})

		const statistics: SubmissionStatistics = {
			total,
			byStatus: byStatus.reduce((acc, item) => {
				acc[item.status] = parseInt(item.count)
				return acc
			}, {} as Record<string, number>),
			byPriority: byPriority.reduce((acc, item) => {
				acc[item.priority] = parseInt(item.count)
				return acc
			}, {} as Record<string, number>),
			byForm: byForm.reduce((acc, item) => {
				acc[item.formName || 'Unknown'] = parseInt(item.count)
				return acc
			}, {} as Record<string, number>),
			avgProcessingTime: Math.round(avgProcessing?.avg || 0),
			todayCount,
			weekCount,
			monthCount,
		}

		// Кеширование на 5 минут
		await this.cacheSet(cacheKey, statistics, 300)

		return statistics
	}

	async assignToUser(submissionId: string, userId: string | null): Promise<boolean> {
		const submission = await this.findById(submissionId)
		if (!submission) return false

		submission.assignedToId = userId || undefined
		
		// Обновление денормализованного поля будет выполнено в @BeforeUpdate
		await this.repository.save(submission)
		await this.invalidateCache(submissionId)
		
		return true
	}

	async updateStatus(submissionId: string, status: string): Promise<boolean> {
		const submission = await this.findById(submissionId)
		if (!submission) return false

		submission.status = status
		
		// Обновление времени обработки будет выполнено в @BeforeUpdate
		await this.repository.save(submission)
		await this.invalidateCache(submissionId)
		
		return true
	}

	async addTags(submissionId: string, tags: string[]): Promise<boolean> {
		const submission = await this.findById(submissionId)
		if (!submission) return false

		submission.tags = [...new Set([...submission.tags, ...tags])]
		await this.repository.save(submission)
		await this.invalidateCache(submissionId)
		
		return true
	}

	async removeTags(submissionId: string, tags: string[]): Promise<boolean> {
		const submission = await this.findById(submissionId)
		if (!submission) return false

		submission.tags = submission.tags.filter(tag => !tags.includes(tag))
		await this.repository.save(submission)
		await this.invalidateCache(submissionId)
		
		return true
	}

	async getUnassignedSubmissions(): Promise<Submission[]> {
		return this.repository.find({
			where: {
				assignedToId: IsNull(),
				status: Not(In(['WON', 'LOSE', 'COMPLETED', 'CLOSED'])),
			},
			order: {
				priority: 'DESC',
				createdAt: 'ASC',
			},
			relations: ['form', 'user'],
		})
	}

	async getOverdueSubmissions(daysOverdue: number = 3): Promise<Submission[]> {
		const overdueDate = new Date()
		overdueDate.setDate(overdueDate.getDate() - daysOverdue)

		return this.repository.find({
			where: {
				createdAt: Not(Between(overdueDate, new Date())),
				status: Not(In(['WON', 'LOSE', 'COMPLETED', 'CLOSED'])),
			},
			order: {
				createdAt: 'ASC',
			},
			relations: ['form', 'user', 'assignedTo'],
		})
	}
}