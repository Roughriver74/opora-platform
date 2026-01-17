import { DeepPartial } from 'typeorm'
import { BaseService } from './base/BaseService'
import {
	Nomenclature,
	NomenclatureType,
	NomenclatureSyncStatus,
	NomenclatureCategory,
	NomenclatureUnit,
} from '../database/entities'
import {
	NomenclatureRepository,
	nomenclatureRepository,
	NomenclatureCategoryRepository,
	nomenclatureCategoryRepository,
	NomenclatureUnitRepository,
	nomenclatureUnitRepository,
} from '../database/repositories'
import { PaginatedResult, PaginationOptions } from '../database/repositories/base/BaseRepository'
import { NomenclatureFilterOptions } from '../database/repositories/NomenclatureRepository'
import bitrix24Service from './bitrix24Service'
import { logger } from '../utils/logger'

/**
 * DTO для создания номенклатуры
 */
export interface CreateNomenclatureDto {
	sku: string
	name: string
	description?: string
	type?: NomenclatureType
	categoryId?: string
	unitId: string
	price?: number
	currency?: string
	costPrice?: number
	bitrixProductId?: string
	bitrixSectionId?: string
	attributes?: Record<string, any>
	tags?: string[]
	imageUrl?: string
	sortOrder?: number
	isActive?: boolean
}

/**
 * DTO для обновления номенклатуры
 */
export interface UpdateNomenclatureDto {
	sku?: string
	name?: string
	description?: string
	type?: NomenclatureType
	categoryId?: string | null
	unitId?: string
	price?: number | null
	currency?: string
	costPrice?: number | null
	bitrixProductId?: string | null
	bitrixSectionId?: string | null
	syncStatus?: NomenclatureSyncStatus
	attributes?: Record<string, any>
	tags?: string[]
	imageUrl?: string | null
	sortOrder?: number
	isActive?: boolean
}

/**
 * Результат синхронизации
 */
export interface SyncResult {
	created: number
	updated: number
	errors: number
	errorDetails: { id: string; message: string }[]
}

/**
 * Сервис для работы с номенклатурой
 */
export class NomenclatureService extends BaseService<Nomenclature, NomenclatureRepository> {
	private categoryRepository: NomenclatureCategoryRepository
	private unitRepository: NomenclatureUnitRepository

	constructor() {
		super(nomenclatureRepository)
		this.categoryRepository = nomenclatureCategoryRepository
		this.unitRepository = nomenclatureUnitRepository
	}

	// === CRUD операции ===

	/**
	 * Создать новую номенклатуру
	 */
	async create(data: CreateNomenclatureDto): Promise<Nomenclature> {
		// Проверка уникальности SKU
		const existingSku = await this.repository.findBySku(data.sku)
		if (existingSku) {
			this.throwDuplicateError('Артикул (SKU)', data.sku)
		}

		// Проверка уникальности Bitrix ID если указан
		if (data.bitrixProductId) {
			const existingBitrix = await this.repository.findByBitrixId(data.bitrixProductId)
			if (existingBitrix) {
				this.throwDuplicateError('Bitrix24 ID', data.bitrixProductId)
			}
		}

		// Проверка существования единицы измерения
		const unit = await this.unitRepository.findById(data.unitId)
		if (!unit) {
			this.throwValidationError(`Единица измерения с ID ${data.unitId} не найдена`)
		}

		// Проверка существования категории если указана
		if (data.categoryId) {
			const category = await this.categoryRepository.findById(data.categoryId)
			if (!category) {
				this.throwValidationError(`Категория с ID ${data.categoryId} не найдена`)
			}
		}

		// Устанавливаем статус синхронизации
		const nomenclature = await super.create({
			...data,
			syncStatus: data.bitrixProductId
				? NomenclatureSyncStatus.SYNCED
				: NomenclatureSyncStatus.LOCAL_ONLY,
			lastSyncAt: data.bitrixProductId ? new Date() : null,
		})

		logger.info(`Создана номенклатура: ${nomenclature.sku} - ${nomenclature.name}`)
		return nomenclature
	}

