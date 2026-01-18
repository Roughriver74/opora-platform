import { Request, Response, NextFunction } from 'express'
import { getContactService } from '../services/ContactService'
import { ContactType, ContactSyncStatus } from '../database/entities'

const contactService = getContactService()

/**
 * Получить список контактов с фильтрацией и пагинацией
 * GET /api/contacts
 */
export const getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
	try {
		const {
			page = '1',
			limit = '20',
			search,
			companyId,
			contactType,
			syncStatus,
			isActive,
			isPrimary,
			tags,
			sortBy = 'lastName',
			sortOrder = 'ASC',
		} = req.query

		const result = await contactService.findAll({
			page: parseInt(page as string),
			limit: parseInt(limit as string),
			search: search as string,
			companyId: companyId as string,
			contactType: contactType as ContactType,
			syncStatus: syncStatus as ContactSyncStatus,
			isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
			isPrimary: isPrimary === 'true' ? true : isPrimary === 'false' ? false : undefined,
			tags: tags ? (tags as string).split(',') : undefined,
			sortBy: sortBy as string,
			sortOrder: sortOrder as 'ASC' | 'DESC',
		})

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
 * Поиск контактов (для автокомплита в формах)
 * GET /api/contacts/search
 */
export const search = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
	try {
		const { q = '', limit = '20', companyId } = req.query

		let contacts
		if (companyId) {
			// Если указана компания, ищем только среди её контактов
			const result = await contactService.findByCompany(companyId as string, {
				limit: parseInt(limit as string),
			})
			contacts = result.data
		} else {
			contacts = await contactService.search(q as string, parseInt(limit as string))
		}

		// Форматируем для использования в формах
		const options = contacts.map(contact => {
			const fullName = [contact.lastName, contact.firstName, contact.middleName]
				.filter(Boolean)
				.join(' ')

			return {
				value: contact.bitrixContactId || contact.id,
				label: fullName + (contact.phone ? ` (${contact.phone})` : ''),
				metadata: {
					localId: contact.id,
					bitrixId: contact.bitrixContactId,
					firstName: contact.firstName,
					lastName: contact.lastName,
					phone: contact.phone,
					email: contact.email,
					position: contact.position,
					companyId: contact.companyId,
					companyName: contact.company?.name,
				},
			}
		})

		res.json({
			success: true,
			data: options,
		})
	} catch (error) {
		next(error)
	}
}

/**
 * Получить контакт по ID
 * GET /api/contacts/:id
 */
export const getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
	try {
		const { id } = req.params

		const contact = await contactService.findById(id)
		if (!contact) {
			res.status(404).json({
				success: false,
				error: 'Контакт не найден',
			})
			return
		}

		res.json({
			success: true,
			data: contact,
		})
	} catch (error) {
		next(error)
	}
}

/**
 * Найти контакт по телефону
 * GET /api/contacts/by-phone/:phone
 */
export const getByPhone = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
	try {
		const { phone } = req.params

		const contact = await contactService.findByPhone(phone)
		if (!contact) {
			res.status(404).json({
				success: false,
				error: 'Контакт с указанным телефоном не найден',
			})
			return
		}

		res.json({
			success: true,
			data: contact,
		})
	} catch (error) {
		next(error)
	}
}

/**
 * Найти контакт по email
 * GET /api/contacts/by-email/:email
 */
export const getByEmail = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
	try {
		const { email } = req.params

		const contact = await contactService.findByEmail(email)
		if (!contact) {
			res.status(404).json({
				success: false,
				error: 'Контакт с указанным email не найден',
			})
			return
		}

		res.json({
			success: true,
			data: contact,
		})
	} catch (error) {
		next(error)
	}
}

/**
 * Получить контакты компании
 * GET /api/contacts/by-company/:companyId
 */
export const getByCompany = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
	try {
		const { companyId } = req.params
		const { page = '1', limit = '20' } = req.query

		const result = await contactService.findByCompany(companyId, {
			page: parseInt(page as string),
			limit: parseInt(limit as string),
		})

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
 * Получить основной контакт компании
 * GET /api/contacts/primary/:companyId
 */
export const getPrimaryByCompany = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
	try {
		const { companyId } = req.params

		const contact = await contactService.findPrimaryByCompany(companyId)
		if (!contact) {
			res.status(404).json({
				success: false,
				error: 'Основной контакт компании не найден',
			})
			return
		}

		res.json({
			success: true,
			data: contact,
		})
	} catch (error) {
		next(error)
	}
}

/**
 * Создать контакт
 * POST /api/contacts
 */
export const create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
	try {
		const contact = await contactService.create(req.body)

		res.status(201).json({
			success: true,
			data: contact,
			message: 'Контакт успешно создан',
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
 * Обновить контакт
 * PUT /api/contacts/:id
 */
export const update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
	try {
		const { id } = req.params

		const contact = await contactService.update(id, req.body)

		res.json({
			success: true,
			data: contact,
			message: 'Контакт успешно обновлен',
		})
	} catch (error: any) {
		if (error.message === 'Контакт не найден') {
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
 * Удалить контакт (soft delete)
 * DELETE /api/contacts/:id
 */
export const remove = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
	try {
		const { id } = req.params

		await contactService.delete(id)

		res.json({
			success: true,
			message: 'Контакт успешно удален',
		})
	} catch (error: any) {
		if (error.message === 'Контакт не найден') {
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
 * Полностью удалить контакт (hard delete)
 * DELETE /api/contacts/:id/hard
 */
export const hardDelete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
	try {
		const { id } = req.params

		await contactService.hardDelete(id)

		res.json({
			success: true,
			message: 'Контакт полностью удален',
		})
	} catch (error: any) {
		if (error.message === 'Контакт не найден') {
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
 * Установить основной контакт для компании
 * POST /api/contacts/:id/set-primary
 */
export const setPrimary = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
	try {
		const { id } = req.params
		const { companyId } = req.body

		if (!companyId) {
			res.status(400).json({
				success: false,
				error: 'companyId обязателен',
			})
			return
		}

		await contactService.setPrimaryContact(id, companyId)

		res.json({
			success: true,
			message: 'Основной контакт установлен',
		})
	} catch (error) {
		next(error)
	}
}

/**
 * Получить статистику по контактам
 * GET /api/contacts/stats
 */
export const getStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
	try {
		const stats = await contactService.getStats()

		res.json({
			success: true,
			data: stats,
		})
	} catch (error) {
		next(error)
	}
}

/**
 * Получить контакты с ошибками синхронизации
 * GET /api/contacts/sync-errors
 */
export const getSyncErrors = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
	try {
		const contacts = await contactService.findWithSyncErrors()

		res.json({
			success: true,
			data: contacts,
		})
	} catch (error) {
		next(error)
	}
}

/**
 * Получить контакты, ожидающие синхронизации
 * GET /api/contacts/pending-sync
 */
export const getPendingSync = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
	try {
		const contacts = await contactService.findPendingSync()

		res.json({
			success: true,
			data: contacts,
		})
	} catch (error) {
		next(error)
	}
}

export default {
	getAll,
	search,
	getById,
	getByPhone,
	getByEmail,
	getByCompany,
	getPrimaryByCompany,
	create,
	update,
	remove,
	hardDelete,
	setPrimary,
	getStats,
	getSyncErrors,
	getPendingSync,
}
