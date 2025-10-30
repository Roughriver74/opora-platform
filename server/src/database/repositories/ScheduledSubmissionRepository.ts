import { BaseRepository } from './base/BaseRepository'
import {
	ScheduledSubmission,
	ScheduledSubmissionStatus,
} from '../entities/ScheduledSubmission.entity'

export interface ScheduledSubmissionFilters {
	status?: ScheduledSubmissionStatus | ScheduledSubmissionStatus[]
	periodGroupId?: string
	formId?: string
	assignedToId?: string
	scheduledDate?: Date | { from: Date; to: Date }
	userId?: string
}

export class ScheduledSubmissionRepository extends BaseRepository<ScheduledSubmission> {
	constructor() {
		super(ScheduledSubmission, 'scheduled_submission')
	}

	/**
	 * Находит запланированные заявки, готовые к обработке
	 */
	async findReadyToProcess(limit: number = 100): Promise<ScheduledSubmission[]> {
		const now = new Date()
		const todayDate = new Date(now)
		todayDate.setHours(0, 0, 0, 0)

		const query = this.repository
			.createQueryBuilder('scheduled')
			.leftJoinAndSelect('scheduled.form', 'form')
			.leftJoinAndSelect('scheduled.periodGroup', 'periodGroup')
			.leftJoinAndSelect('scheduled.assignedTo', 'assignedTo')
			.where('scheduled.status = :status', {
				status: ScheduledSubmissionStatus.PENDING,
			})
			.andWhere('scheduled.scheduledDate <= :today', { today: todayDate })
			.orderBy('scheduled.scheduledDate', 'ASC')
			.addOrderBy('scheduled.scheduledTime', 'ASC')
			.take(limit)

		return query.getMany()
	}

	/**
	 * Находит запланированные заявки по группе периода
	 */
	async findByPeriodGroup(
		periodGroupId: string,
		filters?: {
			status?: ScheduledSubmissionStatus
		}
	): Promise<ScheduledSubmission[]> {
		const query = this.repository
			.createQueryBuilder('scheduled')
			.leftJoinAndSelect('scheduled.submission', 'submission')
			.where('scheduled.periodGroupId = :periodGroupId', { periodGroupId })

		if (filters?.status) {
			query.andWhere('scheduled.status = :status', { status: filters.status })
		}

		return query
			.orderBy('scheduled.periodPosition', 'ASC')
			.getMany()
	}

	/**
	 * Находит запланированные заявки с фильтрами
	 */
	async findWithFilters(
		filters: ScheduledSubmissionFilters,
		options?: {
			page?: number
			limit?: number
			includeRelations?: boolean
		}
	): Promise<{
		data: ScheduledSubmission[]
		total: number
	}> {
		const query = this.repository.createQueryBuilder('scheduled')

		// Добавляем связи, если нужно
		if (options?.includeRelations) {
			query.leftJoinAndSelect('scheduled.form', 'form')
			query.leftJoinAndSelect('scheduled.periodGroup', 'periodGroup')
			query.leftJoinAndSelect('scheduled.assignedTo', 'assignedTo')
			query.leftJoinAndSelect('scheduled.submission', 'submission')
		}

		// Фильтр по статусу
		if (filters.status) {
			if (Array.isArray(filters.status)) {
				query.andWhere('scheduled.status IN (:...statuses)', {
					statuses: filters.status,
				})
			} else {
				query.andWhere('scheduled.status = :status', { status: filters.status })
			}
		}

		// Фильтр по группе периода
		if (filters.periodGroupId) {
			query.andWhere('scheduled.periodGroupId = :periodGroupId', {
				periodGroupId: filters.periodGroupId,
			})
		}

		// Фильтр по форме
		if (filters.formId) {
			query.andWhere('scheduled.formId = :formId', { formId: filters.formId })
		}

		// Фильтр по ответственному
		if (filters.assignedToId) {
			query.andWhere('scheduled.assignedToId = :assignedToId', {
				assignedToId: filters.assignedToId,
			})
		}

		// Фильтр по пользователю
		if (filters.userId) {
			query.andWhere('scheduled.userId = :userId', { userId: filters.userId })
		}

		// Фильтр по дате
		if (filters.scheduledDate) {
			if ('from' in filters.scheduledDate && 'to' in filters.scheduledDate) {
				query.andWhere('scheduled.scheduledDate BETWEEN :from AND :to', {
					from: filters.scheduledDate.from,
					to: filters.scheduledDate.to,
				})
			} else {
				query.andWhere('scheduled.scheduledDate = :date', {
					date: filters.scheduledDate,
				})
			}
		}

		// Подсчитываем общее количество
		const total = await query.getCount()

		// Добавляем пагинацию
		if (options?.page && options?.limit) {
			const offset = (options.page - 1) * options.limit
			query.skip(offset).take(options.limit)
		}

		// Сортировка
		query.orderBy('scheduled.scheduledDate', 'ASC')
		query.addOrderBy('scheduled.periodPosition', 'ASC')

		const data = await query.getMany()

		return { data, total }
	}

