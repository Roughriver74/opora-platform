import { Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import { getUserService } from '../services/UserService'
import { AppDataSource } from '../database/config/database.config'
import { AdminToken } from '../database/entities/AdminToken.entity'
import { User } from '../database/entities/User.entity'

const userService = getUserService()

/**
 * Логин администратора
 */
export const adminLogin = async (
	req: Request,
	res: Response
): Promise<void> => {
	try {
		const { username, password } = req.body

		// Проверяем учетные данные администратора
		const adminUsername = process.env.ADMIN_USERNAME || 'admin'
		const adminPassword = process.env.ADMIN_PASSWORD || 'admin'

		if (username !== adminUsername || password !== adminPassword) {
			res.status(401).json({
				success: false,
				message: 'Неверные учетные данные',
			})
			return
		}

		// Генерируем токены
		const secret =
			process.env.JWT_SECRET || 'default-jwt-secret-key-change-in-production'

		const accessToken = jwt.sign(
			{ adminId: 'admin', email: 'admin@beton.com' },
			secret,
			{ expiresIn: '4h' }
		)

		const refreshToken = jwt.sign(
			{ adminId: 'admin', email: 'admin@beton.com' },
			secret,
			{ expiresIn: '7d' }
		)

		// Сохраняем токен в базу
		const tokenRepository = AppDataSource.getRepository(AdminToken)
		const adminToken = AdminToken.createToken('admin', 'Admin login', 7)
		adminToken.token = accessToken
		await tokenRepository.save(adminToken)

		// Очищаем старые токены
		const sevenDaysAgo = new Date()
		sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
		await tokenRepository
			.createQueryBuilder()
			.delete()
			.where('createdAt < :date', { date: sevenDaysAgo })
			.execute()

		res.json({
			success: true,
			accessToken,
			refreshToken,
			user: {
				role: 'admin',
				email: 'admin@beton.com',
			},
		})
	} catch (error) {
		console.error('Ошибка при логине администратора:', error)
		res.status(500).json({
			success: false,
			message: 'Внутренняя ошибка сервера',
		})
	}
}

/**
 * Логин пользователя
 */
export const userLogin = async (req: Request, res: Response): Promise<void> => {
	try {
		const { email, password } = req.body


		// Используем сервис для аутентификации
		const authResult = await userService.login({ email, password })

		if (!authResult) {
			res.status(401).json({
				success: false,
				message: 'Неверный email или пароль',
			})
			return
		}


		res.json({
			success: true,
			accessToken: authResult.token,
			refreshToken: authResult.token, // В реальном приложении нужен отдельный refresh token
			user: authResult.user,
			organizations: authResult.organizations,
			needsOrganizationSelection: authResult.needsOrganizationSelection,
		})
	} catch (error: any) {
		console.error('Ошибка при логине пользователя:', error)
		res.status(500).json({
			success: false,
			message: error.message || 'Внутренняя ошибка сервера',
		})
	}
}

/**
 * Выбор организации — возвращает новый JWT с контекстом организации
 */
export const selectOrganization = async (req: Request, res: Response): Promise<void> => {
	try {
		const userId = req.user?.id
		const { organizationId } = req.body

		if (!userId) {
			res.status(401).json({ success: false, message: 'Требуется авторизация' })
			return
		}

		if (!organizationId) {
			res.status(400).json({ success: false, message: 'organizationId обязателен' })
			return
		}

		const result = await userService.selectOrganization(userId, organizationId)

		if (!result) {
			res.status(403).json({ success: false, message: 'Нет доступа к этой организации' })
			return
		}

		res.json({
			success: true,
			accessToken: result.token,
			refreshToken: result.token,
			user: result.user,
			organizations: result.organizations,
		})
	} catch (error: any) {
		console.error('Ошибка при выборе организации:', error)
		res.status(500).json({ success: false, message: error.message || 'Внутренняя ошибка сервера' })
	}
}

/**
 * Получить список организаций текущего пользователя
 */
export const getMyOrganizations = async (req: Request, res: Response): Promise<void> => {
	try {
		const userId = req.user?.id

		if (!userId) {
			res.status(401).json({ success: false, message: 'Требуется авторизация' })
			return
		}

		const organizations = await userService.getUserOrganizations(userId)

		res.json({
			success: true,
			data: organizations,
		})
	} catch (error: any) {
		console.error('Ошибка при получении организаций:', error)
		res.status(500).json({ success: false, message: error.message || 'Внутренняя ошибка сервера' })
	}
}

/**
 * Проверка токена
 */
export const verifyToken = async (
	req: Request,
	res: Response
): Promise<void> => {
	try {
		const token = req.headers.authorization?.split(' ')[1]

		if (!token) {
			res.status(401).json({
				success: false,
				message: 'Токен отсутствует',
			})
			return
		}

		const secret =
			process.env.JWT_SECRET || 'default-jwt-secret-key-change-in-production'

		jwt.verify(
			token,
			secret,
			async (err: jwt.VerifyErrors | null, decoded: any) => {
				if (err) {
					res.status(401).json({
						success: false,
						message: 'Токен недействителен',
					})
					return
				}

				// Проверяем тип токена
				if (decoded.id || decoded.userId) {
					// Токен пользователя
					const userId = decoded.id || decoded.userId
					const user = await userService.findById(userId)
					
					if (!user || !user.isActive) {
						res.status(401).json({
							success: false,
							message: 'Пользователь не найден или неактивен',
						})
						return
					}

					// Безопасно извлекаем данные пользователя
					const safeUser = user.toSafeObject ? user.toSafeObject() : {
						id: user.id,
						email: user.email,
						firstName: user.firstName,
						lastName: user.lastName,
						phone: user.phone,
						role: user.role,
						isActive: user.isActive,
						settings: user.settings,
						lastLogin: user.lastLogin,
						createdAt: user.createdAt,
						updatedAt: user.updatedAt,
						fullName: user.fullName
					}
					
					res.json({
						success: true,
						message: 'Токен действителен',
						user: safeUser,
					})
				} else if (decoded.adminId) {
					// Токен администратора
					const tokenRepository = AppDataSource.getRepository(AdminToken)
					const storedToken = await tokenRepository.findOne({ 
						where: { token },
						relations: ['user']
					})

					if (!storedToken || !storedToken.isValid()) {
						res.status(401).json({
							success: false,
							message: 'Токен недействителен',
						})
						return
					}

					// Обновляем время последнего использования
					storedToken.markAsUsed()
					await tokenRepository.save(storedToken)

					res.json({
						success: true,
						message: 'Токен действителен',
						user: {
							role: 'admin',
							email: 'admin@beton.com',
						},
					})
				} else {
					res.status(401).json({
						success: false,
						message: 'Неизвестный тип токена',
					})
				}
			}
		)
	} catch (error) {
		console.error('Ошибка проверки токена:', error)
		res.status(500).json({
			success: false,
			message: 'Внутренняя ошибка сервера',
		})
	}
}

/**
 * Logout - отзыв токена
 */
export const logout = async (req: Request, res: Response): Promise<void> => {
	try {
		const token = req.headers.authorization?.split(' ')[1]

		if (token) {
			// Удаляем токен из базы данных
			const tokenRepository = AppDataSource.getRepository(AdminToken)
			await tokenRepository.delete({ token })
		}

		res.json({
			success: true,
			message: 'Выход выполнен успешно',
		})
	} catch (error) {
		console.error('Ошибка при выходе:', error)
		res.status(500).json({
			success: false,
			message: 'Внутренняя ошибка сервера',
		})
	}
}

/**
 * Обновление токена доступа
 */
export const refreshToken = async (
	req: Request,
	res: Response
): Promise<void> => {
	try {
		const { refreshToken } = req.body

		if (!refreshToken) {
			res.status(401).json({
				success: false,
				message: 'Refresh token отсутствует',
			})
			return
		}

		const secret =
			process.env.JWT_SECRET || 'default-jwt-secret-key-change-in-production'

		jwt.verify(
			refreshToken,
			secret,
			async (err: jwt.VerifyErrors | null, decoded: any) => {
				if (err) {
					res.status(401).json({
						success: false,
						message: 'Refresh token недействителен',
					})
					return
				}

				// Проверяем тип токена и получаем пользователя
				let tokenPayload: any = null
				
				if (decoded.id || decoded.userId) {
					const userId = decoded.id || decoded.userId
					const user = await userService.findById(userId)
					
					if (!user || !user.isActive) {
						res.status(401).json({
							success: false,
							message: 'Пользователь не найден или неактивен',
						})
						return
					}
					
					tokenPayload = {
						userId: user.id,
						id: user.id,
						email: user.email,
						role: user.role,
					}
				} else if (decoded.adminId) {
					// Для админа
					tokenPayload = {
						adminId: decoded.adminId,
						email: decoded.email,
					}
				} else {
					res.status(401).json({
						success: false,
						message: 'Не удалось определить пользователя',
					})
					return
				}

				// Генерируем новые токены
				const newAccessToken = jwt.sign(tokenPayload, secret, { expiresIn: '4h' })
				const newRefreshToken = jwt.sign(tokenPayload, secret, { expiresIn: '7d' })

				res.json({
					success: true,
					accessToken: newAccessToken,
					refreshToken: newRefreshToken,
				})
			}
		)
	} catch (error: any) {
		console.error('Ошибка при обновлении токена:', error)
		res.status(500).json({
			success: false,
			message: error.message || 'Ошибка сервера при обновлении токена',
		})
	}
}