import { Request, Response } from 'express'
import User from '../models/User'
import { PasswordHashService } from '../utils/passwordHash'
import bitrix24Service from '../services/bitrix24Service'

/**
 * Получение всех пользователей
 */
export const getAllUsers = async (
	req: Request,
	res: Response
): Promise<void> => {
	try {
		const {
			page = 1,
			limit = 10,
			search = '',
			role = '',
			status = '',
		} = req.query

		// Строим фильтр
		const filter: any = {}

		if (search) {
			filter.$or = [
				{ email: { $regex: search, $options: 'i' } },
				{ firstName: { $regex: search, $options: 'i' } },
				{ lastName: { $regex: search, $options: 'i' } },
			]
		}

		if (role) {
			filter.role = role
		}

		if (status) {
			filter.status = status
		}

		const skip = (Number(page) - 1) * Number(limit)

		const users = await User.find(filter)
			.select('-password')
			.sort({ createdAt: -1 })
			.skip(skip)
			.limit(Number(limit))

		const total = await User.countDocuments(filter)

		res.json({
			success: true,
			data: users,
			pagination: {
				page: Number(page),
				limit: Number(limit),
				total,
				pages: Math.ceil(total / Number(limit)),
			},
		})
	} catch (error) {
		console.error('Ошибка получения пользователей:', error)
		res.status(500).json({
			success: false,
			message: 'Ошибка получения пользователей',
		})
	}
}

/**
 * Получение пользователя по ID
 */
export const getUserById = async (
	req: Request,
	res: Response
): Promise<void> => {
	try {
		const { id } = req.params

		const user = await User.findById(id).select('-password')

		if (!user) {
			res.status(404).json({
				success: false,
				message: 'Пользователь не найден',
			})
			return
		}

		res.json({
			success: true,
			data: user,
		})
	} catch (error) {
		console.error('Ошибка получения пользователя:', error)
		res.status(500).json({
			success: false,
			message: 'Ошибка получения пользователя',
		})
	}
}

/**
 * Создание нового пользователя
 */
export const createUser = async (
	req: Request,
	res: Response
): Promise<void> => {
	try {
		const { email, password, role, firstName, lastName, phone, bitrix_id } =
			req.body

		// Валидация обязательных полей
		if (!email || !password) {
			res.status(400).json({
				success: false,
				message: 'Email и пароль обязательны',
			})
			return
		}

		// Проверяем, существует ли пользователь с таким email
		const existingUser = await User.findOne({ email: email.toLowerCase() })
		if (existingUser) {
			res.status(400).json({
				success: false,
				message: 'Пользователь с таким email уже существует',
			})
			return
		}

		// Проверяем, существует ли пользователь с таким bitrix_id (если указан)
		if (bitrix_id) {
			const existingBitrixUser = await User.findOne({ bitrix_id })
			if (existingBitrixUser) {
				res.status(400).json({
					success: false,
					message: 'Пользователь с таким Bitrix ID уже существует',
				})
				return
			}
		}

		// Валидация пароля
		const passwordValidation = PasswordHashService.validatePassword(password)
		if (!passwordValidation.isValid) {
			res.status(400).json({
				success: false,
				message: passwordValidation.message,
			})
			return
		}

		// Создаем пользователя
		const user = new User({
			email: email.toLowerCase(),
			password, // будет хеширован в pre-save хуке
			role: role || 'user',
			firstName,
			lastName,
			phone,
			bitrix_id,
			status: 'active',
		})

		await user.save()

		// Возвращаем пользователя без пароля
		const userResponse = await User.findById(user._id).select('-password')

		res.status(201).json({
			success: true,
			data: userResponse,
			message: 'Пользователь успешно создан',
		})
	} catch (error) {
		console.error('Ошибка создания пользователя:', error)
		res.status(500).json({
			success: false,
			message: 'Ошибка создания пользователя',
		})
	}
}

