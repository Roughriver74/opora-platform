import { In, Brackets } from 'typeorm'
import { BaseRepository, PaginatedResult, PaginationOptions } from './base/BaseRepository'
import { Contact, ContactType, ContactSyncStatus } from '../entities/Contact.entity'

/**
 * Опции фильтрации контактов
 */
export interface ContactFilterOptions {
	companyId?: string
	contactType?: ContactType
	syncStatus?: ContactSyncStatus
	isActive?: boolean
	isPrimary?: boolean
	search?: string
	tags?: string[]
}

/**
 * Репозиторий для работы с контактами
 */
export class ContactRepository extends BaseRepository<Contact> {
	constructor() {
		super(Contact, 'contact')
		this.cacheTTL = 1800 // 30 минут
	}

	/**
	 * Найти по телефону
	 */
	async findByPhone(phone: string): Promise<Contact | null> {
		return this.findOne({
			where: { phone },
			relations: ['company'],
		})
	}

	/**
	 * Найти по email
	 */
	async findByEmail(email: string): Promise<Contact | null> {
		return this.findOne({
			where: { email },
			relations: ['company'],
		})
	}

	/**
	 * Найти по Bitrix Contact ID
	 */
	async findByBitrixId(bitrixContactId: string): Promise<Contact | null> {
		return this.findOne({
			where: { bitrixContactId },
			relations: ['company'],
		})
	}

	/**
	 * Поиск по имени/телефону (ILIKE)
	 */
	async searchByName(query: string, limit: number = 20): Promise<Contact[]> {
		return this.createQueryBuilder('c')
			.leftJoinAndSelect('c.company', 'company')
			.where('c.is_active = true')
			.andWhere(
				new Brackets(qb => {
					qb.where('c.first_name ILIKE :query', { query: `%${query}%` })
						.orWhere('c.last_name ILIKE :query', { query: `%${query}%` })
						.orWhere('c.phone ILIKE :query', { query: `%${query}%` })
						.orWhere('c.email ILIKE :query', { query: `%${query}%` })
						.orWhere("CONCAT(c.last_name, ' ', c.first_name) ILIKE :query", { query: `%${query}%` })
				})
			)
			.orderBy('c.last_name', 'ASC')
			.addOrderBy('c.first_name', 'ASC')
			.limit(limit)
			.getMany()
	}

