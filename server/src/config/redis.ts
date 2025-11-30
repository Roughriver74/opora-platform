import { createClient } from 'redis'
import config from './config'
import { logger } from '../utils/logger'

export class RedisClient {
	private static instance: RedisClient
	private client: any
	private connectionAttempts = 0
	private readonly maxConnectionAttempts = 5

	private constructor() {
		const redisUrl = config.redisUrl || `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`
		
		this.client = createClient({
			url: redisUrl,
			socket: {
				connectTimeout: 10000, // Увеличиваем таймаут до 10 секунд
				reconnectStrategy: (retries: number) => {
					if (retries > this.maxConnectionAttempts) {
						logger.warn(`⚠️ Превышено максимальное количество попыток подключения к Redis (${this.maxConnectionAttempts})`)
						return false // Остановить попытки переподключения
					}
					const delay = Math.min(retries * 1000, 5000)
					logger.info(`🔄 Попытка переподключения к Redis через ${delay}ms (попытка ${retries}/${this.maxConnectionAttempts})`)
					return delay
				},
			},
		})

		this.client.on('error', (err: Error) => {
			const errorMessage = err.message || String(err)
			// Фильтруем частые ошибки подключения
			if (errorMessage.includes('Name or service not known') || 
			    errorMessage.includes('ENOTFOUND') ||
			    errorMessage.includes('ECONNREFUSED') ||
			    errorMessage.includes('getaddrinfo')) {
				this.connectionAttempts++
				if (this.connectionAttempts <= 3) {
					logger.warn(`⚠️ Redis недоступен (работа без кеша): ${errorMessage}`)
				}
			} else {
				logger.error('❌ Redis error:', err)
			}
		})

		this.client.on('connect', () => {
			logger.info('🔄 Подключение к Redis...')
		})

		this.client.on('ready', () => {
			this.connectionAttempts = 0
			logger.info('✅ Redis подключен и готов к работе')
		})

		this.client.on('end', () => {
			logger.warn('⚠️ Соединение с Redis закрыто')
		})

		this.client.on('reconnecting', () => {
			logger.info('🔄 Переподключение к Redis...')
		})
	}

	public static getInstance(): RedisClient {
		if (!RedisClient.instance) {
			RedisClient.instance = new RedisClient()
		}
		return RedisClient.instance
	}

	public async connect(): Promise<void> {
		try {
			if (!this.client.isOpen) {
				const redisUrl = config.redisUrl || `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`
				logger.info(`🔌 Попытка подключения к Redis: ${redisUrl.replace(/\/\/.*@/, '//***@')}`)
				await this.client.connect()
				logger.info('✅ Успешное подключение к Redis')
			}
		} catch (error: any) {
			const errorMessage = error?.message || String(error)
			if (errorMessage.includes('Name or service not known') || 
			    errorMessage.includes('ENOTFOUND') ||
			    errorMessage.includes('ECONNREFUSED')) {
				logger.warn(`⚠️ Не удалось подключиться к Redis (работа без кеша): ${errorMessage}`)
			} else {
				logger.error('❌ Ошибка подключения к Redis:', error)
			}
		}
	}

	public async disconnect(): Promise<void> {
		try {
			if (this.client.isOpen) {
				await this.client.disconnect()
			}
		} catch (error: any) {
			logger.warn('⚠️ Error disconnecting from Redis:', error?.message || String(error))
		}
	}

	public async get(key: string): Promise<string | null> {
		try {
			if (!this.client.isOpen) {
				return null
			}
			return await this.client.get(key)
		} catch (error: any) {
			const errorMessage = error?.message || String(error)
			// Логируем только нестандартные ошибки
			if (!errorMessage.includes('Name or service not known') && 
			    !errorMessage.includes('ENOTFOUND') &&
			    !errorMessage.includes('ECONNREFUSED')) {
				logger.warn(`⚠️ Redis GET error for key ${key}:`, errorMessage)
			}
			return null
		}
	}

	public async set(
		key: string,
		value: string,
		ttlSeconds?: number
	): Promise<boolean> {
		try {
			if (!this.client.isOpen) {
				return false
			}
			
			if (ttlSeconds) {
				await this.client.setEx(key, ttlSeconds, value)
			} else {
				await this.client.set(key, value)
			}
			return true
		} catch (error: any) {
			const errorMessage = error?.message || String(error)
			// Логируем только нестандартные ошибки
			if (!errorMessage.includes('Name or service not known') && 
			    !errorMessage.includes('ENOTFOUND') &&
			    !errorMessage.includes('ECONNREFUSED')) {
				logger.warn(`⚠️ Redis SET error for key ${key}:`, errorMessage)
			}
			return false
		}
	}

	public async del(key: string): Promise<boolean> {
		try {
			if (!this.client.isOpen) {
				return false
			}
			await this.client.del(key)
			return true
		} catch (error: any) {
			const errorMessage = error?.message || String(error)
			// Логируем только нестандартные ошибки
			if (!errorMessage.includes('Name or service not known') && 
			    !errorMessage.includes('ENOTFOUND') &&
			    !errorMessage.includes('ECONNREFUSED')) {
				logger.warn(`⚠️ Redis DEL error for key ${key}:`, errorMessage)
			}
			return false
		}
	}

	public async exists(key: string): Promise<boolean> {
		try {
			if (!this.client.isOpen) {
				return false
			}
			const result = await this.client.exists(key)
			return result === 1
		} catch (error: any) {
			const errorMessage = error?.message || String(error)
			// Логируем только нестандартные ошибки
			if (!errorMessage.includes('Name or service not known') && 
			    !errorMessage.includes('ENOTFOUND') &&
			    !errorMessage.includes('ECONNREFUSED')) {
				logger.warn(`⚠️ Redis EXISTS error for key ${key}:`, errorMessage)
			}
			return false
		}
	}

	public async keys(pattern: string): Promise<string[]> {
		try {
			if (!this.client.isOpen) {
				return []
			}
			return await this.client.keys(pattern)
		} catch (error: any) {
			const errorMessage = error?.message || String(error)
			// Логируем только нестандартные ошибки
			if (!errorMessage.includes('Name or service not known') && 
			    !errorMessage.includes('ENOTFOUND') &&
			    !errorMessage.includes('ECONNREFUSED')) {
				logger.warn(`⚠️ Redis KEYS error for pattern ${pattern}:`, errorMessage)
			}
			return []
		}
	}

	public async flushPattern(pattern: string): Promise<void> {
		try {
			const keys = await this.keys(pattern)
			if (keys.length > 0) {
				await this.client.del(keys)
			}
		} catch (error: any) {
			const errorMessage = error?.message || String(error)
			// Логируем только нестандартные ошибки
			if (!errorMessage.includes('Name or service not known') && 
			    !errorMessage.includes('ENOTFOUND') &&
			    !errorMessage.includes('ECONNREFUSED')) {
				logger.warn(`⚠️ Redis FLUSH error for pattern ${pattern}:`, errorMessage)
			}
		}
	}

	public isConnected(): boolean {
		return this.client?.isOpen || false
	}
}

export default RedisClient.getInstance()