/**
 * Обновление пользователя
 */
export const updateUser = async (
	req: Request,
	res: Response
): Promise<void> => {
	try {
		const { id } = req.params
		const {
			email,
			password,
			role,
			firstName,
			lastName,
			phone,
			bitrix_id,
			status,
		} = req.body

		const user = await User.findById(id)
		if (!user) {
			res.status(404).json({
				success: false,
				message: 'Пользователь не найден',
			})
			return
		}

		// Проверяем email на уникальность (если изменился)
		if (email && email.toLowerCase() !== user.email) {
			const existingUser = await User.findOne({ email: email.toLowerCase() })
			if (existingUser) {
				res.status(400).json({
					success: false,
					message: 'Пользователь с таким email уже существует',
				})
				return
			}
			user.email = email.toLowerCase()
		}

		// Проверяем bitrix_id на уникальность (если изменился)
		if (bitrix_id && bitrix_id !== user.bitrix_id) {
			const existingBitrixUser = await User.findOne({ bitrix_id })
			if (existingBitrixUser) {
				res.status(400).json({
					success: false,
					message: 'Пользователь с таким Bitrix ID уже существует',
				})
				return
			}
			user.bitrix_id = bitrix_id
		}

		// Обновляем остальные поля
		if (role) user.role = role
		if (firstName !== undefined) user.firstName = firstName
		if (lastName !== undefined) user.lastName = lastName
		if (phone !== undefined) user.phone = phone
		if (status) user.status = status

		// Обновляем пароль, если указан
		if (password) {
			const passwordValidation = PasswordHashService.validatePassword(password)
			if (!passwordValidation.isValid) {
				res.status(400).json({
					success: false,
					message: passwordValidation.message,
				})
				return
			}
			user.password = password // будет хеширован в pre-save хуке
		}

		await user.save()

		// Возвращаем обновленного пользователя без пароля
		const userResponse = await User.findById(user._id).select('-password')

		res.json({
			success: true,
			data: userResponse,
			message: 'Пользователь успешно обновлен',
		})
	} catch (error) {
		console.error('Ошибка обновления пользователя:', error)
		res.status(500).json({
			success: false,
			message: 'Ошибка обновления пользователя',
		})
	}
}

/**
 * Удаление пользователя
 */
export const deleteUser = async (
	req: Request,
	res: Response
): Promise<void> => {
	try {
		const { id } = req.params

		const user = await User.findById(id)
		if (!user) {
			res.status(404).json({
				success: false,
				message: 'Пользователь не найден',
			})
			return
		}

		// Проверяем, что не удаляем последнего админа
		if (user.role === 'admin') {
			const adminCount = await User.countDocuments({ role: 'admin' })
			if (adminCount <= 1) {
				res.status(400).json({
					success: false,
					message: 'Нельзя удалить последнего администратора',
				})
				return
			}
		}

		await User.findByIdAndDelete(id)

		res.json({
			success: true,
			message: 'Пользователь успешно удален',
		})
	} catch (error) {
		console.error('Ошибка удаления пользователя:', error)
		res.status(500).json({
			success: false,
			message: 'Ошибка удаления пользователя',
		})
	}
}

/**
 * Изменение статуса пользователя
 */
export const updateUserStatus = async (
	req: Request,
	res: Response
): Promise<void> => {
	try {
		const { id } = req.params
		const { status } = req.body

		if (!['active', 'inactive'].includes(status)) {
			res.status(400).json({
				success: false,
				message: 'Неверный статус. Доступны: active, inactive',
			})
			return
		}

		const user = await User.findById(id)
		if (!user) {
			res.status(404).json({
				success: false,
				message: 'Пользователь не найден',
			})
			return
		}

		user.status = status
		await user.save()

		// Возвращаем обновленного пользователя без пароля
		const userResponse = await User.findById(user._id).select('-password')

		res.json({
			success: true,
			data: userResponse,
			message: `Статус пользователя изменен на ${status}`,
		})
	} catch (error) {
		console.error('Ошибка изменения статуса пользователя:', error)
		res.status(500).json({
			success: false,
			message: 'Ошибка изменения статуса пользователя',
		})
	}
}

