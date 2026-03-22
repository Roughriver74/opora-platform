import { Request, Response, NextFunction } from 'express'
import { OrganizationRole } from '../database/entities/UserOrganization.entity'

type AllowedRole = OrganizationRole | 'superadmin'

/**
 * Middleware для проверки роли пользователя в организации.
 * Суперадмин всегда проходит проверку.
 *
 * Использование:
 *   requireRole('org_admin')  // только админ организации
 *   requireRole('org_admin', 'manager')  // админ или менеджер
 *   requireRole('org_admin', 'manager', 'distributor')  // все роли
 */
export const requireRole = (...allowedRoles: AllowedRole[]) => {
	return (req: Request, res: Response, next: NextFunction): void => {
		// Суперадмин проходит всегда
		if (req.isSuperAdmin) {
			next()
			return
		}

		// Нет авторизации
		if (!req.user) {
			res.status(401).json({
				success: false,
				message: 'Требуется авторизация',
			})
			return
		}

		// Нет контекста организации
		if (!req.organizationRole) {
			res.status(403).json({
				success: false,
				message: 'Необходимо выбрать организацию',
				code: 'ORGANIZATION_REQUIRED',
			})
			return
		}

		// Проверка роли
		if (!allowedRoles.includes(req.organizationRole)) {
			res.status(403).json({
				success: false,
				message: 'Недостаточно прав для выполнения этого действия',
			})
			return
		}

		next()
	}
}
