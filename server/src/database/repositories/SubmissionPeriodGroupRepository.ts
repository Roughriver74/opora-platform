import { BaseRepository } from './base/BaseRepository'
import {
	SubmissionPeriodGroup,
	PeriodGroupStatus,
} from '../entities/SubmissionPeriodGroup.entity'

/**
 * Фильтры для поиска групп периодических заявок
 */
export interface PeriodGroupFilters {
	formId?: string
	createdById?: string
	status?: PeriodGroupStatus
	dateFrom?: Date
	dateTo?: Date
}

/**
 * Repository для работы с группами периодических заявок
 */
export class SubmissionPeriodGroupRepository extends BaseRepository<SubmissionPeriodGroup> {
	constructor() {
		super(SubmissionPeriodGroup, 'submission_period_group')
		this.cacheTTL = 600 // 10 минут для групп периода
	}

	/**
	 * Находит группу по ID с загрузкой заявок
	 */
	async findByIdWithSubmissions(
		id: string
	): Promise<SubmissionPeriodGroup | null> {
		return this.repository.findOne({
			where: { id },
			relations: ['submissions', 'createdBy', 'form'],
			order: {
				submissions: {
					periodPosition: 'ASC',
				},
			},
		})
	}

	/**
	 * Находит группы с фильтрацией
	 */
	async findWithFilters(
		filters: PeriodGroupFilters
	): Promise<SubmissionPeriodGroup[]> {
		const query = this.repository
			.createQueryBuilder('period_group')
			.leftJoinAndSelect('period_group.form', 'form')
			.leftJoinAndSelect('period_group.createdBy', 'createdBy')

		if (filters.formId) {
			query.andWhere('period_group.formId = :formId', {
				formId: filters.formId,
			})
		}

		if (filters.createdById) {
			query.andWhere('period_group.createdById = :createdById', {
				createdById: filters.createdById,
			})
		}

		if (filters.status) {
			query.andWhere('period_group.status = :status', {
				status: filters.status,
			})
		}

		if (filters.dateFrom) {
			query.andWhere('period_group.startDate >= :dateFrom', {
				dateFrom: filters.dateFrom,
			})
		}

		if (filters.dateTo) {
			query.andWhere('period_group.endDate <= :dateTo', {
				dateTo: filters.dateTo,
			})
		}

		query.orderBy('period_group.createdAt', 'DESC')

		return query.getMany()
	}

	/**
	 * Обновляет статус группы
	 */
	async updateStatus(
		id: string,
		status: PeriodGroupStatus
	): Promise<boolean> {
		const result = await this.repository.update(id, { status })
		return result.affected ? result.affected > 0 : false
	}

	/**
	 * Находит активные группы периодов
	 */
	async findActiveGroups(): Promise<SubmissionPeriodGroup[]> {
		return this.repository.find({
			where: { status: PeriodGroupStatus.ACTIVE },
			relations: ['form', 'createdBy'],
			order: { createdAt: 'DESC' },
		})
	}

	/**
	 * Находит группы по форме
	 */
	async findByFormId(formId: string): Promise<SubmissionPeriodGroup[]> {
		return this.repository.find({
			where: { formId },
			relations: ['createdBy'],
			order: { createdAt: 'DESC' },
		})
	}

	/**
	 * Подсчитывает количество заявок в группе
	 */
	async countSubmissions(periodGroupId: string): Promise<number> {
		const group = await this.repository.findOne({
			where: { id: periodGroupId },
			relations: ['submissions'],
		})

		return group?.submissions?.length || 0
	}

	/**
	 * Обновляет количество заявок в группе
	 */
	async updateTotalSubmissions(
		id: string,
		totalSubmissions: number
	): Promise<boolean> {
		const result = await this.repository.update(id, { totalSubmissions })
		return result.affected ? result.affected > 0 : false
	}
}

// Синглтон repository
let periodGroupRepository: SubmissionPeriodGroupRepository | null = null

export const getSubmissionPeriodGroupRepository =
	(): SubmissionPeriodGroupRepository => {
		if (!periodGroupRepository) {
			periodGroupRepository = new SubmissionPeriodGroupRepository()
		}
		return periodGroupRepository
	}
