import { Brackets } from 'typeorm'
import { BaseRepository, PaginatedResult, PaginationOptions } from './base/BaseRepository'
import { Visit, VisitStatus } from '../entities/Visit.entity'

/**
 * Опции фильтрации визитов
 */
export interface VisitFilterOptions {
	organizationId?: string
	userId?: string
	companyId?: string
	status?: VisitStatus
	dateFrom?: Date
	dateTo?: Date
	search?: string
	page?: number
	limit?: number
	sortBy?: string
	sortOrder?: 'ASC' | 'DESC'
}

/**
 * Репозиторий для работы с визитами
 */
export class VisitRepository extends BaseRepository<Visit> {
	constructor() {
		super(Visit, 'visits')
		this.cacheTTL = 1800 // 30 минут
	}

	/**
	 * Получить визиты с фильтрами и пагинацией
	 */
	async findWithFilters(
		options: PaginationOptions & VisitFilterOptions
	): Promise<PaginatedResult<Visit>> {
		const qb = this.createQueryBuilder('v')
			.leftJoinAndSelect('v.company', 'company')
			.leftJoinAndSelect('v.user', 'user')

		// Фильтр по организации (мультитенантность)
		if (options.organizationId) {
			qb.andWhere('v.organization_id = :organizationId', { organizationId: options.organizationId })
		}

		// Фильтр по пользователю
		if (options.userId) {
			qb.andWhere('v.user_id = :userId', { userId: options.userId })
		}

		// Фильтр по компании
		if (options.companyId) {
			qb.andWhere('v.company_id = :companyId', { companyId: options.companyId })
		}

		// Фильтр по статусу
		if (options.status) {
			qb.andWhere('v.status = :status', { status: options.status })
		}

		// Фильтр по дате начала диапазона
		if (options.dateFrom) {
			qb.andWhere('v.date >= :dateFrom', { dateFrom: options.dateFrom })
		}

		// Фильтр по дате конца диапазона
		if (options.dateTo) {
			qb.andWhere('v.date <= :dateTo', { dateTo: options.dateTo })
		}

		// Поиск по тексту
		if (options.search) {
			qb.andWhere(
				new Brackets(qb2 => {
					qb2
						.where('company.name ILIKE :search', { search: `%${options.search}%` })
						.orWhere("CONCAT(user.first_name, ' ', user.last_name) ILIKE :search", {
							search: `%${options.search}%`,
						})
						.orWhere('v.comment ILIKE :search', { search: `%${options.search}%` })
				})
			)
		}

		// Сортировка (по умолчанию — дата убывающая)
		const sortBy = options.sortBy || 'date'
		const sortOrder = options.sortOrder || 'DESC'
		qb.orderBy(`v.${sortBy}`, sortOrder)

		// Пагинация
		const page = Math.max(1, options.page || 1)
		const limit = Math.min(100, Math.max(1, options.limit || 20))
		const skip = (page - 1) * limit

		qb.skip(skip).take(limit)

		const [data, total] = await qb.getManyAndCount()
		const totalPages = Math.ceil(total / limit)

		return {
			data,
			total,
			page,
			limit,
			totalPages,
			hasNext: page < totalPages,
			hasPrev: page > 1,
		}
	}

	/**
	 * Получить визиты для календаря в заданном диапазоне дат
	 */
	async findCalendar(organizationId: string, dateFrom: Date, dateTo: Date): Promise<Visit[]> {
		return this.createQueryBuilder('v')
			.leftJoinAndSelect('v.company', 'company')
			.where('v.organization_id = :organizationId', { organizationId })
			.andWhere('v.date >= :dateFrom', { dateFrom })
			.andWhere('v.date <= :dateTo', { dateTo })
			.orderBy('v.date', 'ASC')
			.getMany()
	}
}

/**
 * Singleton-геттер репозитория визитов
 */
let visitRepositoryInstance: VisitRepository | null = null

export function getVisitRepository(): VisitRepository {
	if (!visitRepositoryInstance) {
		visitRepositoryInstance = new VisitRepository()
	}
	return visitRepositoryInstance
}
