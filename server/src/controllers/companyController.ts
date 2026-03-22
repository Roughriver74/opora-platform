import { Request, Response, NextFunction } from 'express'
import * as fs from 'fs'
import { getCompanyService } from '../services/CompanyService'
import { companyExcelService } from '../services/CompanyExcelService'
import { CompanyType, CompanySyncStatus } from '../database/entities'
import { logger } from '../utils/logger'

const companyService = getCompanyService()

/**
 * Получить список компаний с фильтрацией и пагинацией
 * GET /api/companies
 */
export const getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
	try {
		const {
			page = '1',
			limit = '20',
			search,
			companyType,
			syncStatus,
			isActive,
			industry,
			tags,
			sortBy = 'name',
			sortOrder = 'ASC',
		} = req.query

		const orgId = req.organizationId

		const result = await companyService.findAll({
			page: parseInt(page as string),
			limit: parseInt(limit as string),
			search: search as string,
			companyType: companyType as CompanyType,
			syncStatus: syncStatus as CompanySyncStatus,
			isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
			industry: industry as string,
			tags: tags ? (tags as string).split(',') : undefined,
			sortBy: sortBy as string,
			sortOrder: sortOrder as 'ASC' | 'DESC',
		}, orgId)

		res.json({
			success: true,
			data: result.data,
			pagination: {
				total: result.total,
				page: result.page,
				limit: result.limit,
				totalPages: result.totalPages,
				hasNext: result.hasNext,
				hasPrev: result.hasPrev,
			},
		})
	} catch (error) {
		next(error)
	}
}

/**
 * Поиск компаний (для автокомплита в формах)
 * GET /api/companies/search
 *
 * @swagger
 * /api/companies/search:
 *   get:
 *     summary: Поиск компаний (для автокомплита)
 *     tags: [Companies]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
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
 *         description: Результаты поиска компаний
 *       401:
 *         description: Не авторизован
 */
export const search = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
	try {
		const { q = '', limit = '20' } = req.query

		const orgId = req.organizationId
		const companies = await companyService.search(q as string, parseInt(limit as string), orgId)

		// Форматируем для использования в формах
		const options = companies.map(company => ({
			value: company.bitrixCompanyId || company.id,
			label: company.name + (company.inn ? ` (ИНН: ${company.inn})` : ''),
			metadata: {
				localId: company.id,
				bitrixId: company.bitrixCompanyId,
				inn: company.inn,
				phone: company.phone,
				email: company.email,
				shortName: company.shortName,
			},
		}))

		res.json({
			success: true,
			data: options,
		})
	} catch (error) {
		next(error)
	}
}

/**
 * Получить компанию по ID
 * GET /api/companies/:id
 */
export const getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
	try {
		const { id } = req.params
		const orgId = req.organizationId

		const company = await companyService.findById(id, orgId)
		if (!company) {
			res.status(404).json({
				success: false,
				error: 'Компания не найдена',
			})
			return
		}

		res.json({
			success: true,
			data: company,
		})
	} catch (error) {
		next(error)
	}
}

/**
 * Найти компанию по ИНН
 * GET /api/companies/by-inn/:inn
 *
 * @swagger
 * /api/companies/by-inn/{inn}:
 *   get:
 *     summary: Найти компанию по ИНН
 *     tags: [Companies]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: inn
 *         required: true
 *         schema:
 *           type: string
 *         description: ИНН компании
 *     responses:
 *       200:
 *         description: Компания найдена
 *       404:
 *         description: Компания не найдена
 *       401:
 *         description: Не авторизован
 */
export const getByInn = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
	try {
		const { inn } = req.params

		const company = await companyService.findByInn(inn)
		if (!company) {
			res.status(404).json({
				success: false,
				error: 'Компания с указанным ИНН не найдена',
			})
			return
		}

		res.json({
			success: true,
			data: company,
		})
	} catch (error) {
		next(error)
	}
}

/**
 * Создать компанию
 * POST /api/companies
 */
export const create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
	try {
		const orgId = req.organizationId
		const company = await companyService.create(req.body, orgId)

		res.status(201).json({
			success: true,
			data: company,
			message: 'Компания успешно создана',
		})
	} catch (error: any) {
		if (error.message.includes('уже существует')) {
			res.status(409).json({
				success: false,
				error: error.message,
			})
			return
		}
		next(error)
	}
}

/**
 * Обновить компанию
 * PUT /api/companies/:id
 */
