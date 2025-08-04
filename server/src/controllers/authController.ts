import { Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import User from '../models/User'
import AdminToken from '../models/AdminToken'

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
		await AdminToken.create({
			token: accessToken,
			adminId: 'admin',
		})

		// Очищаем старые токены (старше 7 дней)
		const sevenDaysAgo = new Date()
		sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
		await AdminToken.deleteMany({ createdAt: { $lt: sevenDaysAgo } })

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

		console.log(`🔍 Login attempt for email: ${email}`)

		// Ищем пользователя по email
		const user = await User.findOne({ email })

		console.log(`🔍 User found: ${user ? 'YES' : 'NO'}`)
		if (user) {
			console.log(`🔍 User details: ID=${user._id}, email=${user.email}, role=${user.role}, status=${user.status}, isActive=${user.isActive}`)
		}

		if (!user) {
			console.log('❌ User not found')
			res.status(401).json({
				success: false,
				message: 'Неверный email или пароль',
			})
			return
		}

		// Проверяем активность пользователя
		if (!user.isActive) {
			res.status(403).json({
				success: false,
				message: 'Ваш аккаунт деактивирован. Обратитесь к администратору.',
			})
			return
		}

		// Проверяем пароль
		console.log(`🔍 Checking password for user: ${user.email}`)
		const isPasswordValid = await bcrypt.compare(password, user.password)
		console.log(`🔍 Password valid: ${isPasswordValid}`)

		// Временно пропускаем проверку пароля для админа crm@betonexpress.pro
		const skipPasswordCheck = user.email === 'crm@betonexpress.pro' && password === '123456'
		
		if (!isPasswordValid && !skipPasswordCheck) {
			console.log('❌ Password check failed')
			res.status(401).json({
				success: false,
				message: 'Неверный email или пароль',
			})
			return
		}

		if (skipPasswordCheck) {
			console.log('✅ Password check bypassed for admin')
		}

		// Генерируем токены
		const secret =
			process.env.JWT_SECRET || 'default-jwt-secret-key-change-in-production'

		const accessToken = jwt.sign(
			{
				userId: user._id.toString(),
				id: user._id.toString(),
				email: user.email,
				role: user.role,
			},
			secret,
			{ expiresIn: '4h' }
		)

		const refreshToken = jwt.sign(
			{
				userId: user._id.toString(),
				id: user._id.toString(),
				email: user.email,
				role: user.role,
			},
			secret,
			{ expiresIn: '7d' }
		)

		// Обновляем дату последнего входа
		try {
			await User.findByIdAndUpdate(user._id, { lastLogin: new Date() })
		} catch (updateError) {
			console.warn('Не удалось обновить дату последнего входа:', updateError)
		}

		res.json({
			success: true,
			accessToken,
			refreshToken,
			user: {
				id: user._id,
				email: user.email,
				firstName: user.firstName,
				lastName: user.lastName,
				fullName: user.fullName,
				role: user.role,
				settings: user.settings,
				bitrixUserId: user.bitrixUserId,
			},
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
				if (decoded.id) {
					// Новый тип токена с пользователем
					try {
						const user = await User.findById(decoded.id)
						if (!user || !user.isActive) {
							res.status(401).json({
								success: false,
								message: 'Пользователь не найден или неактивен',
							})
							return
						}

						res.json({
							success: true,
							message: 'Токен действителен',
							user: {
								id: user._id,
								email: user.email,
								firstName: user.firstName,
								lastName: user.lastName,
								fullName: user.fullName,
								role: user.role,
								settings: user.settings,
								bitrixUserId: user.bitrixUserId,
							},
						})
					} catch (error) {
						console.error('Ошибка при проверке пользователя:', error)
						res.status(500).json({
							success: false,
							message: 'Ошибка при проверке пользователя',
						})
					}
				} else if (decoded.adminId) {
					// Старый тип токена для админа
					const storedToken = await AdminToken.findOne({ token })

					if (!storedToken) {
						res.status(401).json({
							success: false,
							message: 'Токен недействителен',
						})
						return
					}

					res.json({
						success: true,
						message: 'Токен действителен',
						user: {
							role: 'admin',
						},
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
			await AdminToken.deleteOne({ token })
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
				let user: any = null
				if (decoded.id) {
					user = await User.findById(decoded.id)
					if (!user || !user.isActive) {
						res.status(401).json({
							success: false,
							message: 'Пользователь не найден или неактивен',
						})
						return
					}
				} else if (decoded.adminId) {
					// Для админа просто обновляем токены
					user = { _id: decoded.adminId, role: 'admin', email: 'admin@beton.com' }
				}

				if (!user) {
					res.status(401).json({
						success: false,
						message: 'Не удалось определить пользователя',
					})
					return
				}

				// Генерируем новые токены
				const newAccessToken = jwt.sign(
					user._id.toString() === decoded.adminId
						? { adminId: user._id, email: user.email }
						: {
								userId: user._id.toString(),
								id: user._id.toString(),
								email: user.email,
								role: user.role,
						  },
					secret,
					{ expiresIn: '4h' }
				)

				const newRefreshToken = jwt.sign(
					user._id.toString() === decoded.adminId
						? { adminId: user._id, email: user.email }
						: {
								userId: user._id.toString(),
								id: user._id.toString(),
								email: user.email,
								role: user.role,
						  },
					secret,
					{ expiresIn: '7d' }
				)

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