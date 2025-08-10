import jwt from 'jsonwebtoken'
import { AppDataSource } from '../database/config/database.config'
import { AdminToken } from '../database/entities/AdminToken.entity'

// Время жизни токенов
const ACCESS_TOKEN_EXPIRY = '4h' // Увеличено время для access токена до 4 часов
const REFRESH_TOKEN_EXPIRY = '7d' // Длинное время для refresh токена

export interface TokenPayload {
	id?: string
	role: 'admin' | 'user'
	type: 'access' | 'refresh'
}

export interface TokenPair {
	accessToken: string
	refreshToken: string
	expiresIn: string
}

/**
 * JWT сервис для создания и верификации токенов
 */
export class JWTService {
	private readonly secret: string

	constructor() {
		this.secret =
			process.env.JWT_SECRET || 'default-jwt-secret-key-change-in-production'
	}

	/**
	 * Создание пары access и refresh токенов
	 */
	async generateTokenPair(
		payload: Omit<TokenPayload, 'type'>
	): Promise<TokenPair> {
		// Создаем access токен
		const accessToken = jwt.sign({ ...payload, type: 'access' }, this.secret, {
			expiresIn: ACCESS_TOKEN_EXPIRY,
		})

		// Создаем refresh токен
		const refreshToken = jwt.sign(
			{ ...payload, type: 'refresh' },
			this.secret,
			{ expiresIn: REFRESH_TOKEN_EXPIRY }
		)

		// Сохраняем refresh токен в базе данных
		const tokenRepository = AppDataSource.getRepository(AdminToken)
		const adminToken = new AdminToken()
		adminToken.token = refreshToken
		adminToken.purpose = 'refresh'
		adminToken.userId = payload.id || '' // Нужен userId
		await tokenRepository.save(adminToken)

		return {
			accessToken,
			refreshToken,
			expiresIn: ACCESS_TOKEN_EXPIRY,
		}
	}

	/**
	 * Верификация токена
	 */
	async verifyToken(token: string): Promise<TokenPayload | null> {
		try {
			const decoded = jwt.verify(token, this.secret) as TokenPayload

			// Для refresh токенов проверяем наличие в базе данных
			if (decoded.type === 'refresh') {
				const tokenRepository = AppDataSource.getRepository(AdminToken)
				const tokenDoc = await tokenRepository.findOne({ 
					where: { token, isActive: true } 
				})
				if (!tokenDoc || tokenDoc.isExpired()) {
					return null
				}
			}

			return decoded
		} catch (error) {
			return null
		}
	}

	/**
	 * Обновление access токена с помощью refresh токена
	 */
	async refreshAccessToken(refreshToken: string): Promise<string | null> {
		try {
			const decoded = await this.verifyToken(refreshToken)

			if (!decoded || decoded.type !== 'refresh') {
				return null
			}

			// Создаем новый access токен
			const newAccessToken = jwt.sign(
				{
					id: decoded.id,
					role: decoded.role,
					type: 'access',
				},
				this.secret,
				{ expiresIn: ACCESS_TOKEN_EXPIRY }
			)

			return newAccessToken
		} catch (error) {
			return null
		}
	}

	/**
	 * Отзыв токена (logout)
	 */
	async revokeToken(token: string): Promise<boolean> {
		try {
			const tokenRepository = AppDataSource.getRepository(AdminToken)
			await tokenRepository.delete({ token })
			return true
		} catch (error) {
			console.error('Ошибка при отзыве токена:', error)
			return false
		}
	}

	/**
	 * Отзыв всех токенов пользователя
	 */
	async revokeAllUserTokens(userId?: string): Promise<boolean> {
		try {
			const tokenRepository = AppDataSource.getRepository(AdminToken)
			if (userId) {
				await tokenRepository.delete({ userId })
			} else {
				// Удаляем все токены
				await tokenRepository.delete({})
			}
			return true
		} catch (error) {
			console.error('Ошибка при отзыве всех токенов:', error)
			return false
		}
	}
}

// Экспортируем экземпляр сервиса
export const jwtService = new JWTService()