export const update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
	try {
		const { id } = req.params
		const orgId = req.organizationId

		const company = await companyService.update(id, req.body, orgId)

		res.json({
			success: true,
			data: company,
			message: 'Компания успешно обновлена',
		})
	} catch (error: any) {
		if (error.message === 'Компания не найдена') {
			res.status(404).json({
				success: false,
				error: error.message,
			})
			return
		}
		if (error.message.includes('уже существует')) {
			res.status(409).json({
				success: false,
				error: error.message,
			})
			return
		}
		next(error)
	}
}

/**
 * Удалить компанию (soft delete)
 * DELETE /api/companies/:id
 */
export const remove = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
	try {
		const { id } = req.params
		const orgId = req.organizationId

		await companyService.delete(id, orgId)

		res.json({
			success: true,
			message: 'Компания успешно удалена',
		})
	} catch (error: any) {
		if (error.message === 'Компания не найдена') {
			res.status(404).json({
				success: false,
				error: error.message,
			})
			return
		}
		next(error)
	}
}

/**
 * Полностью удалить компанию (hard delete)
 * DELETE /api/companies/:id/hard
 */
export const hardDelete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
	try {
		const { id } = req.params
		const orgId = req.organizationId

		await companyService.hardDelete(id, orgId)

		res.json({
			success: true,
			message: 'Компания полностью удалена',
		})
	} catch (error: any) {
		if (error.message === 'Компания не найдена') {
			res.status(404).json({
				success: false,
				error: error.message,
			})
			return
		}
		next(error)
	}
}

/**
 * Получить статистику по компаниям
 * GET /api/companies/stats
 */
export const getStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
	try {
		const stats = await companyService.getStats()

		res.json({
			success: true,
			data: stats,
		})
	} catch (error) {
		next(error)
	}
}

/**
 * Получить компании с ошибками синхронизации
 * GET /api/companies/sync-errors
 */
export const getSyncErrors = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
	try {
		const companies = await companyService.findWithSyncErrors()

		res.json({
			success: true,
			data: companies,
		})
	} catch (error) {
		next(error)
	}
}

/**
 * Получить компании, ожидающие синхронизации
 * GET /api/companies/pending-sync
 */
export const getPendingSync = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
	try {
		const companies = await companyService.findPendingSync()

		res.json({
			success: true,
			data: companies,
		})
	} catch (error) {
		next(error)
	}
}

/**
 * Импорт компаний из Excel
 * POST /api/companies/import
 */
export const importFromExcel = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
	try {
		if (!req.file) {
			res.status(400).json({
				success: false,
				error: 'Файл не загружен',
			})
			return
		}

		// Читаем файл в Buffer
		const fileBuffer = fs.readFileSync(req.file.path)

		// Удаляем временный файл после чтения
		fs.unlinkSync(req.file.path)

		const result = await companyExcelService.importFromExcel(fileBuffer)

		res.json({
			success: result.success,
			message: result.success
				? `Импорт завершен: ${result.created} создано, ${result.updated} обновлено`
				: `Импорт завершен с ошибками: ${result.failed} ошибок`,
			data: result,
		})
	} catch (error: any) {
		logger.error('[CompanyController] Ошибка импорта Excel:', error)
		res.status(500).json({
			success: false,
			error: 'Ошибка импорта',
			message: error.message,
		})
	}
}

/**
 * Экспорт компаний в Excel
 * GET /api/companies/export
 */
export const exportToExcel = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
	try {
		const { companyType, isActive } = req.query

		const buffer = await companyExcelService.exportToExcel({
			companyType: companyType as CompanyType | undefined,
			isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
		})

		const filename = `companies_${new Date().toISOString().split('T')[0]}.xlsx`

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
 * Скачать шаблон Excel для импорта компаний
 * GET /api/companies/template
 */
export const downloadTemplate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
	try {
		const buffer = await companyExcelService.generateTemplate()

		res.setHeader(
			'Content-Type',
			'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
		)
		res.setHeader('Content-Disposition', 'attachment; filename="companies_template.xlsx"')
		res.send(buffer)
	} catch (error) {
		next(error)
	}
}

export default {
	getAll,
	search,
	getById,
	getByInn,
	create,
	update,
	remove,
	hardDelete,
	getStats,
	getSyncErrors,
	getPendingSync,
	importFromExcel,
	exportToExcel,
	downloadTemplate,
}
