import { Request, Response, NextFunction } from 'express'
import { logger } from '../utils/logger'

/**
 * Middleware для проверки админских прав
 */
export const requireAdmin = (
	req: Request,
	res: Response,
	next: NextFunction
): void => {
	try {
		// Проверяем, что пользователь аутентифицирован
		if (!req.user) {
			logger.warn('Попытка доступа к админскому функционалу без аутентификации')
			res.status(401).json({
				success: false,
				message: 'Требуется аутентификация',
			})
			return
		}

		// Проверяем админские права
		const userRole = (req.user as any).role
		if (userRole !== 'admin') {
			logger.warn(
				`Пользователь ${
					(req.user as any).email
				} попытался получить доступ к админскому функционалу`
			)
			res.status(403).json({
				success: false,
				message: 'Требуются админские права',
			})
			return
		}

		// Пользователь имеет админские права
		next()
	} catch (error) {
		logger.error('Ошибка в middleware requireAdmin:', error)
		res.status(500).json({
			success: false,
			message: 'Внутренняя ошибка сервера',
		})
	}
}
