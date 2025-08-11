import { Request, Response } from 'express'
import { getUserService } from '../services/UserService'
import { PasswordHashService } from '../utils/passwordHash'
import bitrix24Service from '../services/bitrix24Service'
import { UserRole, UserStatus } from '../database/entities/User.entity'

const userService = getUserService()

/**
 * Получение всех пользователей с пагинацией и фильтрацией
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

		const filters: any = {}
		
		if (search && typeof search === 'string') {
			filters.search = search
		}

		if (role && typeof role === 'string' && Object.values(UserRole).includes(role as UserRole)) {
			filters.role = role as UserRole
		}

		if (status && typeof status === 'string' && Object.values(UserStatus).includes(status as UserStatus)) {
			filters.status = status as UserStatus
		}

		const result = await userService.findWithPaginationAndFilters(
			Number(page),
			Number(limit),
			filters
		)

		// Преобразуем данные для фронтенда
		const transformedData = result.data.map(user => {
			const userJson = user.toJSON ? user.toJSON() : user
			return userJson
		})

		res.json({
			success: true,
			data: transformedData,
			pagination: {
				page: result.page,
				limit: result.limit,
				total: result.total,
				pages: result.pages,
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

		const user = await userService.findById(id)

		if (!user) {
			res.status(404).json({
				success: false,
				message: 'Пользователь не найден',
			})
			return
		}

		// Возвращаем пользователя без пароля и с правильным форматом
		const userJson = user.toJSON ? user.toJSON() : user
		res.json({
			success: true,
			data: userJson,
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
		const { email, password, role, firstName, lastName, phone, bitrixUserId } =
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
		const existingUser = await userService.findByEmail(email)
		if (existingUser) {
			res.status(400).json({
				success: false,
				message: 'Пользователь с таким email уже существует',
			})
			return
		}

		// Проверяем, существует ли пользователь с таким bitrixUserId (если указан)
		if (bitrixUserId) {
			const existingBitrixUser = await userService.findByBitrixUserId(bitrixUserId)
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
		const userData = {
			email: email.toLowerCase(),
			password, // будет захеширован в entity
			role: role || UserRole.USER,
			firstName,
			lastName,
			phone,
			bitrixUserId,
		}

		const user = await userService.createUser(userData)

		// Возвращаем пользователя без пароля
		const { password: _, ...userResponse } = user as any

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
			bitrixUserId,
			status,
		} = req.body

		const user = await userService.findById(id)
		if (!user) {
			res.status(404).json({
				success: false,
				message: 'Пользователь не найден',
			})
			return
		}

		// Проверяем email на уникальность (если изменился)
		if (email && email.toLowerCase() !== user.email) {
			const existingUser = await userService.findByEmail(email)
			if (existingUser) {
				res.status(400).json({
					success: false,
					message: 'Пользователь с таким email уже существует',
				})
				return
			}
		}

		// Проверяем bitrixUserId на уникальность (если изменился)
		if (bitrixUserId && bitrixUserId !== user.bitrixUserId) {
			const existingBitrixUser = await userService.findByBitrixUserId(bitrixUserId)
			if (existingBitrixUser) {
				res.status(400).json({
					success: false,
					message: 'Пользователь с таким Bitrix ID уже существует',
				})
				return
			}
		}

		// Подготавливаем данные для обновления
		const updateData: any = {}

		if (email) updateData.email = email.toLowerCase()
		if (role) updateData.role = role
		if (firstName !== undefined) updateData.firstName = firstName
		if (lastName !== undefined) updateData.lastName = lastName
		if (phone !== undefined) updateData.phone = phone
		if (status) {
			updateData.status = status
			// Синхронизируем isActive со status
			updateData.isActive = status === 'active'
		}
		if (bitrixUserId !== undefined) updateData.bitrixUserId = bitrixUserId

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
			updateData.password = password // будет захеширован в entity
		}

		const updatedUser = await userService.updateUser(id, updateData)

		// Возвращаем обновленного пользователя с правильным форматом
		const userJson = updatedUser?.toJSON ? updatedUser.toJSON() : updatedUser

		res.json({
			success: true,
			data: userJson,
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

		const user = await userService.findById(id)
		if (!user) {
			res.status(404).json({
				success: false,
				message: 'Пользователь не найден',
			})
			return
		}

		// Проверяем, что не удаляем последнего админа
		if (user.role === UserRole.ADMIN) {
			const adminUsers = await userService.findAdmins()
			if (adminUsers.length <= 1) {
				res.status(400).json({
					success: false,
					message: 'Нельзя удалить последнего администратора',
				})
				return
			}
		}

		const deleted = await userService.delete(id)

		if (!deleted) {
			res.status(500).json({
				success: false,
				message: 'Не удалось удалить пользователя',
			})
			return
		}

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

		if (!Object.values(UserStatus).includes(status)) {
			res.status(400).json({
				success: false,
				message: `Неверный статус. Доступны: ${Object.values(UserStatus).join(', ')}`,
			})
			return
		}

		const user = await userService.findById(id)
		if (!user) {
			res.status(404).json({
				success: false,
				message: 'Пользователь не найден',
			})
			return
		}

		const updatedUser = await userService.updateUser(id, { status })

		// Возвращаем обновленного пользователя без пароля
		const { password: _, ...userResponse } = updatedUser as any

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

		const user = await userService.findById(userId)
		if (!user) {
			res.status(404).json({
				success: false,
				message: 'Пользователь не найден',
			})
			return
		}

		const updatedUser = await userService.updateSettings(userId, settings)

		res.json({
			success: true,
			data: updatedUser?.settings,
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

/**
 * Синхронизация пользователей с Битрикс24
 */
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
				let user = await userService.findByEmail(email) || 
				         await userService.findByBitrixUserId(bitrixUser.ID || bitrixUser.id)

				if (user) {
					// Обновляем существующего пользователя
					if (forceSync || !user.bitrixUserId) {
						await userService.updateUser(user.id, {
							firstName: bitrixUser.NAME || bitrixUser.firstName || user.firstName,
							lastName: bitrixUser.LAST_NAME || bitrixUser.lastName || user.lastName,
							phone: bitrixUser.WORK_PHONE || bitrixUser.phone || user.phone,
							isActive: true, // Делаем пользователя активным
						})

						// Отдельно обновляем bitrixUserId
						await userService.userRepository.update(user.id, {
							bitrixUserId: bitrixUser.ID || bitrixUser.id
						})
						updated++
					}
				} else {
					// Создаем нового пользователя с битрикс ID
					await userService.createUser({
						email: email.toLowerCase(),
						password: PasswordHashService.generateRandomPassword(),
						role: UserRole.USER,
						firstName: bitrixUser.NAME || bitrixUser.firstName,
						lastName: bitrixUser.LAST_NAME || bitrixUser.lastName,
						phone: bitrixUser.WORK_PHONE || bitrixUser.phone,
						bitrixUserId: bitrixUser.ID || bitrixUser.id
					})
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