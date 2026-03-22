import { Request, Response, NextFunction } from 'express'
import { nomenclatureService } from '../services/NomenclatureService'
import { nomenclatureExcelService } from '../services/NomenclatureExcelService'
import { NomenclatureType, NomenclatureSyncStatus } from '../database/entities'
import { logger } from '../utils/logger'

/**
 * Получить список номенклатуры с пагинацией и фильтрами
 * GET /api/nomenclature
 */
export const getAll = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const {
			page = 1,
			limit = 20,
			sortBy = 'sortOrder',
			sortOrder = 'ASC',
			categoryId,
			type,
			syncStatus,
			isActive,
			search,
			tags,
			priceMin,
			priceMax,
		} = req.query

		const orgId = req.organizationId

		const result = await nomenclatureService.findWithFilters({
			page: Number(page),
			limit: Math.min(Number(limit), 100),
			sortBy: String(sortBy),
			sortOrder: sortOrder === 'DESC' ? 'DESC' : 'ASC',
			categoryId: categoryId as string | undefined,
			type: type as NomenclatureType | undefined,
			syncStatus: syncStatus as NomenclatureSyncStatus | undefined,
			isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
			search: search as string | undefined,
			tags: tags ? (tags as string).split(',') : undefined,
			priceMin: priceMin ? Number(priceMin) : undefined,
			priceMax: priceMax ? Number(priceMax) : undefined,
			// Мультитенантность
			organizationId: orgId,
		})

		res.json(result)
	} catch (error) {
		next(error)
	}
}

/**
 * Поиск номенклатуры (для автокомплита в формах)
 * GET /api/nomenclature/search
 *
 * @swagger
 * /api/nomenclature/search:
 *   get:
 *     summary: Поиск номенклатуры (для автокомплита)
 *     tags: [Nomenclature]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: query
 *         schema:
 *           type: string
 *         description: Поисковый запрос
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Результаты поиска
 *       401:
 *         description: Не авторизован
 */
export const search = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { query = '', limit = 20 } = req.query
		const orgId = req.organizationId

		logger.info(`🔍 Nomenclature search: query="${query}", limit=${limit}`)

		const results = await nomenclatureService.search(String(query), Number(limit), orgId)
		logger.info(`🔍 Nomenclature search results: ${results.length} items found`)

		// Форматируем для использования в формах
		const formattedResults = results.map((item) => ({
			id: item.id,
			value: item.bitrixProductId || item.id,
			label: `${item.name}${item.price ? ` (${item.price} ${item.currency})` : ''}`,
			metadata: {
				localId: item.id,
				bitrixId: item.bitrixProductId,
				sku: item.sku,
				price: item.price,
				unit: item.unit?.shortName,
				category: item.category?.name,
			},
		}))

		res.json({
			result: formattedResults,
			total: formattedResults.length,
		})
	} catch (error) {
		next(error)
	}
}

/**
 * Получить номенклатуру по ID
 * GET /api/nomenclature/:id
 */
export const getById = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { id } = req.params
		const item = await nomenclatureService.findById(id)

		if (!item) {
			res.status(404).json({ message: 'Номенклатура не найдена' })
			return
		}

		res.json(item)
	} catch (error) {
		next(error)
	}
}

/**
 * Получить номенклатуру по SKU
 * GET /api/nomenclature/sku/:sku
 */
export const getBySku = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { sku } = req.params
		const item = await nomenclatureService.findBySku(sku)

		if (!item) {
			res.status(404).json({ message: 'Номенклатура не найдена' })
			return
		}

		res.json(item)
	} catch (error) {
		next(error)
	}
}

/**
 * Создать номенклатуру
 * POST /api/nomenclature
 */
export const create = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const orgId = req.organizationId
		const item = await nomenclatureService.create({ ...req.body, organizationId: orgId })
		res.status(201).json(item)
	} catch (error: any) {
		if (error.message?.includes('уже существует')) {
			res.status(409).json({ message: error.message })
			return
		}
		next(error)
	}
}

/**
 * Обновить номенклатуру
 * PUT /api/nomenclature/:id
 */
export const update = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { id } = req.params
		const item = await nomenclatureService.update(id, req.body)

		if (!item) {
			res.status(404).json({ message: 'Номенклатура не найдена' })
			return
		}

		res.json(item)
	} catch (error: any) {
		if (error.message.includes('уже существует')) {
			res.status(409).json({ message: error.message })
			return
		}
		next(error)
	}
}

/**
 * Удалить номенклатуру
 * DELETE /api/nomenclature/:id
 */
export const remove = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { id } = req.params
		const success = await nomenclatureService.delete(id)

		if (!success) {
			res.status(404).json({ message: 'Номенклатура не найдена' })
			return
		}

		res.status(204).send()
	} catch (error) {
		next(error)
	}
}

