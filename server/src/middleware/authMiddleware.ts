import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import AdminToken from '../models/AdminToken'
import User from '../models/User'

// Интерфейс для пользователя в токене
interface AuthUser {
	id?: string
	role: 'admin' | 'user'
	isAdmin: boolean
	isUser: boolean
	tokenType: 'access'
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
				req.isAdmin = false
				return next()
			}

			// Проверяем, есть ли пользователь в базе данных
			if (decoded.userId) {
				// Новая система авторизации - токен содержит userId
				try {
					const user = await User.findById(decoded.userId)
					if (user && user.status === 'active') {
						req.user = {
							id: user._id.toString(),
							role: user.role,
							isAdmin: user.role === 'admin',
							isUser: user.role === 'user',
							tokenType: 'access',
						}
						req.isAdmin = user.role === 'admin'
					} else {
						req.isAdmin = false
					}
				} catch (userError) {
					console.error('Ошибка получения пользователя:', userError)
					req.isAdmin = false
				}
			} else {
				// Старая система авторизации - проверяем AdminToken
				const tokenDoc = await AdminToken.findOne({ token })
				if (tokenDoc) {
					req.isAdmin = true
				} else {
					req.isAdmin = false
				}
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
	if (!req.user && !req.isAdmin) {
		res.status(401).json({
			success: false,
			message: 'Требуется авторизация',
		})
		return
	}

	next()
}