/**
 * Синхронизация пользователей с Битрикс24
 */
/**
 * Обновление настроек пользователя
 */
export const updateUserSettings = async (
	req: Request,
	res: Response
): Promise<void> => {
	try {
		const { userId } = req.params
		const { settings } = req.body

		// Проверяем, что пользователь может изменять только свои настройки или он админ
		const currentUser = req.user
		if (!currentUser || (currentUser.id !== userId && !currentUser.isAdmin)) {
			res.status(403).json({
				success: false,
				message: 'Недостаточно прав для изменения настроек',
			})
			return
		}

		const user = await User.findById(userId)
		if (!user) {
			res.status(404).json({
				success: false,
				message: 'Пользователь не найден',
			})
			return
		}

		// Обновляем настройки пользователя
		user.settings = {
			...user.settings,
			...settings,
		}

		await user.save()

		res.json({
			success: true,
			data: user.settings,
			message: 'Настройки пользователя обновлены',
		})
	} catch (error) {
		console.error('Ошибка обновления настроек пользователя:', error)
		res.status(500).json({
			success: false,
			message: 'Ошибка обновления настроек пользователя',
		})
	}
}

export const syncWithBitrix = async (
	req: Request,
	res: Response
): Promise<void> => {
	try {
		const { forceSync = false } = req.body

		// Получаем всех пользователей из Битрикс24
		const bitrixResponse = await bitrix24Service.getUsers()
		const bitrixUsers = bitrixResponse?.result || []

		if (!bitrixUsers || bitrixUsers.length === 0) {
			res.status(400).json({
				success: false,
				message: 'Не удалось получить пользователей из Битрикс24',
			})
			return
		}

		let created = 0
		let updated = 0
		let errors = 0

		for (const bitrixUser of bitrixUsers) {
			try {
				const email = bitrixUser.EMAIL || bitrixUser.email
				if (!email) continue

				// Ищем пользователя по email или bitrix_id
				let user = await User.findOne({
					$or: [
						{ email: email.toLowerCase() },
						{ bitrix_id: bitrixUser.ID || bitrixUser.id },
					],
				})

				if (user) {
					// Обновляем существующего пользователя
					if (forceSync || !user.bitrix_id) {
						user.bitrix_id = bitrixUser.ID || bitrixUser.id
						user.firstName =
							bitrixUser.NAME || bitrixUser.firstName || user.firstName
						user.lastName =
							bitrixUser.LAST_NAME || bitrixUser.lastName || user.lastName
						user.phone = bitrixUser.WORK_PHONE || bitrixUser.phone || user.phone
						await user.save()
						updated++
					}
				} else {
					// Создаем нового пользователя
					const newUser = new User({
						email: email.toLowerCase(),
						password: PasswordHashService.generateRandomPassword(),
						role: 'user',
						firstName: bitrixUser.NAME || bitrixUser.firstName,
						lastName: bitrixUser.LAST_NAME || bitrixUser.lastName,
						phone: bitrixUser.WORK_PHONE || bitrixUser.phone,
						bitrix_id: bitrixUser.ID || bitrixUser.id,
						status: 'active',
					})
					await newUser.save()
					created++
				}
			} catch (error) {
				console.error('Ошибка синхронизации пользователя:', error)
				errors++
			}
		}

		res.json({
			success: true,
			message: 'Синхронизация завершена',
			stats: {
				created,
				updated,
				errors,
				total: bitrixUsers.length,
			},
		})
	} catch (error) {
		console.error('Ошибка синхронизации с Битрикс24:', error)
		res.status(500).json({
			success: false,
			message: 'Ошибка синхронизации с Битрикс24',
		})
	}
}