	/**
	 * Обновить номенклатуру
	 */
	async update(id: string, data: UpdateNomenclatureDto): Promise<Nomenclature | null> {
		const existing = await this.repository.findById(id)
		if (!existing) {
			return null
		}

		// Проверка уникальности SKU если изменяется
		if (data.sku && data.sku !== existing.sku) {
			const skuExists = await this.repository.isSkuExists(data.sku, id)
			if (skuExists) {
				this.throwDuplicateError('Артикул (SKU)', data.sku)
			}
		}

		// Проверка уникальности Bitrix ID если изменяется
		if (data.bitrixProductId && data.bitrixProductId !== existing.bitrixProductId) {
			const bitrixExists = await this.repository.isBitrixIdExists(data.bitrixProductId, id)
			if (bitrixExists) {
				this.throwDuplicateError('Bitrix24 ID', data.bitrixProductId)
			}
		}

		// Проверка единицы измерения если изменяется
		if (data.unitId && data.unitId !== existing.unitId) {
			const unit = await this.unitRepository.findById(data.unitId)
			if (!unit) {
				this.throwValidationError(`Единица измерения с ID ${data.unitId} не найдена`)
			}
		}

		// Проверка категории если изменяется
		if (data.categoryId && data.categoryId !== existing.categoryId) {
			const category = await this.categoryRepository.findById(data.categoryId)
			if (!category) {
				this.throwValidationError(`Категория с ID ${data.categoryId} не найдена`)
			}
		}

		const updated = await super.update(id, data)
		if (updated) {
			logger.info(`Обновлена номенклатура: ${updated.sku} - ${updated.name}`)
		}
		return updated
	}

	/**
	 * Удалить номенклатуру
	 */
	async delete(id: string): Promise<boolean> {
		const existing = await this.repository.findById(id)
		if (!existing) {
			return false
		}

		const result = await super.delete(id)
		if (result) {
			logger.info(`Удалена номенклатура: ${existing.sku} - ${existing.name}`)
		}
		return result
	}

	// === Поиск ===

	/**
	 * Найти по SKU
	 */
	async findBySku(sku: string): Promise<Nomenclature | null> {
		return this.repository.findBySku(sku)
	}

	/**
	 * Найти по Bitrix ID
	 */
	async findByBitrixId(bitrixProductId: string): Promise<Nomenclature | null> {
		return this.repository.findByBitrixId(bitrixProductId)
	}

	/**
	 * Поиск номенклатуры (комбинированный: полнотекстовый + ILIKE)
	 */
	async search(query: string, limit: number = 20): Promise<Nomenclature[]> {
		return this.repository.search(query, limit)
	}

	/**
	 * Получить номенклатуру с фильтрами и пагинацией
	 */
	async findWithFilters(
		options: PaginationOptions & NomenclatureFilterOptions
	): Promise<PaginatedResult<Nomenclature>> {
		return this.repository.findWithFilters(options)
	}

	/**
	 * Получить номенклатуру по категории
	 */
	async findByCategory(
		categoryId: string,
		options?: PaginationOptions
	): Promise<PaginatedResult<Nomenclature>> {
		return this.repository.findByCategory(categoryId, options)
	}

	// === Синхронизация с Bitrix24 ===

	/**
	 * Синхронизировать все товары из Bitrix24
	 */
	async syncFromBitrix24(): Promise<SyncResult> {
		logger.info('Начало синхронизации номенклатуры с Bitrix24...')

		const result: SyncResult = {
			created: 0,
			updated: 0,
			errors: 0,
			errorDetails: [],
		}

		try {
			// Получаем все товары из Bitrix24
			const bitrixProducts = await bitrix24Service.getAllProducts()
			logger.info(`Получено ${bitrixProducts.length} товаров из Bitrix24`)

			// Получаем единицу измерения по умолчанию (м³ для бетона)
			const defaultUnit = await this.unitRepository.findByCode('m3')
			if (!defaultUnit) {
				throw new Error('Единица измерения по умолчанию (m3) не найдена')
			}

			for (const product of bitrixProducts) {
				try {
					const bitrixId = String(product.ID)
					const existing = await this.repository.findByBitrixId(bitrixId)

					const nomenclatureData: DeepPartial<Nomenclature> = {
						name: product.NAME || `Товар ${bitrixId}`,
						description: product.DESCRIPTION || null,
						price: product.PRICE ? parseFloat(product.PRICE) : null,
						currency: product.CURRENCY_ID || 'RUB',
						bitrixProductId: bitrixId,
						syncStatus: NomenclatureSyncStatus.SYNCED,
						lastSyncAt: new Date(),
						syncError: null,
					}

					if (existing) {
						// Обновляем существующий товар
						await this.repository.update(existing.id, nomenclatureData)
						result.updated++
					} else {
						// Создаем новый товар
						await this.repository.create({
							...nomenclatureData,
							sku: `BX-${bitrixId}`,
							unitId: defaultUnit.id,
							type: NomenclatureType.PRODUCT,
							isActive: true,
						})
						result.created++
					}
				} catch (error: any) {
					result.errors++
					result.errorDetails.push({
						id: String(product.ID),
						message: error.message,
					})
					logger.error(`Ошибка синхронизации товара ${product.ID}:`, error.message)
				}
			}

			logger.info(
				`Синхронизация завершена. Создано: ${result.created}, обновлено: ${result.updated}, ошибок: ${result.errors}`
			)
		} catch (error: any) {
			logger.error('Критическая ошибка синхронизации:', error)
			throw error
		}

		return result
	}

