import api from './api'

interface ElasticsearchItem {
	id: string
	name: string
	TITLE?: string
	NAME?: string
	bitrixId?: string
	description?: string
	score?: number
}

interface ElasticsearchResponse {
	success?: boolean
	result?: ElasticsearchItem[]
	data?: ElasticsearchItem[]
	total: number
	query: string
	searchEngine: string
}

class ElasticsearchService {
	private cache = new Map<string, { data: any; timestamp: number }>()
	private readonly CACHE_TTL = 5 * 60 * 1000 // 5 минут

	/**
	 * Получение названия компании по ID
	 */
	async getCompanyNameById(companyId: string): Promise<string | null> {
		const cacheKey = `company_${companyId}`
		const cached = this.getCachedResult(cacheKey)
		if (cached) {
			return cached
		}

		try {
			console.log(
				`[ElasticsearchService] Запрос названия компании для ID: ${companyId}`
			)
			const response = await api.post<ElasticsearchResponse>(
				'/api/search/companies',
				{
					query: companyId,
					limit: 1,
					offset: 0,
					fuzzy: false,
				}
			)

			console.log(
				`[ElasticsearchService] Ответ для компании ${companyId}:`,
				response.data
			)
			const results = response.data.result || response.data.data || []
			if (results.length > 0) {
				const company = results[0]
				const name = company.TITLE || company.name || companyId
				console.log(
					`[ElasticsearchService] Найдено название для ${companyId}: ${name}`
				)
				this.setCachedResult(cacheKey, name)
				return name
			}

			// Если не найдено в Elasticsearch, возвращаем ID
			this.setCachedResult(cacheKey, companyId)
			return companyId
		} catch (error) {
			console.error('Ошибка получения названия компании:', error)
			return companyId
		}
	}

	/**
	 * Получение названия бетона по ID
	 */
	async getProductNameById(productId: string): Promise<string | null> {
		const cacheKey = `product_${productId}`
		const cached = this.getCachedResult(cacheKey)
		if (cached) {
			return cached
		}

		try {
			const response = await api.post<ElasticsearchResponse>(
				'/api/search/products',
				{
					query: productId,
					limit: 1,
					offset: 0,
					fuzzy: false,
				}
			)

			const results = response.data.result || response.data.data || []
			if (results.length > 0) {
				const product = results[0]
				const name = product.NAME || product.name || productId
				this.setCachedResult(cacheKey, name)
				return name
			}

			// Если не найдено в Elasticsearch, возвращаем ID
			this.setCachedResult(cacheKey, productId)
			return productId
		} catch (error) {
			console.error('Ошибка получения названия продукта:', error)
			return productId
		}
	}

	/**
	 * Получение названий компаний по массиву ID
	 */
	async getCompanyNamesByIds(
		companyIds: string[]
	): Promise<Record<string, string>> {
		const result: Record<string, string> = {}
		const uncachedIds: string[] = []

		// Проверяем кэш для каждого ID
		for (const id of companyIds) {
			const cacheKey = `company_${id}`
			const cached = this.getCachedResult(cacheKey)
			if (cached) {
				result[id] = cached
			} else {
				uncachedIds.push(id)
			}
		}

		// Запрашиваем только не кэшированные ID
		if (uncachedIds.length > 0) {
			try {
				// Делаем запросы параллельно для каждого ID
				const promises = uncachedIds.map(async id => {
					try {
						const response = await api.post<ElasticsearchResponse>(
							'/api/search/companies',
							{
								query: id,
								limit: 1,
								offset: 0,
								fuzzy: false,
							}
						)

						const results = response.data.result || response.data.data || []
						if (results.length > 0) {
							const company = results[0]
							const name = company.TITLE || company.name || id
							this.setCachedResult(`company_${id}`, name)
							return { id, name }
						}

						this.setCachedResult(`company_${id}`, id)
						return { id, name: id }
					} catch (error) {
						console.error(`Ошибка получения названия компании ${id}:`, error)
						this.setCachedResult(`company_${id}`, id)
						return { id, name: id }
					}
				})

				const results = await Promise.all(promises)
				results.forEach(({ id, name }) => {
					result[id] = name
				})
			} catch (error) {
				console.error('Ошибка массового получения названий компаний:', error)
				// Заполняем результат ID для необработанных записей
				uncachedIds.forEach(id => {
					if (!result[id]) {
						result[id] = id
					}
				})
			}
		}

		return result
	}

	/**
	 * Получение названий продуктов по массиву ID
	 */
	async getProductNamesByIds(
		productIds: string[]
	): Promise<Record<string, string>> {
		const result: Record<string, string> = {}
		const uncachedIds: string[] = []

		// Проверяем кэш для каждого ID
		for (const id of productIds) {
			const cacheKey = `product_${id}`
			const cached = this.getCachedResult(cacheKey)
			if (cached) {
				result[id] = cached
			} else {
				uncachedIds.push(id)
			}
		}

		// Запрашиваем только не кэшированные ID
		if (uncachedIds.length > 0) {
			try {
				// Делаем запросы параллельно для каждого ID
				const promises = uncachedIds.map(async id => {
					try {
						const response = await api.post<ElasticsearchResponse>(
							'/api/search/products',
							{
								query: id,
								limit: 1,
								offset: 0,
								fuzzy: false,
							}
						)

						const results = response.data.result || response.data.data || []
						if (results.length > 0) {
							const product = results[0]
							const name = product.NAME || product.name || id
							this.setCachedResult(`product_${id}`, name)
							return { id, name }
						}

						this.setCachedResult(`product_${id}`, id)
						return { id, name: id }
					} catch (error) {
						console.error(`Ошибка получения названия продукта ${id}:`, error)
						this.setCachedResult(`product_${id}`, id)
						return { id, name: id }
					}
				})

				const results = await Promise.all(promises)
				results.forEach(({ id, name }) => {
					result[id] = name
				})
			} catch (error) {
				console.error('Ошибка массового получения названий продуктов:', error)
				// Заполняем результат ID для необработанных записей
				uncachedIds.forEach(id => {
					if (!result[id]) {
						result[id] = id
					}
				})
			}
		}

		return result
	}

	/**
	 * Очистка кэша
	 */
	clearCache(): void {
		this.cache.clear()
	}

	/**
	 * Получение данных из кэша
	 */
	private getCachedResult(key: string): string | null {
		const cached = this.cache.get(key)
		if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
			return cached.data
		}
		this.cache.delete(key)
		return null
	}

	/**
	 * Сохранение данных в кэш
	 */
	private setCachedResult(key: string, data: string): void {
		this.cache.set(key, { data, timestamp: Date.now() })

		// Очищаем старые записи если кэш стал слишком большим
		if (this.cache.size > 1000) {
			const now = Date.now()
			const entries = Array.from(this.cache.entries())
			for (const [k, v] of entries) {
				if (now - v.timestamp > this.CACHE_TTL) {
					this.cache.delete(k)
				}
			}
		}
	}
}

export const elasticsearchService = new ElasticsearchService()
export default elasticsearchService