	/**
	 * Полнотекстовый поиск через tsvector
	 */
	async fullTextSearch(query: string, limit: number = 20): Promise<Contact[]> {
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
			.leftJoinAndSelect('c.company', 'company')
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
	async fuzzySearch(query: string, limit: number = 20, threshold: number = 0.3): Promise<Contact[]> {
		return this.createQueryBuilder('c')
			.leftJoinAndSelect('c.company', 'company')
			.where("similarity(CONCAT(c.first_name, ' ', COALESCE(c.last_name, '')), :query) > :threshold", { query, threshold })
			.andWhere('c.is_active = true')
			.orderBy("similarity(CONCAT(c.first_name, ' ', COALESCE(c.last_name, '')), :query)", 'DESC')
			.limit(limit)
			.getMany()
	}

	/**
	 * Комбинированный поиск (полнотекстовый + ILIKE fallback)
	 */
	async search(query: string, limit: number = 20): Promise<Contact[]> {
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
	 * Получить контакты компании
	 */
	async findByCompany(
		companyId: string,
		options: PaginationOptions = {}
	): Promise<PaginatedResult<Contact>> {
		return this.findWithPagination({
			...options,
			where: { companyId, isActive: true },
			relations: ['company'],
		})
	}

	/**
	 * Получить основной контакт компании
	 */
	async findPrimaryByCompany(companyId: string): Promise<Contact | null> {
		return this.findOne({
			where: { companyId, isPrimary: true, isActive: true },
			relations: ['company'],
		})
	}

	/**
	 * Получить все активные с пагинацией и фильтрами
	 */
	async findWithFilters(
		options: PaginationOptions & ContactFilterOptions
	): Promise<PaginatedResult<Contact>> {
		const qb = this.createQueryBuilder('c')
			.leftJoinAndSelect('c.company', 'company')

		// Фильтр по активности
		if (options.isActive !== undefined) {
			qb.andWhere('c.is_active = :isActive', { isActive: options.isActive })
		}

		// Фильтр по компании
		if (options.companyId) {
			qb.andWhere('c.company_id = :companyId', { companyId: options.companyId })
		}

		// Фильтр по типу
		if (options.contactType) {
			qb.andWhere('c.contact_type = :contactType', { contactType: options.contactType })
		}

		// Фильтр по статусу синхронизации
		if (options.syncStatus) {
			qb.andWhere('c.sync_status = :syncStatus', { syncStatus: options.syncStatus })
		}

		// Фильтр по основному контакту
		if (options.isPrimary !== undefined) {
			qb.andWhere('c.is_primary = :isPrimary', { isPrimary: options.isPrimary })
		}

		// Поиск по тексту
		if (options.search) {
			qb.andWhere(
				new Brackets(qb2 => {
					qb2.where('c.first_name ILIKE :search', { search: `%${options.search}%` })
						.orWhere('c.last_name ILIKE :search', { search: `%${options.search}%` })
						.orWhere('c.phone ILIKE :search', { search: `%${options.search}%` })
						.orWhere('c.email ILIKE :search', { search: `%${options.search}%` })
						.orWhere('c.position ILIKE :search', { search: `%${options.search}%` })
				})
			)
		}

		// Фильтр по тегам
		if (options.tags && options.tags.length > 0) {
			qb.andWhere('c.tags && :tags', { tags: options.tags })
		}

		// Сортировка - используем имена свойств сущности (camelCase) для getManyAndCount
		const sortBy = options.sortBy || 'lastName'
		const sortOrder = options.sortOrder || 'ASC'
		qb.orderBy(`c.${sortBy}`, sortOrder)
		qb.addOrderBy('c.firstName', 'ASC')

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
	 * Получить контакты с ошибками синхронизации
	 */
	async findWithSyncErrors(): Promise<Contact[]> {
		return this.findAll({
			where: { syncStatus: ContactSyncStatus.ERROR },
			relations: ['company'],
			order: { updatedAt: 'DESC' },
		})
	}

	/**
	 * Получить контакты, требующие синхронизации
	 */
	async findPendingSync(): Promise<Contact[]> {
		return this.findAll({
			where: { syncStatus: ContactSyncStatus.PENDING },
			relations: ['company'],
		})
	}

	/**
	 * Получить контакты по нескольким Bitrix ID
	 */
	async findByBitrixIds(bitrixIds: string[]): Promise<Contact[]> {
		if (bitrixIds.length === 0) return []

		return this.findAll({
			where: { bitrixContactId: In(bitrixIds) },
			relations: ['company'],
		})
	}

	/**
	 * Проверить существование Bitrix ID
	 */
	async isBitrixIdExists(bitrixContactId: string, excludeId?: string): Promise<boolean> {
		const qb = this.createQueryBuilder('c')
			.where('c.bitrix_contact_id = :bitrixContactId', { bitrixContactId })

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
		status: ContactSyncStatus,
		error?: { message: string; code?: string }
	): Promise<number> {
		if (ids.length === 0) return 0

		const updateData: any = {
			syncStatus: status,
			lastSyncAt: new Date(),
		}

		if (status === ContactSyncStatus.ERROR && error) {
			updateData.syncError = { ...error, timestamp: new Date() }
		} else if (status === ContactSyncStatus.SYNCED) {
			updateData.syncError = null
		}

		const result = await this.createQueryBuilder()
			.update(Contact)
			.set(updateData)
			.whereInIds(ids)
			.execute()

		return result.affected || 0
	}

	/**
	 * Установить основной контакт для компании
	 * (снимает флаг isPrimary с других контактов)
	 */
	async setPrimaryContact(contactId: string, companyId: string): Promise<void> {
		// Снимаем флаг isPrimary с других контактов компании
		await this.createQueryBuilder()
			.update(Contact)
			.set({ isPrimary: false })
			.where('company_id = :companyId', { companyId })
			.andWhere('id != :contactId', { contactId })
			.execute()

		// Устанавливаем флаг для выбранного контакта
		await this.createQueryBuilder()
			.update(Contact)
			.set({ isPrimary: true })
			.where('id = :contactId', { contactId })
			.execute()
	}

	/**
	 * Получить статистику по контактам
	 */
	async getStats(): Promise<{
		total: number
		active: number
		synced: number
		pending: number
		errors: number
		localOnly: number
		byType: Record<ContactType, number>
		withCompany: number
		withoutCompany: number
	}> {
		const total = await this.count()
		const active = await this.count({ where: { isActive: true } })
		const synced = await this.count({ where: { syncStatus: ContactSyncStatus.SYNCED } })
		const pending = await this.count({ where: { syncStatus: ContactSyncStatus.PENDING } })
		const errors = await this.count({ where: { syncStatus: ContactSyncStatus.ERROR } })
		const localOnly = await this.count({ where: { syncStatus: ContactSyncStatus.LOCAL_ONLY } })

		// Статистика по типам
		const byTypeRaw = await this.createQueryBuilder('c')
			.select('c.contact_type', 'type')
			.addSelect('COUNT(*)', 'count')
			.groupBy('c.contact_type')
			.getRawMany()

		const byType = byTypeRaw.reduce((acc, item) => {
			acc[item.type as ContactType] = parseInt(item.count)
			return acc
		}, {} as Record<ContactType, number>)

		// Контакты с компанией и без
		const withCompany = await this.createQueryBuilder('c')
			.where('c.company_id IS NOT NULL')
			.getCount()

		const withoutCompany = await this.createQueryBuilder('c')
			.where('c.company_id IS NULL')
			.getCount()

		return {
			total,
			active,
			synced,
			pending,
			errors,
			localOnly,
			byType,
			withCompany,
			withoutCompany,
		}
	}
}

export const contactRepository = new ContactRepository()