	/**
	 * Обновляет статус запланированной заявки
	 */
	async updateStatus(
		id: string,
		status: ScheduledSubmissionStatus,
		additionalData?: {
			error?: string
			submissionId?: string
			jobId?: string
			processedAt?: Date
		}
	): Promise<boolean> {
		const updateData: any = { status }

		if (additionalData) {
			Object.assign(updateData, additionalData)
		}

		const result = await this.repository.update(id, updateData)
		return result.affected > 0
	}

	/**
	 * Увеличивает счетчик попыток
	 */
	async incrementAttempts(id: string): Promise<boolean> {
		const result = await this.repository
			.createQueryBuilder()
			.update()
			.set({
				attempts: () => 'attempts + 1',
			})
			.where('id = :id', { id })
			.execute()

		return result.affected > 0
	}

	/**
	 * Сбрасывает неудачные задачи для повторной обработки
	 */
	async resetFailedJobs(
		maxAttempts: number = 3,
		olderThanHours: number = 1
	): Promise<number> {
		const cutoffTime = new Date()
		cutoffTime.setHours(cutoffTime.getHours() - olderThanHours)

		const result = await this.repository
			.createQueryBuilder()
			.update()
			.set({
				status: ScheduledSubmissionStatus.PENDING,
				jobId: null,
				error: null,
			})
			.where('status = :status', { status: ScheduledSubmissionStatus.FAILED })
			.andWhere('attempts < :maxAttempts', { maxAttempts })
			.andWhere('updatedAt < :cutoffTime', { cutoffTime })
			.execute()

		return result.affected || 0
	}

	/**
	 * Отменяет все запланированные заявки для группы периода
	 */
	async cancelByPeriodGroup(periodGroupId: string): Promise<number> {
		const result = await this.repository
			.createQueryBuilder()
			.update()
			.set({
				status: ScheduledSubmissionStatus.CANCELLED,
				processedAt: new Date(),
			})
			.where('periodGroupId = :periodGroupId', { periodGroupId })
			.andWhere('status = :status', {
				status: ScheduledSubmissionStatus.PENDING,
			})
			.execute()

		return result.affected || 0
	}

	/**
	 * Получает статистику по запланированным заявкам
	 */
	async getStatistics(filters?: {
		periodGroupId?: string
		formId?: string
	}): Promise<{
		total: number
		pending: number
		processing: number
		completed: number
		failed: number
		cancelled: number
	}> {
		const query = this.repository
			.createQueryBuilder('scheduled')
			.select('scheduled.status', 'status')
			.addSelect('COUNT(*)', 'count')

		if (filters?.periodGroupId) {
			query.where('scheduled.periodGroupId = :periodGroupId', {
				periodGroupId: filters.periodGroupId,
			})
		}

		if (filters?.formId) {
			query.andWhere('scheduled.formId = :formId', { formId: filters.formId })
		}

		const results = await query.groupBy('scheduled.status').getRawMany()

		const statistics = {
			total: 0,
			pending: 0,
			processing: 0,
			completed: 0,
			failed: 0,
			cancelled: 0,
		}

		results.forEach(result => {
			const count = parseInt(result.count, 10)
			statistics.total += count

			switch (result.status) {
				case ScheduledSubmissionStatus.PENDING:
					statistics.pending = count
					break
				case ScheduledSubmissionStatus.PROCESSING:
					statistics.processing = count
					break
				case ScheduledSubmissionStatus.COMPLETED:
					statistics.completed = count
					break
				case ScheduledSubmissionStatus.FAILED:
					statistics.failed = count
					break
				case ScheduledSubmissionStatus.CANCELLED:
					statistics.cancelled = count
					break
			}
		})

		return statistics
	}
}

// Экспорт функции для получения экземпляра репозитория
let scheduledSubmissionRepository: ScheduledSubmissionRepository | null = null

export const getScheduledSubmissionRepository =
	(): ScheduledSubmissionRepository => {
		if (!scheduledSubmissionRepository) {
			scheduledSubmissionRepository = new ScheduledSubmissionRepository()
		}
		return scheduledSubmissionRepository
	}