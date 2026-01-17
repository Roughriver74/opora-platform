import { FindManyOptions } from 'typeorm'
import { BaseRepository, PaginatedResult, PaginationOptions } from './base/BaseRepository'
import { NomenclatureUnit } from '../entities'

/**
 * Репозиторий для работы с единицами измерения номенклатуры
 */
export class NomenclatureUnitRepository extends BaseRepository<NomenclatureUnit> {
	constructor() {
		super(NomenclatureUnit, 'nomenclature_unit')
		this.cacheTTL = 7200 // 2 часа (единицы меняются редко)
	}

	/**
	 * Найти единицу по коду
	 */
	async findByCode(code: string): Promise<NomenclatureUnit | null> {
		return this.findOne({
			where: { code },
		})
	}

	/**
	 * Получить все активные единицы измерения
	 */
	async findAllActive(): Promise<NomenclatureUnit[]> {
		return this.findAll({
			where: { isActive: true },
			order: { name: 'ASC' },
		})
	}

	/**
	 * Найти единицу по коду ОКЕИ
	 */
	async findByOkeiCode(okeiCode: number): Promise<NomenclatureUnit | null> {
		return this.findOne({
			where: { okeiCode },
		})
	}

	/**
	 * Получить единицы с пагинацией
	 */
	async findWithPaginationFiltered(
		options: PaginationOptions & { isActive?: boolean }
	): Promise<PaginatedResult<NomenclatureUnit>> {
		const { isActive, ...paginationOptions } = options

		const findOptions: FindManyOptions<NomenclatureUnit> = {}

		if (isActive !== undefined) {
			findOptions.where = { isActive }
		}

		return this.findWithPagination({
			...paginationOptions,
			where: findOptions.where,
		})
	}

	/**
	 * Проверить существование кода
	 */
	async isCodeExists(code: string, excludeId?: string): Promise<boolean> {
		const qb = this.createQueryBuilder('unit')
			.where('unit.code = :code', { code })

		if (excludeId) {
			qb.andWhere('unit.id != :excludeId', { excludeId })
		}

		const count = await qb.getCount()
		return count > 0
	}
}

export const nomenclatureUnitRepository = new NomenclatureUnitRepository()