/**
 * Синхронизация с Bitrix24
 * POST /api/nomenclature/sync-bitrix
 */
export const syncFromBitrix = async (req: Request, res: Response, next: NextFunction) => {
	try {
		logger.info('Запуск синхронизации номенклатуры с Bitrix24...')
		const result = await nomenclatureService.syncFromBitrix24()
		res.json({
			success: true,
			message: 'Синхронизация завершена',
			...result,
		})
	} catch (error: any) {
		logger.error('Ошибка синхронизации:', error)
		res.status(500).json({
			success: false,
			message: 'Ошибка синхронизации',
			error: error.message,
		})
	}
}

/**
 * Импорт из Excel
 * POST /api/nomenclature/import
 */
export const importFromExcel = async (req: Request, res: Response, next: NextFunction) => {
	try {
		if (!req.file) {
			res.status(400).json({ message: 'Файл не загружен' })
			return
		}

		const result = await nomenclatureExcelService.importFromExcel(req.file.path)
		res.json({
			success: true,
			message: 'Импорт завершен',
			...result,
		})
	} catch (error: any) {
		logger.error('Ошибка импорта Excel:', error)
		res.status(500).json({
			success: false,
			message: 'Ошибка импорта',
			error: error.message,
		})
	}
}

/**
 * Экспорт в Excel
 * GET /api/nomenclature/export
 */
export const exportToExcel = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { categoryId, type, syncStatus, isActive } = req.query

		const buffer = await nomenclatureExcelService.exportToExcel({
			categoryId: categoryId as string | undefined,
			type: type as NomenclatureType | undefined,
			syncStatus: syncStatus as NomenclatureSyncStatus | undefined,
			isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
		})

		const filename = `nomenclature_${new Date().toISOString().split('T')[0]}.xlsx`

		res.setHeader(
			'Content-Type',
			'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
		)
		res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
		res.send(buffer)
	} catch (error) {
		next(error)
	}
}

/**
 * Скачать шаблон Excel для импорта
 * GET /api/nomenclature/template
 */
export const downloadTemplate = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const buffer = await nomenclatureExcelService.generateTemplate()

		res.setHeader(
			'Content-Type',
			'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
		)
		res.setHeader('Content-Disposition', 'attachment; filename="nomenclature_template.xlsx"')
		res.send(buffer)
	} catch (error) {
		next(error)
	}
}

/**
 * Получить статистику номенклатуры
 * GET /api/nomenclature/stats
 */
export const getStats = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const stats = await nomenclatureService.getStats()
		res.json(stats)
	} catch (error) {
		next(error)
	}
}

/**
 * Получить номенклатуру с ошибками синхронизации
 * GET /api/nomenclature/sync-errors
 */
export const getSyncErrors = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const items = await nomenclatureService.getWithSyncErrors()
		res.json(items)
	} catch (error) {
		next(error)
	}
}

// === Категории ===

/**
 * Получить все категории
 * GET /api/nomenclature/categories
 */
export const getCategories = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { tree } = req.query

		if (tree === 'true') {
			const categories = await nomenclatureService.getCategoryTree()
			res.json(categories)
			return
		}

		const categories = await nomenclatureService.getAllCategories()
		res.json(categories)
	} catch (error) {
		next(error)
	}
}

/**
 * Создать категорию
 * POST /api/nomenclature/categories
 */
export const createCategory = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const category = await nomenclatureService.createCategory(req.body)
		res.status(201).json(category)
	} catch (error: any) {
		if (error.message.includes('уже существует')) {
			res.status(409).json({ message: error.message })
			return
		}
		next(error)
	}
}

/**
 * Обновить категорию
 * PUT /api/nomenclature/categories/:id
 */
export const updateCategory = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { id } = req.params
		const category = await nomenclatureService.updateCategory(id, req.body)

		if (!category) {
			res.status(404).json({ message: 'Категория не найдена' })
			return
		}

		res.json(category)
	} catch (error: any) {
		if (error.message.includes('уже существует')) {
			res.status(409).json({ message: error.message })
			return
		}
		next(error)
	}
}

/**
 * Удалить категорию
 * DELETE /api/nomenclature/categories/:id
 */
export const deleteCategory = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { id } = req.params
		const success = await nomenclatureService.deleteCategory(id)

		if (!success) {
			res.status(404).json({ message: 'Категория не найдена' })
			return
		}

		res.status(204).send()
	} catch (error) {
		next(error)
	}
}

// === Единицы измерения ===

/**
 * Получить все единицы измерения
 * GET /api/nomenclature/units
 */
export const getUnits = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const units = await nomenclatureService.getAllUnits()
		res.json(units)
	} catch (error) {
		next(error)
	}
}
