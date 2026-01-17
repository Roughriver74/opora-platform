import { FindManyOptions, IsNull } from 'typeorm'
import { BaseRepository, PaginatedResult, PaginationOptions } from './base/BaseRepository'
import { NomenclatureCategory } from '../entities'

/**
 * Репозиторий для работы с категориями номенклатуры
 */
export class NomenclatureCategoryRepository extends BaseRepository<NomenclatureCategory> {
	constructor() {
		super(NomenclatureCategory, 'nomenclature_category')
		this.cacheTTL = 3600 // 1 час
	}

	/**
	 * Найти категорию по коду
	 */
	async findByCode(code: string): Promise<NomenclatureCategory | null> {
		return this.findOne({
			where: { code },
		})
	}

	/**
	 * Найти категорию по Bitrix Section ID
	 */
	async findByBitrixSectionId(bitrixSectionId: string): Promise<NomenclatureCategory | null> {
		return this.findOne({
			where: { bitrixSectionId },
		})
	}

	/**
	 * Получить все активные категории
	 */
	async findAllActive(): Promise<NomenclatureCategory[]> {
		return this.findAll({
			where: { isActive: true },
			order: { sortOrder: 'ASC', name: 'ASC' },
		})
	}

	/**
	 * Получить корневые категории (без родителя)
	 */
	async findRootCategories(): Promise<NomenclatureCategory[]> {
		return this.findAll({
			where: {
				parentId: IsNull(),
				isActive: true,
			},
			order: { sortOrder: 'ASC', name: 'ASC' },
		})
	}

	/**
	 * Получить дочерние категории
	 */
	async findChildren(parentId: string): Promise<NomenclatureCategory[]> {
		return this.findAll({
			where: {
				parentId,
				isActive: true,
			},
			order: { sortOrder: 'ASC', name: 'ASC' },
		})
	}

	/**
	 * Получить категории с иерархией (дерево)
	 */
	async findCategoryTree(): Promise<NomenclatureCategory[]> {
		const allCategories = await this.findAll({
			where: { isActive: true },
			order: { sortOrder: 'ASC', name: 'ASC' },
			relations: ['children'],
		})

		// Фильтруем только корневые (родитель = null)
		return allCategories.filter(cat => cat.parentId === null)
	}

	/**
	 * Получить категории с пагинацией и фильтрами
	 */
	async findWithPaginationFiltered(
		options: PaginationOptions & {
			isActive?: boolean
			parentId?: string | null
		}
	): Promise<PaginatedResult<NomenclatureCategory>> {
		const findOptions: FindManyOptions<NomenclatureCategory> = {
			...options,
			where: {},
		}

		if (options.isActive !== undefined) {
			(findOptions.where as any).isActive = options.isActive
		}

		if (options.parentId !== undefined) {
			(findOptions.where as any).parentId = options.parentId === null ? IsNull() : options.parentId
		}

		return this.findWithPagination({
			...options,
			...findOptions,
		})
	}

	/**
	 * Проверить существование кода
	 */
	async isCodeExists(code: string, excludeId?: string): Promise<boolean> {
		const qb = this.createQueryBuilder('category')
			.where('category.code = :code', { code })

		if (excludeId) {
			qb.andWhere('category.id != :excludeId', { excludeId })
		}

		const count = await qb.getCount()
		return count > 0
	}

	/**
	 * Получить путь категории (от корня до текущей)
	 */
	async getCategoryPath(categoryId: string): Promise<NomenclatureCategory[]> {
		const path: NomenclatureCategory[] = []
		let currentId: string | null = categoryId

		while (currentId) {
			const category = await this.findById(currentId)
			if (!category) break

			path.unshift(category) // Добавляем в начало
			currentId = category.parentId
		}

		return path
	}

	/**
	 * Обновить время синхронизации
	 */
	async updateSyncTime(id: string): Promise<void> {
		await this.update(id, {
			lastSyncAt: new Date(),
		})
	}
}

export const nomenclatureCategoryRepository = new NomenclatureCategoryRepository()
