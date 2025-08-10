import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { AppDataSource } from '../database/config/database.config'
import { AdminToken } from '../database/entities/AdminToken.entity'
import { User } from '../database/entities/User.entity'
import { getUserService } from '../services/UserService'

const userService = getUserService()

// Интерфейс для пользователя в токене
interface AuthUser {
	id?: string
	role: 'admin' | 'user'
	isAdmin: boolean
	isUser: boolean
	tokenType: 'access'
	bitrixUserId?: string
	settings?: Record<string, any>
}

// Расширяем интерфейс Request для добавления пользовательских свойств
declare global {
	namespace Express {
		interface Request {
			user?: AuthUser
			isAdmin?: boolean
		}
	}
}

/**
 * Middleware для проверки JWT токена и определения прав администратора
 */
export const authMiddleware = async (
	req: Request,
	res: Response,
	next: NextFunction
) => {
	try {
		// Получаем токен из заголовков Authorization
		const authHeader = req.headers.authorization
		const token = authHeader && authHeader.split(' ')[1]


		// Если токен не предоставлен, пропускаем запрос для публичных маршрутов
		if (!token) {
			req.isAdmin = false
			return next()
		}

		// Проверяем JWT токен
		const secret =
			process.env.JWT_SECRET || 'default-jwt-secret-key-change-in-production'

		jwt.verify(token, secret, async (err, decoded: any) => {
			if (err) {
				console.error('❌ Ошибка верификации JWT токена:', err.message)
				req.isAdmin = false
				req.user = undefined
				return next()
			}


			try {
				// Проверяем тип токена
				if (decoded.adminId) {
					// Токен администратора
					const tokenRepository = AppDataSource.getRepository(AdminToken)
					const storedToken = await tokenRepository.findOne({ 
						where: { token },
						relations: ['user']
					})

					if (storedToken && storedToken.isValid()) {
						// Обновляем время последнего использования
						storedToken.markAsUsed()
						await tokenRepository.save(storedToken)
						
						req.isAdmin = true
						req.user = {
							id: 'admin',
							role: 'admin',
							isAdmin: true,
							isUser: false,
							tokenType: 'access',
						}
					} else {
						req.isAdmin = false
						req.user = undefined
					}
				} else {
					// Токен пользователя
					const userId = decoded.id || decoded.userId || decoded.sub
					
					const user = await userService.findById(userId)
					
					if (user && user.isActive) {
						req.user = {
							id: user.id,
							role: user.role,
							isAdmin: user.role === 'admin',
							isUser: user.role === 'user',
							tokenType: 'access',
							bitrixUserId: user.bitrixUserId,
							settings: user.settings,
						}
						req.isAdmin = user.role === 'admin'
					} else {
						req.isAdmin = false
						req.user = undefined
					}
				}
			} catch (userError) {
				console.error('❌ Ошибка получения пользователя:', userError)
				req.isAdmin = false
				req.user = undefined
			}

			next()
		})
	} catch (error) {
		console.error('Ошибка в middleware авторизации:', error)
		req.isAdmin = false
		next()
	}
}

/**
 * Middleware для проверки прав администратора
 * Используется после authMiddleware для защищенных маршрутов
 */
export const requireAdmin = (
	req: Request,
	res: Response,
	next: NextFunction
): void => {
	if (!req.isAdmin) {
		res.status(401).json({
			success: false,
			message: 'Требуются права администратора',
		})
		return
	}

	next()
}

/**
 * Middleware для проверки авторизации (любая роль)
 */
export const requireAuth = (
	req: Request,
	res: Response,
	next: NextFunction
): void => {
	// Проверяем, есть ли авторизованный пользователь или админ
	if (!req.user) {
		res.status(401).json({
			success: false,
			message: 'Требуется авторизация',
		})
		return
	}

	next()
}
