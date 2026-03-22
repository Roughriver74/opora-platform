import { In, Brackets } from 'typeorm'
import { BaseRepository, PaginatedResult, PaginationOptions } from './base/BaseRepository'
import { Company, CompanyType, CompanySyncStatus } from '../entities/Company.entity'

/**
 * Опции фильтрации компаний
 */
export interface CompanyFilterOptions {
	companyType?: CompanyType
	syncStatus?: CompanySyncStatus
	isActive?: boolean
	search?: string
	tags?: string[]
	industry?: string
	// Мультитенантность
	organizationId?: string
}

/**
 * Репозиторий для работы с компаниями
 */
export class CompanyRepository extends BaseRepository<Company> {
	constructor() {
		super(Company, 'company')
		this.cacheTTL = 1800 // 30 минут
	}

	/**
	 * Найти по ИНН
	 */
	async findByInn(inn: string): Promise<Company | null> {
		return this.findOne({
			where: { inn },
		})
	}

	/**
	 * Найти по Bitrix Company ID
	 */
	async findByBitrixId(bitrixCompanyId: string): Promise<Company | null> {
		return this.findOne({
			where: { bitrixCompanyId },
		})
	}

	/**
	 * Поиск по имени (ILIKE)
	 */
	async searchByName(query: string, limit: number = 20): Promise<Company[]> {
		return this.createQueryBuilder('c')
			.where('c.is_active = true')
			.andWhere(
				new Brackets(qb => {
					qb.where('c.name ILIKE :query', { query: `%${query}%` })
						.orWhere('c.short_name ILIKE :query', { query: `%${query}%` })
						.orWhere('c.inn ILIKE :query', { query: `%${query}%` })
				})
			)
			.orderBy('c.name', 'ASC')
			.limit(limit)
			.getMany()
	}

	/**
	 * Полнотекстовый поиск через tsvector
	 */
	async fullTextSearch(query: string, limit: number = 20): Promise<Company[]> {
		// Преобразуем запрос для tsquery
		const tsQuery = query
			.trim()
			.split(/\s+/)
			.filter(word => word.length > 1)
			.map(word => `${word}:*`)
			.join(' & ')

		if (!tsQuery) {
			return this.searchByName(query, limit)
		}

		return this.createQueryBuilder('c')
			.where("c.search_vector @@ to_tsquery('russian', :tsQuery)", { tsQuery })
			.andWhere('c.is_active = true')
			.orderBy("ts_rank(c.search_vector, to_tsquery('russian', :tsQuery))", 'DESC')
			.limit(limit)
			.setParameters({ tsQuery })
			.getMany()
	}

	/**
	 * Нечеткий (триграммный) поиск
	 */
	async fuzzySearch(query: string, limit: number = 20, threshold: number = 0.3): Promise<Company[]> {
		return this.createQueryBuilder('c')
			.where('similarity(c.name, :query) > :threshold', { query, threshold })
			.andWhere('c.is_active = true')
			.orderBy('similarity(c.name, :query)', 'DESC')
			.limit(limit)
			.getMany()
	}

	/**
	 * Комбинированный поиск (полнотекстовый + ILIKE fallback)
	 */
	async search(query: string, limit: number = 20): Promise<Company[]> {
		// Сначала пробуем полнотекстовый поиск
		let results = await this.fullTextSearch(query, limit)

		// Если мало результатов, добавляем ILIKE поиск
		if (results.length < limit) {
			const ilikeResults = await this.searchByName(query, limit - results.length)
			const existingIds = new Set(results.map(r => r.id))

			// Добавляем только те, которых еще нет
			for (const item of ilikeResults) {
				if (!existingIds.has(item.id)) {
					results.push(item)
				}
			}
		}

		return results.slice(0, limit)
	}

