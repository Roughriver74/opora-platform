import { Request, Response, NextFunction } from 'express'
import { getOrganizationService } from '../services/OrganizationService'

/**
 * Middleware-фабрика для проверки активности модуля в организации.
 *
 * Логика:
 * - Суперадмин — всегда пропускается
 * - Нет organizationId — 403 "Организация не выбрана"
 * - Организация не найдена — 404
 * - settings.modules отсутствует — пропустить (backward compatibility)
 * - modules[moduleName] === false — 403 "Модуль не активирован"
 * - Иначе — пропустить
 *
 * Использование:
 *   router.use(moduleGuard('visits'))
 *   router.get('/visits', moduleGuard('visits'), handler)
 */
export function moduleGuard(moduleName: string) {
	return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
		// Суперадмин имеет доступ ко всему
		if (req.isSuperAdmin) {
			next()
			return
		}

		// Без контекста организации доступ невозможен
		if (!req.organizationId) {
			res.status(403).json({
				success: false,
				message: 'Организация не выбрана',
				code: 'ORGANIZATION_REQUIRED',
			})
			return
		}

		try {
			const orgService = getOrganizationService()
			const org = await orgService.findById(req.organizationId)

			if (!org) {
				res.status(404).json({
					success: false,
					message: 'Организация не найдена',
					code: 'ORGANIZATION_NOT_FOUND',
				})
				return
			}

			const modules = org.settings?.modules

			// Если конфигурация модулей не задана — разрешаем (backward compatibility)
			if (!modules) {
				next()
				return
			}

			// Явное отключение модуля
			if (modules[moduleName] === false) {
				res.status(403).json({
					success: false,
					message: 'Модуль не активирован',
					code: 'MODULE_DISABLED',
					module: moduleName,
				})
				return
			}

			next()
		} catch (error) {
			next(error)
		}
	}
}
