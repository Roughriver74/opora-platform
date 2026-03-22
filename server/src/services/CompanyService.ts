import {
	getCompanyRepository,
	CompanyRepository,
	CompanyFilterOptions,
} from '../database/repositories'
import { Company, CompanyType, CompanySyncStatus } from '../database/entities'
import { PaginatedResult, PaginationOptions } from '../database/repositories/base/BaseRepository'
import { AppDataSource } from '../database/config/database.config'

/**
 * DTO для создания компании
 */
export interface CreateCompanyDTO {
	name: string
	shortName?: string
	inn?: string
	kpp?: string
	ogrn?: string
	companyType?: CompanyType
	legalAddress?: string
	actualAddress?: string
	phone?: string
	email?: string
	website?: string
	industry?: string
	bankName?: string
	bankBik?: string
	bankAccount?: string
	corrAccount?: string
	description?: string
	tags?: string[]
	bitrixCompanyId?: string
}

/**
 * DTO для обновления компании
 */
export interface UpdateCompanyDTO extends Partial<CreateCompanyDTO> {
	isActive?: boolean
	syncStatus?: CompanySyncStatus
}

/**
 * Сервис для работы с компаниями
 */
export class CompanyService {
	private repository: CompanyRepository

	constructor() {
		this.repository = getCompanyRepository()
	}

	/**
	 * Получить все компании с фильтрацией и пагинацией
	 */
	async findAll(
		options: PaginationOptions & CompanyFilterOptions = {},
		organizationId?: string
	): Promise<PaginatedResult<Company>> {
		if (organizationId) {
			return this.repository.findWithFilters({ ...options, organizationId } as any)
		}
		return this.repository.findWithFilters(options)
	}

	/**
	 * Получить компанию по ID
	 */
	async findById(id: string, organizationId?: string): Promise<Company | null> {
		if (organizationId) {
			return this.repository.findOne({
				where: { id, organizationId } as any,
			})
		}
		return this.repository.findById(id)
	}

	/**
	 * Найти компанию по ИНН
	 */
	async findByInn(inn: string): Promise<Company | null> {
		return this.repository.findByInn(inn)
	}

	/**
	 * Найти компанию по Bitrix ID
	 */
	async findByBitrixId(bitrixCompanyId: string): Promise<Company | null> {
		return this.repository.findByBitrixId(bitrixCompanyId)
	}

	/**
	 * Поиск компаний (для автокомплита в формах)
	 */
	async search(query: string, limit: number = 20, organizationId?: string): Promise<Company[]> {
		if (!query || query.trim().length === 0) {
			// Возвращаем последние активные компании
			const filterOptions: any = {
				isActive: true,
				limit,
				sortBy: 'name',
				sortOrder: 'ASC',
			}
			if (organizationId) {
				filterOptions.organizationId = organizationId
			}
			const result = await this.repository.findWithFilters(filterOptions)
			return result.data
		}
		if (organizationId) {
			// Поиск с фильтрацией по организации
			const result = await this.repository.findWithFilters({
				search: query,
				isActive: true,
				limit,
				organizationId,
			} as any)
			return result.data
		}
		return this.repository.search(query, limit)
	}

	/**
	 * Создать новую компанию
	 */
	async create(data: CreateCompanyDTO, organizationId?: string): Promise<Company> {
		// Проверка уникальности ИНН
		if (data.inn) {
			const existingByInn = await this.repository.isInnExists(data.inn)
			if (existingByInn) {
				throw new Error(`Компания с ИНН ${data.inn} уже существует`)
			}
		}

		// Проверка уникальности Bitrix ID
		if (data.bitrixCompanyId) {
			const existingByBitrix = await this.repository.isBitrixIdExists(data.bitrixCompanyId)
			if (existingByBitrix) {
				throw new Error(`Компания с Bitrix ID ${data.bitrixCompanyId} уже существует`)
			}
		}

		const company = new Company()
		Object.assign(company, {
			...data,
			isActive: true,
			syncStatus: data.bitrixCompanyId ? CompanySyncStatus.SYNCED : CompanySyncStatus.LOCAL_ONLY,
			organizationId: organizationId,
		})

		return this.repository.save(company)
	}

