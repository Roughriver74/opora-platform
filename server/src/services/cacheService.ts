// Временный in-memory кэш вместо Redis
const memoryCache = new Map<string, { data: any; expires: number }>()

export interface CacheOptions {
	ttl?: number // Time to live in seconds
	prefix?: string
}

export class CacheService {
	private defaultTTL = 3600 // 1 hour
	private defaultPrefix = 'opora'

	/**
	 * Get cached data by key
	 */
	async get<T>(key: string, options?: CacheOptions): Promise<T | null> {
		try {
			const fullKey = this.buildKey(key, options?.prefix)
			const cached = memoryCache.get(fullKey)
			
			if (cached && cached.expires > Date.now()) {
				return cached.data
			}
			
			// Удаляем устаревший кэш
			if (cached && cached.expires <= Date.now()) {
				memoryCache.delete(fullKey)
			}
			
			return null
		} catch (error) {
			console.warn('⚠️ Cache GET error:', error)
			return null
		}
	}

	/**
	 * Set data in cache
	 */
	async set<T>(
		key: string,
		data: T,
		options?: CacheOptions
	): Promise<boolean> {
		try {
			const fullKey = this.buildKey(key, options?.prefix)
			const ttl = options?.ttl || this.defaultTTL
			const expires = Date.now() + (ttl * 1000)
			
			memoryCache.set(fullKey, { data, expires })
			return true
		} catch (error) {
			console.warn('⚠️ Cache SET error:', error)
			return false
		}
	}

	/**
	 * Delete cached data
	 */
	async del(key: string, options?: CacheOptions): Promise<boolean> {
		try {
			const fullKey = this.buildKey(key, options?.prefix)
			const success = memoryCache.delete(fullKey)
			if (success) {
			}
			return success
		} catch (error) {
			console.warn('⚠️ Cache DEL error:', error)
			return false
		}
	}

	/**
	 * Get or set pattern - tries to get, if not found executes setter and caches result
	 */
	async getOrSet<T>(
		key: string,
		setter: () => Promise<T>,
		options?: CacheOptions
	): Promise<T | null> {
		const cached = await this.get<T>(key, options)
		if (cached !== null) {
			return cached
		}

		try {
			const data = await setter()
			await this.set(key, data, options)
			return data
		} catch (error) {
			console.warn('⚠️ Cache getOrSet setter error:', error)
			return null
		}
	}

	/**
	 * Clear all cache entries with pattern
	 */
	async clearPattern(pattern: string, options?: CacheOptions): Promise<void> {
		try {
			const fullPattern = this.buildKey(pattern, options?.prefix)
			const keysToDelete: string[] = []
			
			for (const key of memoryCache.keys()) {
				if (key.includes(fullPattern)) {
					keysToDelete.push(key)
				}
			}
			
			keysToDelete.forEach(key => memoryCache.delete(key))
		} catch (error) {
			console.warn('⚠️ Cache CLEAR pattern error:', error)
		}
	}

	/**
	 * Check if cache is available
	 */
	isAvailable(): boolean {
		return true // Memory cache is always available
	}

	private buildKey(key: string, prefix?: string): string {
		const actualPrefix = prefix || this.defaultPrefix
		return `${actualPrefix}:${key}`
	}
}

// Specialized cache services for different data types
export class BitrixCacheService extends CacheService {
	private bitrixPrefix = 'bitrix24'

	async getDealCategories(): Promise<any[] | null> {
		return this.get<any[]>('deal-categories', {
			prefix: this.bitrixPrefix,
			ttl: 7200, // 2 hours - categories don't change often
		})
	}

	async setDealCategories(categories: any[]): Promise<boolean> {
		return this.set('deal-categories', categories, {
			prefix: this.bitrixPrefix,
			ttl: 7200,
		})
	}

	async getDealStages(categoryId: string): Promise<any[] | null> {
		return this.get<any[]>(`deal-stages:${categoryId}`, {
			prefix: this.bitrixPrefix,
			ttl: 3600, // 1 hour
		})
	}

	async setDealStages(categoryId: string, stages: any[]): Promise<boolean> {
		return this.set(`deal-stages:${categoryId}`, stages, {
			prefix: this.bitrixPrefix,
			ttl: 3600,
		})
	}

	async getDynamicOptions(source: string, filter?: string): Promise<any[] | null> {
		const key = filter 
			? `dynamic-options:${source}:${Buffer.from(filter).toString('base64')}`
			: `dynamic-options:${source}:all`
		
		return this.get<any[]>(key, {
			prefix: this.bitrixPrefix,
			ttl: 1800, // 30 minutes - dynamic data changes more frequently
		})
	}

	async setDynamicOptions(source: string, options: any[], filter?: string): Promise<boolean> {
		const key = filter 
			? `dynamic-options:${source}:${Buffer.from(filter).toString('base64')}`
			: `dynamic-options:${source}:all`
		
		return this.set(key, options, {
			prefix: this.bitrixPrefix,
			ttl: 1800,
		})
	}

	async clearBitrixCache(): Promise<void> {
		await this.clearPattern('*', { prefix: this.bitrixPrefix })
	}
}

export class FormCacheService extends CacheService {
	private formPrefix = 'forms'

	async getFormWithFields(formId: string): Promise<any | null> {
		return this.get<any>(`form-with-fields:${formId}`, {
			prefix: this.formPrefix,
			ttl: 1800, // 30 minutes - forms can be edited
		})
	}

	async setFormWithFields(formId: string, form: any): Promise<boolean> {
		return this.set(`form-with-fields:${formId}`, form, {
			prefix: this.formPrefix,
			ttl: 1800,
		})
	}

	async getActiveFormsList(): Promise<any[] | null> {
		return this.get<any[]>('active-forms-list', {
			prefix: this.formPrefix,
			ttl: 600, // 10 minutes - can be edited frequently
		})
	}

	async setActiveFormsList(forms: any[]): Promise<boolean> {
		return this.set('active-forms-list', forms, {
			prefix: this.formPrefix,
			ttl: 600,
		})
	}

	async clearFormCache(formId?: string): Promise<void> {
		if (formId) {
			await this.del(`form-with-fields:${formId}`, { prefix: this.formPrefix })
		} else {
			await this.clearPattern('*', { prefix: this.formPrefix })
		}
	}
}

// Export singleton instances
export const cacheService = new CacheService()
export const bitrixCache = new BitrixCacheService()
export const formCache = new FormCacheService()