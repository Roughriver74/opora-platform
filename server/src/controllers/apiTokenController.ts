import { Request, Response, NextFunction } from 'express'
import { AppDataSource } from '../database/config/database.config'
import { AdminToken } from '../database/entities/AdminToken.entity'
import { logger } from '../utils/logger'

/**
 * @swagger
 * /api/tokens/generate:
 *   post:
 *     summary: Генерация API токена для внешних систем
 *     tags: [API Tokens]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - purpose
 *             properties:
 *               purpose:
 *                 type: string
 *                 description: Назначение токена
 *                 example: "Интеграция с внешней системой учета"
 *               expirationDays:
 *                 type: integer
 *                 description: Срок действия в днях (1-365)
 *                 default: 30
 *     responses:
 *       201:
 *         description: Токен успешно создан
 */
export const generateToken = async (
	req: Request,
	res: Response,
	next: NextFunction
): Promise<void> => {
	try {
		const { purpose, expirationDays = 30 } = req.body

		if (!purpose || purpose.trim().length === 0) {
			res.status(400).json({
				success: false,
				message: 'Укажите назначение токена (purpose)',
			})
			return
		}

		if (expirationDays < 1 || expirationDays > 365) {
			res.status(400).json({
				success: false,
				message: 'Срок действия должен быть от 1 до 365 дней',
			})
			return
		}

		const userId = req.user?.id

		if (!userId) {
			res.status(401).json({
				success: false,
				message: 'Не удалось определить пользователя',
			})
			return
		}

		// Создаем токен
		const tokenRepository = AppDataSource.getRepository(AdminToken)
		const adminToken = AdminToken.createToken(userId, purpose, expirationDays)

		// Сохраняем IP и User-Agent
		const ipAddress = req.ip || req.socket.remoteAddress
		const userAgent = req.headers['user-agent']

		if (ipAddress) adminToken.ipAddress = ipAddress
		if (userAgent) adminToken.userAgent = userAgent

		await tokenRepository.save(adminToken)

		logger.info(
			`✅ API токен создан: ${adminToken.id} для пользователя ${userId}`
		)

		res.status(201).json({
			success: true,
			message:
				'API токен успешно создан. Сохраните его - он больше не будет показан!',
			data: {
				token: adminToken.token,
				tokenId: adminToken.id,
				purpose: adminToken.purpose,
				expiresAt: adminToken.expiresAt,
				daysUntilExpiration: adminToken.getDaysUntilExpiration(),
			},
		})
	} catch (error) {
		logger.error('Ошибка при генерации API токена:', error)
		next(error)
	}
}

/**
 * @swagger
 * /api/tokens:
 *   get:
 *     summary: Получить список всех API токенов
 *     tags: [API Tokens]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Список токенов
 */
export const listTokens = async (
	req: Request,
	res: Response,
	next: NextFunction
): Promise<void> => {
	try {
		const userId = req.user?.id
		const tokenRepository = AppDataSource.getRepository(AdminToken)

		const queryBuilder = tokenRepository
			.createQueryBuilder('token')
			.leftJoinAndSelect('token.user', 'user')
			.where('token.isActive = true')
			.orderBy('token.createdAt', 'DESC')

		// Если не админ - показываем только свои токены
		if (!req.user?.isAdmin && userId) {
			queryBuilder.andWhere('token.userId = :userId', { userId })
		}

		const tokens = await queryBuilder.getMany()

		// Преобразуем в безопасный формат (без полного токена)
		const safeTokens = tokens.map(token => token.toPublicJSON())

		res.json({
			success: true,
			data: safeTokens,
		})
	} catch (error) {
		logger.error('Ошибка при получении списка токенов:', error)
		next(error)
	}
}

/**
 * @swagger
 * /api/tokens/{tokenId}:
 *   delete:
 *     summary: Отозвать API токен
 *     tags: [API Tokens]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: tokenId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Токен отозван
 */
export const revokeToken = async (
	req: Request,
	res: Response,
	next: NextFunction
): Promise<void> => {
	try {
		const { tokenId } = req.params
		const userId = req.user?.id

		const tokenRepository = AppDataSource.getRepository(AdminToken)
		const token = await tokenRepository.findOne({
			where: { id: tokenId },
		})

		if (!token) {
			res.status(404).json({
				success: false,
				message: 'Токен не найден',
			})
			return
		}

		// Проверка прав (не админ может удалять только свои)
		if (!req.user?.isAdmin && token.userId !== userId) {
			res.status(403).json({
				success: false,
				message: 'Нет прав для отзыва этого токена',
			})
			return
		}

		token.revoke()
		await tokenRepository.save(token)

		logger.info(`✅ API токен отозван: ${tokenId}`)

		res.json({
			success: true,
			message: 'Токен успешно отозван',
		})
	} catch (error) {
		logger.error('Ошибка при отзыве токена:', error)
		next(error)
	}
}