	/**
	 * Обновить компанию
	 */
	async update(id: string, data: UpdateCompanyDTO, organizationId?: string): Promise<Company> {
		const company = organizationId
			? await this.findById(id, organizationId)
			: await this.repository.findById(id)
		if (!company) {
			throw new Error('Компания не найдена')
		}

		// Проверка уникальности ИНН (если изменяется)
		if (data.inn && data.inn !== company.inn) {
			const existingByInn = await this.repository.isInnExists(data.inn, id)
			if (existingByInn) {
				throw new Error(`Компания с ИНН ${data.inn} уже существует`)
			}
		}

		// Проверка уникальности Bitrix ID (если изменяется)
		if (data.bitrixCompanyId && data.bitrixCompanyId !== company.bitrixCompanyId) {
			const existingByBitrix = await this.repository.isBitrixIdExists(data.bitrixCompanyId, id)
			if (existingByBitrix) {
				throw new Error(`Компания с Bitrix ID ${data.bitrixCompanyId} уже существует`)
			}
		}

		Object.assign(company, data)
		return this.repository.save(company)
	}

	/**
	 * Удалить компанию (soft delete - деактивация)
	 */
	async delete(id: string, organizationId?: string): Promise<void> {
		const company = organizationId
			? await this.findById(id, organizationId)
			: await this.repository.findById(id)
		if (!company) {
			throw new Error('Компания не найдена')
		}

		company.isActive = false
		await this.repository.save(company)
	}

	/**
	 * Полностью удалить компанию (hard delete)
	 */
	async hardDelete(id: string, organizationId?: string): Promise<void> {
		const company = organizationId
			? await this.findById(id, organizationId)
			: await this.repository.findById(id)
		if (!company) {
			throw new Error('Компания не найдена')
		}

		await this.repository.delete(id)
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
		return this.repository.getStats()
	}

	/**
	 * Получить компании с ошибками синхронизации
	 */
	async findWithSyncErrors(): Promise<Company[]> {
		return this.repository.findWithSyncErrors()
	}

	/**
	 * Получить компании, требующие синхронизации
	 */
	async findPendingSync(): Promise<Company[]> {
		return this.repository.findPendingSync()
	}

	/**
	 * Обновить статус синхронизации
	 */
	async updateSyncStatus(
		ids: string[],
		status: CompanySyncStatus,
		error?: { message: string; code?: string }
	): Promise<number> {
		return this.repository.updateSyncStatus(ids, status, error)
	}

	/**
	 * Импорт компании из Bitrix24
	 */
	async importFromBitrix(bitrixData: {
		bitrixCompanyId: string
		name: string
		inn?: string
		phone?: string
		email?: string
		[key: string]: any
	}): Promise<Company> {
		// Проверяем, существует ли компания с таким Bitrix ID
		let company = await this.repository.findByBitrixId(bitrixData.bitrixCompanyId)

		if (company) {
			// Обновляем существующую
			Object.assign(company, {
				name: bitrixData.name,
				inn: bitrixData.inn || company.inn,
				phone: bitrixData.phone || company.phone,
				email: bitrixData.email || company.email,
				syncStatus: CompanySyncStatus.SYNCED,
				lastSyncAt: new Date(),
				syncError: null,
			})
		} else {
			// Создаем новую
			company = new Company()
			Object.assign(company, {
				bitrixCompanyId: bitrixData.bitrixCompanyId,
				name: bitrixData.name,
				inn: bitrixData.inn,
				phone: bitrixData.phone,
				email: bitrixData.email,
				isActive: true,
				syncStatus: CompanySyncStatus.SYNCED,
				lastSyncAt: new Date(),
			})
		}

		return this.repository.save(company)
	}
}

// Singleton instance
let companyServiceInstance: CompanyService | null = null

export const getCompanyService = (): CompanyService => {
	if (!companyServiceInstance) {
		companyServiceInstance = new CompanyService()
	}
	return companyServiceInstance
}

export default CompanyService
