import { Request, Response } from 'express'
import { getOrganizationService } from '../services/OrganizationService'
import { OrganizationRole } from '../database/entities/UserOrganization.entity'

const organizationService = getOrganizationService()

/**
 * Получить список всех организаций (суперадмин)
 */
export const getAll = async (req: Request, res: Response): Promise<void> => {
	try {
		const organizations = await organizationService.findAll()
		res.json({ success: true, data: organizations })
	} catch (error: any) {
		res.status(500).json({ success: false, message: error.message })
	}
}

/**
 * Получить организацию по ID
 */
export const getById = async (req: Request, res: Response): Promise<void> => {
	try {
		const org = await organizationService.findById(req.params.id)
		if (!org) {
			res.status(404).json({ success: false, message: 'Организация не найдена' })
			return
		}
		res.json({ success: true, data: org })
	} catch (error: any) {
		res.status(500).json({ success: false, message: error.message })
	}
}

/**
 * Создать организацию (суперадмин)
 */
export const create = async (req: Request, res: Response): Promise<void> => {
	try {
		const { name, slug, inn, settings } = req.body

		if (!name || !slug) {
			res.status(400).json({ success: false, message: 'name и slug обязательны' })
			return
		}

		const org = await organizationService.create({ name, slug, inn, settings })
		res.status(201).json({ success: true, data: org })
	} catch (error: any) {
		res.status(400).json({ success: false, message: error.message })
	}
}

/**
 * Обновить организацию
 */
export const update = async (req: Request, res: Response): Promise<void> => {
	try {
		const org = await organizationService.update(req.params.id, req.body)
		if (!org) {
			res.status(404).json({ success: false, message: 'Организация не найдена' })
			return
		}
		res.json({ success: true, data: org })
	} catch (error: any) {
		res.status(400).json({ success: false, message: error.message })
	}
}

/**
 * Деактивировать организацию (суперадмин)
 */
export const deactivate = async (req: Request, res: Response): Promise<void> => {
	try {
		const result = await organizationService.deactivate(req.params.id)
		if (!result) {
			res.status(404).json({ success: false, message: 'Организация не найдена' })
			return
		}
		res.json({ success: true, message: 'Организация деактивирована' })
	} catch (error: any) {
		res.status(500).json({ success: false, message: error.message })
	}
}

// === Участники ===

/**
 * Получить участников организации
 */
export const getMembers = async (req: Request, res: Response): Promise<void> => {
	try {
		const members = await organizationService.getMembers(req.params.id)
		const data = members.map(m => ({
			id: m.id,
			userId: m.userId,
			role: m.role,
			isActive: m.isActive,
			createdAt: m.createdAt,
			user: m.user ? {
				id: m.user.id,
				email: m.user.email,
				firstName: m.user.firstName,
				lastName: m.user.lastName,
				fullName: m.user.fullName,
			} : null,
		}))
		res.json({ success: true, data })
	} catch (error: any) {
		res.status(500).json({ success: false, message: error.message })
	}
}

/**
 * Добавить участника в организацию
 */
export const addMember = async (req: Request, res: Response): Promise<void> => {
	try {
		const { userId, role } = req.body

		if (!userId || !role) {
			res.status(400).json({ success: false, message: 'userId и role обязательны' })
			return
		}

		if (!Object.values(OrganizationRole).includes(role)) {
			res.status(400).json({ success: false, message: `Роль должна быть одной из: ${Object.values(OrganizationRole).join(', ')}` })
			return
		}

		const membership = await organizationService.addMember(req.params.id, { userId, role })
		res.status(201).json({ success: true, data: membership })
	} catch (error: any) {
		res.status(400).json({ success: false, message: error.message })
	}
}

/**
 * Изменить роль участника
 */
export const updateMemberRole = async (req: Request, res: Response): Promise<void> => {
	try {
		const { role } = req.body

		if (!role || !Object.values(OrganizationRole).includes(role)) {
			res.status(400).json({ success: false, message: `Роль должна быть одной из: ${Object.values(OrganizationRole).join(', ')}` })
			return
		}

		const membership = await organizationService.updateMemberRole(req.params.id, req.params.userId, role)
		if (!membership) {
			res.status(404).json({ success: false, message: 'Участник не найден' })
			return
		}
		res.json({ success: true, data: membership })
	} catch (error: any) {
		res.status(400).json({ success: false, message: error.message })
	}
}

/**
 * Удалить участника из организации
 */
export const removeMember = async (req: Request, res: Response): Promise<void> => {
	try {
		const result = await organizationService.removeMember(req.params.id, req.params.userId)
		if (!result) {
			res.status(404).json({ success: false, message: 'Участник не найден' })
			return
		}
		res.json({ success: true, message: 'Участник удалён из организации' })
	} catch (error: any) {
		res.status(500).json({ success: false, message: error.message })
	}
}

/**
 * Получить клиентскую конфигурацию текущей организации
 * GET /api/organizations/current/config
 * Возвращает настройки для фронтенда: брендинг, статусы, конфигурацию материалов
 */
export const getCurrentConfig = async (req: Request, res: Response): Promise<void> => {
	try {
		const orgId = req.organizationId

		if (!orgId) {
			// Дефолтная конфигурация без организации
			res.json({
				success: true,
				data: {
					branding: {
						companyName: 'ОПОРА',
						primaryColor: '#1976d2',
						secondaryColor: '#dc004e',
					},
					statuses: {
						NEW: { label: 'Новая', color: 'primary' },
						IN_PROGRESS: { label: 'В работе', color: 'warning' },
						COMPLETED: { label: 'Выполнено', color: 'success' },
						CANCELLED: { label: 'Отменено', color: 'error' },
					},
					bitrixEnabled: false,
					materialConfig: {},
				},
			})
			return
		}

		const settings = await organizationService.getSettings(orgId)
		const org = await organizationService.findById(orgId)

		res.json({
			success: true,
			data: {
				organizationName: org?.name,
				branding: settings.branding || {
					companyName: org?.name || 'ОПОРА',
					primaryColor: '#1976d2',
					secondaryColor: '#dc004e',
				},
				statuses: settings.bitrixStatuses || {
					NEW: 'Новая',
					IN_PROGRESS: 'В работе',
					COMPLETED: 'Выполнено',
					CANCELLED: 'Отменено',
				},
				bitrixEnabled: settings.bitrixEnabled || false,
				materialConfig: settings.materialConfig || {},
				specialFields: settings.specialFields || {},
			},
		})
	} catch (error: any) {
		res.status(500).json({ success: false, message: error.message })
	}
}
