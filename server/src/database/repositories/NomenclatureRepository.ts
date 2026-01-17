import { FindManyOptions, ILike, In, Brackets } from 'typeorm'
import { BaseRepository, PaginatedResult, PaginationOptions } from './base/BaseRepository'
import { Nomenclature, NomenclatureType, NomenclatureSyncStatus } from '../entities'

/**
 * Опции фильтрации номенклатуры
 */
export interface NomenclatureFilterOptions {
	categoryId?: string
	unitId?: string
	type?: NomenclatureType
	syncStatus?: NomenclatureSyncStatus
	isActive?: boolean
	search?: string
	tags?: string[]
	priceMin?: number
	priceMax?: number
}

/**
 * Репозиторий для работы с номенклатурой
 */
export class NomenclatureRepository extends BaseRepository<Nomenclature> {
	constructor() {
		super(Nomenclature, 'nomenclature')
		this.cacheTTL = 1800 // 30 минут
	}

	/**
	 * Найти по SKU (артикулу)
	 */
	async findBySku(sku: string): Promise<Nomenclature | null> {
		return this.findOne({
			where: { sku },
			relations: ['category', 'unit'],
		})
	}

	/**
	 * Найти по Bitrix Product ID
	 */
	async findByBitrixId(bitrixProductId: string): Promise<Nomenclature | null> {
		return this.findOne({
			where: { bitrixProductId },
			relations: ['category', 'unit'],
		})
	}

	/**
	 * Поиск по имени (ILIKE)
	 */
	async searchByName(query: string, limit: number = 20): Promise<Nomenclature[]> {
		return this.createQueryBuilder('n')
			.leftJoinAndSelect('n.category', 'category')
			.leftJoinAndSelect('n.unit', 'unit')
			.where('n.is_active = true')
			.andWhere(
				new Brackets(qb => {
					qb.where('n.name ILIKE :query', { query: `%${query}%` })
						.orWhere('n.sku ILIKE :query', { query: `%${query}%` })
				})
			)
			.orderBy('n.sort_order', 'ASC')
			.addOrderBy('n.name', 'ASC')
			.limit(limit)
			.getMany()
	}

	/**
	 * Полнотекстовый поиск через tsvector
	 */
	async fullTextSearch(query: string, limit: number = 20): Promise<Nomenclature[]> {
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

		return this.createQueryBuilder('n')
			.leftJoinAndSelect('n.category', 'category')
			.leftJoinAndSelect('n.unit', 'unit')
			.where("n.search_vector @@ to_tsquery('russian', :tsQuery)", { tsQuery })
			.andWhere('n.is_active = true')
			.orderBy("ts_rank(n.search_vector, to_tsquery('russian', :tsQuery))", 'DESC')
			.addOrderBy('n.sort_order', 'ASC')
			.limit(limit)
			.setParameters({ tsQuery })
			.getMany()
	}

	/**
	 * Нечеткий (триграммный) поиск
	 */
	async fuzzySearch(query: string, limit: number = 20, threshold: number = 0.3): Promise<Nomenclature[]> {
		return this.createQueryBuilder('n')
			.leftJoinAndSelect('n.category', 'category')
			.leftJoinAndSelect('n.unit', 'unit')
			.where('similarity(n.name, :query) > :threshold', { query, threshold })
			.andWhere('n.isActive = true')
			.orderBy('similarity(n.name, :query)', 'DESC')
			.limit(limit)
			.getMany()
	}

