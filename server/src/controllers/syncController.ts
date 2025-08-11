import { Request, Response } from 'express'
import bitrix24Service from '../services/bitrix24Service'
import { getUserService } from '../services/UserService'

const userService = getUserService()

// Синхронизация пользователей из Bitrix24
export const syncUsers = async (req: Request, res: Response): Promise<void> => {
	try {
		console.log('Начинаем синхронизацию пользователей из Bitrix24...')
		
		// Получаем всех активных пользователей из Bitrix24
		const bitrixUsers = await bitrix24Service.getAllActiveUsers()
		
		if (!bitrixUsers.result || bitrixUsers.result.length === 0) {
			res.status(200).json({
				success: true,
				message: 'Пользователи в Bitrix24 не найдены',
				data: { synced: 0, total: 0 }
			})
			return
		}

		let syncedCount = 0
		let skippedCount = 0
		const errors: string[] = []

		// Синхронизируем каждого пользователя
		for (const bitrixUser of bitrixUsers.result) {
			try {
				// Проверяем обязательные поля
				if (!bitrixUser.EMAIL || !bitrixUser.ID) {
					skippedCount++
					continue
				}

				// Проверяем, существует ли пользователь с таким email
				const existingUser = await userService.findByEmail(bitrixUser.EMAIL)
				
				if (!existingUser) {
					// Создаем нового пользователя
					const userData = {
						email: bitrixUser.EMAIL,
						password: `bitrix_${bitrixUser.ID}`, // Временный пароль
						firstName: bitrixUser.NAME || '',
						lastName: bitrixUser.LAST_NAME || '',
						role: 'user' as const,
						bitrixUserId: bitrixUser.ID,
						isActive: bitrixUser.ACTIVE === 'Y'
					}

					await userService.create(userData)
					syncedCount++
					console.log(`Создан пользователь: ${bitrixUser.EMAIL}`)
				} else {
					// Обновляем данные существующего пользователя
					const updateData = {
						firstName: bitrixUser.NAME || existingUser.firstName,
						lastName: bitrixUser.LAST_NAME || existingUser.lastName,
						bitrixUserId: bitrixUser.ID,
						isActive: bitrixUser.ACTIVE === 'Y'
					}

					await userService.update(existingUser.id, updateData)
					syncedCount++
					console.log(`Обновлен пользователь: ${bitrixUser.EMAIL}`)
				}
			} catch (error: any) {
				console.error(`Ошибка синхронизации пользователя ${bitrixUser.EMAIL}:`, error)
				errors.push(`${bitrixUser.EMAIL}: ${error.message}`)
			}
		}

		res.status(200).json({
			success: true,
			message: `Синхронизация завершена: ${syncedCount} пользователей синхронизировано, ${skippedCount} пропущено`,
			data: {
				synced: syncedCount,
				skipped: skippedCount,
				total: bitrixUsers.result.length,
				errors: errors.length > 0 ? errors : undefined
			}
		})

	} catch (error: any) {
		console.error('Ошибка синхронизации пользователей:', error)
		res.status(500).json({
			success: false,
			message: error.message || 'Ошибка синхронизации пользователей'
		})
	}
}

// Получить статистику пользователей
export const getUsersStats = async (req: Request, res: Response): Promise<void> => {
	try {
		// Локальные пользователи
		const localUsers = await userService.findAll()
		
		// Пользователи из Bitrix24
		const bitrixUsers = await bitrix24Service.getAllActiveUsers()
		
		res.status(200).json({
			success: true,
			data: {
				local: {
					total: localUsers.length,
					active: localUsers.filter(u => u.isActive).length,
					withBitrixId: localUsers.filter(u => u.bitrixUserId).length
				},
				bitrix24: {
					total: bitrixUsers.total,
					active: bitrixUsers.result?.filter((u: any) => u.ACTIVE === 'Y').length || 0
				}
			}
		})
	} catch (error: any) {
		console.error('Ошибка получения статистики пользователей:', error)
		res.status(500).json({
			success: false,
			message: error.message || 'Ошибка получения статистики'
		})
	}
}