	/**
	 * Синхронизировать один товар из Bitrix24
	 */
	async syncSingleFromBitrix24(bitrixProductId: string): Promise<Nomenclature | null> {
		try {
			const products = await bitrix24Service.getProducts(bitrixProductId)
			if (!products.result || products.result.length === 0) {
				return null
			}

			const product = products.result[0]
			const existing = await this.repository.findByBitrixId(bitrixProductId)

			if (existing) {
				existing.updateFromBitrix({
					name: product.NAME,
					description: product.DESCRIPTION,
					price: product.PRICE ? parseFloat(product.PRICE) : undefined,
					currency: product.CURRENCY_ID,
				})
				return this.repository.update(existing.id, existing)
			}

			return null
		} catch (error: any) {
			logger.error(`Ошибка синхронизации товара ${bitrixProductId}:`, error)
			return null
		}
	}

	// === Статистика ===

	/**
	 * Получить статистику номенклатуры
	 */
	async getStats() {
		return this.repository.getStats()
	}

	/**
	 * Получить номенклатуру с ошибками синхронизации
	 */
	async getWithSyncErrors(): Promise<Nomenclature[]> {
		return this.repository.findWithSyncErrors()
	}

	// === Категории ===

	/**
	 * Получить все категории
	 */
	async getAllCategories(): Promise<NomenclatureCategory[]> {
		return this.categoryRepository.findAllActive()
	}

	/**
	 * Получить дерево категорий
	 */
	async getCategoryTree(): Promise<NomenclatureCategory[]> {
		return this.categoryRepository.findCategoryTree()
	}

	/**
	 * Создать категорию
	 */
	async createCategory(data: {
		code: string
		name: string
		description?: string
		parentId?: string
		sortOrder?: number
	}): Promise<NomenclatureCategory> {
		const codeExists = await this.categoryRepository.isCodeExists(data.code)
		if (codeExists) {
			this.throwDuplicateError('Код категории', data.code)
		}

		return this.categoryRepository.create({
			...data,
			isActive: true,
		})
	}

	/**
	 * Обновить категорию
	 */
	async updateCategory(
		id: string,
		data: {
			code?: string
			name?: string
			description?: string
			parentId?: string | null
			sortOrder?: number
			isActive?: boolean
		}
	): Promise<NomenclatureCategory | null> {
		if (data.code) {
			const codeExists = await this.categoryRepository.isCodeExists(data.code, id)
			if (codeExists) {
				this.throwDuplicateError('Код категории', data.code)
			}
		}

		return this.categoryRepository.update(id, data)
	}

	/**
	 * Удалить категорию
	 */
	async deleteCategory(id: string): Promise<boolean> {
		return this.categoryRepository.delete(id)
	}

	// === Единицы измерения ===

	/**
	 * Получить все единицы измерения
	 */
	async getAllUnits(): Promise<NomenclatureUnit[]> {
		return this.unitRepository.findAllActive()
	}

	/**
	 * Получить единицу измерения по коду
	 */
	async getUnitByCode(code: string): Promise<NomenclatureUnit | null> {
		return this.unitRepository.findByCode(code)
	}

	// === Вспомогательные методы ===

	/**
	 * Получить единицу измерения по умолчанию
	 */
	async getDefaultUnit(): Promise<NomenclatureUnit> {
		const unit = await this.unitRepository.findByCode('m3')
		if (!unit) {
			throw new Error('Единица измерения по умолчанию (m3) не найдена')
		}
		return unit
	}
}

// Экспортируем синглтон
export const nomenclatureService = new NomenclatureService()
