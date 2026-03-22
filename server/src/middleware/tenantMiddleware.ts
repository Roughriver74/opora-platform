import { Request, Response, NextFunction } from 'express'

/**
 * Middleware для проверки контекста организации.
 * Вызывается ПОСЛЕ authMiddleware.
 *
 * Логика:
 * - Суперадмин без organizationId — допускается (глобальный режим)
 * - Обычный юзер с organizationId — допускается (контекст установлен)
 * - Обычный юзер без organizationId — 403 (нужно выбрать организацию)
 */
export const tenantMiddleware = (
	req: Request,
	res: Response,
	next: NextFunction
): void => {
	// Если нет авторизованного пользователя — пропускаем (публичный маршрут)
	if (!req.user) {
		next()
		return
	}

	// Суперадмин может работать без контекста организации
	if (req.isSuperAdmin) {
		next()
		return
	}

	// Обычный пользователь с контекстом организации — всё ок
	if (req.organizationId) {
		next()
		return
	}

	// Обычный пользователь без организации — нужно выбрать
	res.status(403).json({
		success: false,
		message: 'Необходимо выбрать организацию',
		code: 'ORGANIZATION_REQUIRED',
	})
}

/**
 * Опциональный tenant middleware — не блокирует запросы без организации.
 * Используется для маршрутов, которые работают и без контекста организации
 * (например, /api/auth/organizations — список организаций пользователя).
 */
export const optionalTenantMiddleware = (
	req: Request,
	_res: Response,
	next: NextFunction
): void => {
	// Просто пропускаем — организация может быть, а может нет
	next()
}
