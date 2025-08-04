import { createClient } from 'redis'
import config from './config'

export class RedisClient {
	private static instance: RedisClient
	private client: any

	private constructor() {
		this.client = createClient({
			url: config.redisUrl || 'redis://localhost:6379',
			socket: {
				connectTimeout: 5000,
			},
		})

		this.client.on('error', (err: Error) => {
			console.warn('⚠️ Redis error (working without cache):', err.message)
		})

		this.client.on('connect', () => {
			console.log('✅ Redis connected successfully')
		})

		this.client.on('ready', () => {
			console.log('🚀 Redis ready for operations')
		})

		this.client.on('end', () => {
			console.log('⚠️ Redis connection ended')
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
				await this.client.connect()
			}
		} catch (error) {
			console.warn('⚠️ Failed to connect to Redis - working without cache:', error)
		}
	}

	public async disconnect(): Promise<void> {
		try {
			if (this.client.isOpen) {
				await this.client.disconnect()
			}
		} catch (error) {
			console.warn('⚠️ Error disconnecting from Redis:', error)
		}
	}

	public async get(key: string): Promise<string | null> {
		try {
			if (!this.client.isOpen) {
				return null
			}
			return await this.client.get(key)
		} catch (error) {
			console.warn(`⚠️ Redis GET error for key ${key}:`, error)
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
		} catch (error) {
			console.warn(`⚠️ Redis SET error for key ${key}:`, error)
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
		} catch (error) {
			console.warn(`⚠️ Redis DEL error for key ${key}:`, error)
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
		} catch (error) {
			console.warn(`⚠️ Redis EXISTS error for key ${key}:`, error)
			return false
		}
	}

	public async keys(pattern: string): Promise<string[]> {
		try {
			if (!this.client.isOpen) {
				return []
			}
			return await this.client.keys(pattern)
		} catch (error) {
			console.warn(`⚠️ Redis KEYS error for pattern ${pattern}:`, error)
			return []
		}
	}

	public async flushPattern(pattern: string): Promise<void> {
		try {
			const keys = await this.keys(pattern)
			if (keys.length > 0) {
				await this.client.del(keys)
			}
		} catch (error) {
			console.warn(`⚠️ Redis FLUSH error for pattern ${pattern}:`, error)
		}
	}

	public isConnected(): boolean {
		return this.client?.isOpen || false
	}
}

export default RedisClient.getInstance()