	/**
	 * Получить все активные с пагинацией и фильтрами
	 */
	async findWithFilters(
		options: PaginationOptions & CompanyFilterOptions
	): Promise<PaginatedResult<Company>> {
		const qb = this.createQueryBuilder('c')

		// Фильтр по активности
		if (options.isActive !== undefined) {
			qb.andWhere('c.is_active = :isActive', { isActive: options.isActive })
		}

		// Фильтр по типу
		if (options.companyType) {
			qb.andWhere('c.company_type = :companyType', { companyType: options.companyType })
		}

		// Фильтр по статусу синхронизации
		if (options.syncStatus) {
			qb.andWhere('c.sync_status = :syncStatus', { syncStatus: options.syncStatus })
		}

		// Поиск по тексту
		if (options.search) {
			qb.andWhere(
				new Brackets(qb2 => {
					qb2.where('c.name ILIKE :search', { search: `%${options.search}%` })
						.orWhere('c.short_name ILIKE :search', { search: `%${options.search}%` })
						.orWhere('c.inn ILIKE :search', { search: `%${options.search}%` })
						.orWhere('c.phone ILIKE :search', { search: `%${options.search}%` })
						.orWhere('c.email ILIKE :search', { search: `%${options.search}%` })
				})
			)
		}

		// Фильтр по тегам
		if (options.tags && options.tags.length > 0) {
			qb.andWhere('c.tags && :tags', { tags: options.tags })
		}

		// Фильтр по отрасли
		if (options.industry) {
			qb.andWhere('c.industry = :industry', { industry: options.industry })
		}

		// Фильтр по организации (мультитенантность)
		if (options.organizationId) {
			qb.andWhere('c.organization_id = :organizationId', { organizationId: options.organizationId })
		}

		// Сортировка
		const sortBy = options.sortBy || 'name'
		const sortOrder = options.sortOrder || 'ASC'
		qb.orderBy(`c.${sortBy}`, sortOrder)

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
	 * Получить компании с ошибками синхронизации
	 */
	async findWithSyncErrors(): Promise<Company[]> {
		return this.findAll({
			where: { syncStatus: CompanySyncStatus.ERROR },
			order: { updatedAt: 'DESC' },
		})
	}

	/**
	 * Получить компании, требующие синхронизации
	 */
	async findPendingSync(): Promise<Company[]> {
		return this.findAll({
			where: { syncStatus: CompanySyncStatus.PENDING },
		})
	}

	/**
	 * Получить компании по нескольким Bitrix ID
	 */
	async findByBitrixIds(bitrixIds: string[]): Promise<Company[]> {
		if (bitrixIds.length === 0) return []

		return this.findAll({
			where: { bitrixCompanyId: In(bitrixIds) },
		})
	}

	/**
	 * Проверить существование ИНН
	 */
	async isInnExists(inn: string, excludeId?: string): Promise<boolean> {
		const qb = this.createQueryBuilder('c')
			.where('c.inn = :inn', { inn })

		if (excludeId) {
			qb.andWhere('c.id != :excludeId', { excludeId })
		}

		const count = await qb.getCount()
		return count > 0
	}

	/**
	 * Проверить существование Bitrix ID
	 */
	async isBitrixIdExists(bitrixCompanyId: string, excludeId?: string): Promise<boolean> {
		const qb = this.createQueryBuilder('c')
			.where('c.bitrix_company_id = :bitrixCompanyId', { bitrixCompanyId })

		if (excludeId) {
			qb.andWhere('c.id != :excludeId', { excludeId })
		}

		const count = await qb.getCount()
		return count > 0
	}

	/**
	 * Обновить статус синхронизации для нескольких записей
	 */
	async updateSyncStatus(
		ids: string[],
		status: CompanySyncStatus,
		error?: { message: string; code?: string }
	): Promise<number> {
		if (ids.length === 0) return 0

		const updateData: any = {
			syncStatus: status,
			lastSyncAt: new Date(),
		}

		if (status === CompanySyncStatus.ERROR && error) {
			updateData.syncError = { ...error, timestamp: new Date() }
		} else if (status === CompanySyncStatus.SYNCED) {
			updateData.syncError = null
		}

		const result = await this.createQueryBuilder()
			.update(Company)
			.set(updateData)
			.whereInIds(ids)
			.execute()

		return result.affected || 0
	}

	/**
	 * Получить статистику по компаниям
	 */
	async getStats(): Promise<{
		total: number
		active: number
		synced: number
		pending: number
		errors: number
		localOnly: number
		byType: Record<CompanyType, number>
	}> {
		const total = await this.count()
		const active = await this.count({ where: { isActive: true } })
		const synced = await this.count({ where: { syncStatus: CompanySyncStatus.SYNCED } })
		const pending = await this.count({ where: { syncStatus: CompanySyncStatus.PENDING } })
		const errors = await this.count({ where: { syncStatus: CompanySyncStatus.ERROR } })
		const localOnly = await this.count({ where: { syncStatus: CompanySyncStatus.LOCAL_ONLY } })

		// Статистика по типам
		const byTypeRaw = await this.createQueryBuilder('c')
			.select('c.company_type', 'type')
			.addSelect('COUNT(*)', 'count')
			.groupBy('c.company_type')
			.getRawMany()

		const byType = byTypeRaw.reduce((acc, item) => {
			acc[item.type as CompanyType] = parseInt(item.count)
			return acc
		}, {} as Record<CompanyType, number>)

		return {
			total,
			active,
			synced,
			pending,
			errors,
			localOnly,
			byType,
		}
	}
}

export const companyRepository = new CompanyRepository()