	/**
	 * Комбинированный поиск (полнотекстовый + ILIKE fallback)
	 */
	async search(query: string, limit: number = 20): Promise<Nomenclature[]> {
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
	 * Получить по категории
	 */
	async findByCategory(
		categoryId: string,
		options: PaginationOptions = {}
	): Promise<PaginatedResult<Nomenclature>> {
		return this.findWithPagination({
			...options,
			where: { categoryId, isActive: true },
			relations: ['category', 'unit'],
		})
	}

	/**
	 * Получить все активные с пагинацией и фильтрами
	 */
	async findWithFilters(
		options: PaginationOptions & NomenclatureFilterOptions
	): Promise<PaginatedResult<Nomenclature>> {
		const qb = this.createQueryBuilder('n')
			.leftJoinAndSelect('n.category', 'category')
			.leftJoinAndSelect('n.unit', 'unit')

		// Фильтр по активности
		if (options.isActive !== undefined) {
			qb.andWhere('n.isActive = :isActive', { isActive: options.isActive })
		}

		// Фильтр по категории
		if (options.categoryId) {
			qb.andWhere('n.categoryId = :categoryId', { categoryId: options.categoryId })
		}

		// Фильтр по единице измерения
		if (options.unitId) {
			qb.andWhere('n.unitId = :unitId', { unitId: options.unitId })
		}

		// Фильтр по типу
		if (options.type) {
			qb.andWhere('n.type = :type', { type: options.type })
		}

		// Фильтр по статусу синхронизации
		if (options.syncStatus) {
			qb.andWhere('n.syncStatus = :syncStatus', { syncStatus: options.syncStatus })
		}

		// Поиск по тексту
		if (options.search) {
			qb.andWhere(
				'(n.name ILIKE :search OR n.sku ILIKE :search OR n.description ILIKE :search)',
				{ search: `%${options.search}%` }
			)
		}

		// Фильтр по тегам
		if (options.tags && options.tags.length > 0) {
			qb.andWhere('n.tags && :tags', { tags: options.tags })
		}

		// Фильтр по диапазону цен
		if (options.priceMin !== undefined) {
			qb.andWhere('n.price >= :priceMin', { priceMin: options.priceMin })
		}
		if (options.priceMax !== undefined) {
			qb.andWhere('n.price <= :priceMax', { priceMax: options.priceMax })
		}

		// Сортировка
		const sortBy = options.sortBy || 'sortOrder'
		const sortOrder = options.sortOrder || 'ASC'
		qb.orderBy(`n.${sortBy}`, sortOrder)

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
	 * Получить номенклатуру с ошибками синхронизации
	 */
	async findWithSyncErrors(): Promise<Nomenclature[]> {
		return this.findAll({
			where: { syncStatus: NomenclatureSyncStatus.ERROR },
			relations: ['category', 'unit'],
			order: { updatedAt: 'DESC' },
		})
	}

	/**
	 * Получить номенклатуру, требующую синхронизации
	 */
	async findPendingSync(): Promise<Nomenclature[]> {
		return this.findAll({
			where: { syncStatus: NomenclatureSyncStatus.PENDING },
			relations: ['category', 'unit'],
		})
	}

	/**
	 * Получить номенклатуру по нескольким Bitrix ID
	 */
	async findByBitrixIds(bitrixIds: string[]): Promise<Nomenclature[]> {
		if (bitrixIds.length === 0) return []

		return this.findAll({
			where: { bitrixProductId: In(bitrixIds) },
			relations: ['category', 'unit'],
		})
	}

	/**
	 * Проверить существование SKU
	 */
	async isSkuExists(sku: string, excludeId?: string): Promise<boolean> {
		const qb = this.createQueryBuilder('n')
			.where('n.sku = :sku', { sku })

		if (excludeId) {
			qb.andWhere('n.id != :excludeId', { excludeId })
		}

		const count = await qb.getCount()
		return count > 0
	}

	/**
	 * Проверить существование Bitrix ID
	 */
	async isBitrixIdExists(bitrixProductId: string, excludeId?: string): Promise<boolean> {
		const qb = this.createQueryBuilder('n')
			.where('n.bitrixProductId = :bitrixProductId', { bitrixProductId })

		if (excludeId) {
			qb.andWhere('n.id != :excludeId', { excludeId })
		}

		const count = await qb.getCount()
		return count > 0
	}

	/**
	 * Обновить статус синхронизации для нескольких записей
	 */
	async updateSyncStatus(
		ids: string[],
		status: NomenclatureSyncStatus,
		error?: { message: string; code?: string }
	): Promise<number> {
		if (ids.length === 0) return 0

		const updateData: any = {
			syncStatus: status,
			lastSyncAt: new Date(),
		}

		if (status === NomenclatureSyncStatus.ERROR && error) {
			updateData.syncError = { ...error, timestamp: new Date() }
		} else if (status === NomenclatureSyncStatus.SYNCED) {
			updateData.syncError = null
		}

		const result = await this.createQueryBuilder()
			.update(Nomenclature)
			.set(updateData)
			.whereInIds(ids)
			.execute()

		return result.affected || 0
	}

	/**
	 * Получить статистику по номенклатуре
	 */
	async getStats(): Promise<{
		total: number
		active: number
		synced: number
		pending: number
		errors: number
		localOnly: number
		byType: Record<NomenclatureType, number>
		byCategory: { categoryId: string; categoryName: string; count: number }[]
	}> {
		const total = await this.count()
		const active = await this.count({ where: { isActive: true } })
		const synced = await this.count({ where: { syncStatus: NomenclatureSyncStatus.SYNCED } })
		const pending = await this.count({ where: { syncStatus: NomenclatureSyncStatus.PENDING } })
		const errors = await this.count({ where: { syncStatus: NomenclatureSyncStatus.ERROR } })
		const localOnly = await this.count({ where: { syncStatus: NomenclatureSyncStatus.LOCAL_ONLY } })

		// Статистика по типам
		const byTypeRaw = await this.createQueryBuilder('n')
			.select('n.type', 'type')
			.addSelect('COUNT(*)', 'count')
			.groupBy('n.type')
			.getRawMany()

		const byType = byTypeRaw.reduce((acc, item) => {
			acc[item.type as NomenclatureType] = parseInt(item.count)
			return acc
		}, {} as Record<NomenclatureType, number>)

		// Статистика по категориям
		const byCategory = await this.createQueryBuilder('n')
			.leftJoin('n.category', 'category')
			.select('n.categoryId', 'categoryId')
			.addSelect('category.name', 'categoryName')
			.addSelect('COUNT(*)', 'count')
			.groupBy('n.categoryId')
			.addGroupBy('category.name')
			.getRawMany()

		return {
			total,
			active,
			synced,
			pending,
			errors,
			localOnly,
			byType,
			byCategory: byCategory.map(item => ({
				categoryId: item.categoryId,
				categoryName: item.categoryName || 'Без категории',
				count: parseInt(item.count),
			})),
		}
	}
}

export const nomenclatureRepository = new NomenclatureRepository()
