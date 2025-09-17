import { elasticsearchService, SearchDocument } from './elasticsearchService'
import bitrix24Service from './bitrix24Service'
import { logger } from '../utils/logger'

export interface SyncStats {
	totalProcessed: number
	successful: number
	failed: number
	errors: string[]
}

class SearchSyncService {
	private isInitialized = false

	/**
	 * Инициализация сервиса поиска
	 */
	async initialize(): Promise<void> {
		if (this.isInitialized) return

		try {
			await elasticsearchService.initializeIndex()
			this.isInitialized = true
			logger.info('Search sync service initialized')
		} catch (error) {
			logger.error('Failed to initialize search sync service:', error)
			throw error
		}
	}

	/**
	 * Синхронизация всех данных из Bitrix24
	 */
	async syncAllData(): Promise<SyncStats> {
		await this.initialize()

		const stats: SyncStats = {
			totalProcessed: 0,
			successful: 0,
			failed: 0,
			errors: [],
		}

		try {
			// Синхронизация продуктов
			logger.info('Starting products sync...')
			const productsStats = await this.syncProducts()
			this.mergeStats(stats, productsStats)

			// Синхронизация компаний
			logger.info('Starting companies sync...')
			const companiesStats = await this.syncCompanies()
			this.mergeStats(stats, companiesStats)

			// Контакты исключены из синхронизации по требованию

			logger.info('Data sync completed:', stats)
			return stats
		} catch (error) {
			logger.error('Data sync failed:', error)
			stats.errors.push(`Sync failed: ${error.message}`)
			return stats
		}
	}

	/**
	 * Синхронизация продуктов
	 */
	async syncProducts(): Promise<SyncStats> {
		const stats: SyncStats = {
			totalProcessed: 0,
			successful: 0,
			failed: 0,
			errors: [],
		}

		try {
			// Получаем ВСЕ продукты из Bitrix24 с пагинацией
			logger.info('Загружаем все продукты из Bitrix24...')
			const products = await bitrix24Service.getAllProducts()

			logger.info(`Found ${products.length} products to sync`)

			const documents: SearchDocument[] = products.map((product: any) => ({
				id: `product_${product.ID}`,
				name: product.NAME || '',
				description: product.DESCRIPTION || '',
				type: 'product' as const,
				price: product.PRICE ? parseFloat(product.PRICE) : undefined,
				currency: product.CURRENCY_ID || 'RUB',
				bitrixId: product.ID, // Добавляем Bitrix ID
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
				searchableText: this.buildSearchableText(product),
			}))

			stats.totalProcessed = documents.length

			if (documents.length > 0) {
				await elasticsearchService.bulkIndex(documents)
				stats.successful = documents.length
			}

			logger.info(
				`Products sync completed: ${stats.successful}/${stats.totalProcessed}`
			)
		} catch (error) {
			logger.error('Products sync failed:', error)
			stats.errors.push(`Products sync failed: ${error.message}`)
		}

		return stats
	}

	/**
	 * Синхронизация компаний
	 */
	async syncCompanies(): Promise<SyncStats> {
		const stats: SyncStats = {
			totalProcessed: 0,
			successful: 0,
			failed: 0,
			errors: [],
		}

		try {
			// Получаем ВСЕ компании из Bitrix24 с пагинацией
			logger.info('Загружаем все компании из Bitrix24...')
			const companies = await bitrix24Service.getAllCompanies()

			logger.info(`Found ${companies.length} companies to sync`)

			const documents: SearchDocument[] = companies.map((company: any) => ({
				id: `company_${company.ID}`,
				name: company.TITLE || '',
				description: company.COMMENTS || '',
				type: 'company' as const,
				industry: company.INDUSTRY || '',
				phone: company.PHONE?.[0]?.VALUE || '',
				email: company.EMAIL?.[0]?.VALUE || '',
				address: company.ADDRESS || '',
				inn: company.RQ_INN || '', // Исправляем маппинг ИНН
				bitrixId: company.ID, // Добавляем Bitrix ID
				assignedById: company.ASSIGNED_BY_ID, // Добавляем ответственного пользователя
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
				searchableText: this.buildSearchableText(company),
			}))

			stats.totalProcessed = documents.length

			if (documents.length > 0) {
				await elasticsearchService.bulkIndex(documents)
				stats.successful = documents.length
			}

			logger.info(
				`Companies sync completed: ${stats.successful}/${stats.totalProcessed}`
			)
		} catch (error) {
			logger.error('Companies sync failed:', error)
			stats.errors.push(`Companies sync failed: ${error.message}`)
		}

		return stats
	}

	/**
	 * Синхронизация контактов
	 */
	async syncContacts(): Promise<SyncStats> {
		const stats: SyncStats = {
			totalProcessed: 0,
			successful: 0,
			failed: 0,
			errors: [],
		}

		try {
			// Получаем все контакты из Bitrix24
			const response = await bitrix24Service.getContacts('', 1000) // Максимум 1000 контактов
			const contacts = response.result || []

			logger.info(`Found ${contacts.length} contacts to sync`)

			const documents: SearchDocument[] = contacts.map((contact: any) => ({
				id: `contact_${contact.ID}`,
				name: `${contact.NAME || ''} ${contact.LAST_NAME || ''}`.trim(),
				description: contact.COMMENTS || '',
				type: 'contact' as const,
				phone: contact.PHONE?.[0]?.VALUE || '',
				email: contact.EMAIL?.[0]?.VALUE || '',
				bitrixId: contact.ID, // Добавляем Bitrix ID
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
				searchableText: this.buildSearchableText(contact),
			}))

			stats.totalProcessed = documents.length

			if (documents.length > 0) {
				await elasticsearchService.bulkIndex(documents)
				stats.successful = documents.length
			}

			logger.info(
				`Contacts sync completed: ${stats.successful}/${stats.totalProcessed}`
			)
		} catch (error) {
			logger.error('Contacts sync failed:', error)
			stats.errors.push(`Contacts sync failed: ${error.message}`)
		}

		return stats
	}

	/**
	 * Синхронизация конкретного продукта
	 */
	async syncProduct(productId: string): Promise<void> {
		await this.initialize()

		try {
			const response = await bitrix24Service.getDeal(productId)
			const product = response.result?.[0]

			if (product) {
				const document: SearchDocument = {
					id: `product_${product.ID}`,
					name: product.NAME || '',
					description: product.DESCRIPTION || '',
					type: 'product',
					price: product.PRICE ? parseFloat(product.PRICE) : undefined,
					currency: product.CURRENCY_ID || 'RUB',
					createdAt: new Date().toISOString(),
					updatedAt: new Date().toISOString(),
					searchableText: this.buildSearchableText(product),
				}

				await elasticsearchService.indexDocument(document)
				logger.info(`Product ${productId} synced successfully`)
			}
		} catch (error) {
			logger.error(`Failed to sync product ${productId}:`, error)
			throw error
		}
	}

	/**
	 * Синхронизация конкретной компании
	 */
	async syncCompany(companyId: string): Promise<void> {
		await this.initialize()

		try {
			// Здесь нужно добавить метод getCompany в bitrix24Service
			// Пока используем общий метод
			const response = await bitrix24Service.getCompanies('', 1000)
			const company = response.result?.find((c: any) => c.ID === companyId)

			if (company) {
				const document: SearchDocument = {
					id: `company_${company.ID}`,
					name: company.TITLE || '',
					description: company.COMMENTS || '',
					type: 'company',
					industry: company.INDUSTRY || '',
					phone: company.PHONE?.[0]?.VALUE || '',
					email: company.EMAIL?.[0]?.VALUE || '',
					address: company.ADDRESS || '',
					createdAt: new Date().toISOString(),
					updatedAt: new Date().toISOString(),
					searchableText: this.buildSearchableText(company),
				}

				await elasticsearchService.indexDocument(document)
				logger.info(`Company ${companyId} synced successfully`)
			}
		} catch (error) {
			logger.error(`Failed to sync company ${companyId}:`, error)
			throw error
		}
	}

	/**
	 * Удаление документа из индекса
	 */
	async removeDocument(
		type: 'product' | 'company' | 'contact',
		id: string
	): Promise<void> {
		await this.initialize()

		try {
			const documentId = `${type}_${id}`
			await elasticsearchService.deleteDocument(documentId)
			logger.info(`Document ${documentId} removed successfully`)
		} catch (error) {
			logger.error(`Failed to remove document ${type}_${id}:`, error)
			throw error
		}
	}

	/**
	 * Построение поискового текста из объекта
	 */
	private buildSearchableText(obj: any): string {
		const searchableFields = [
			obj.NAME || obj.TITLE || '',
			obj.DESCRIPTION || obj.COMMENTS || '',
			obj.INDUSTRY || '',
			obj.ADDRESS || '',
			obj.PHONE?.[0]?.VALUE || '',
			obj.EMAIL?.[0]?.VALUE || '',
		]

		return searchableFields
			.filter(field => field && field.trim())
			.join(' ')
			.trim()
	}

	/**
	 * Объединение статистики
	 */
	private mergeStats(target: SyncStats, source: SyncStats): void {
		target.totalProcessed += source.totalProcessed
		target.successful += source.successful
		target.failed += source.failed
		target.errors.push(...source.errors)
	}

	/**
	 * Проверка здоровья сервиса
	 */
	async healthCheck(): Promise<boolean> {
		try {
			return await elasticsearchService.healthCheck()
		} catch (error) {
			logger.error('Search sync service health check failed:', error)
			return false
		}
	}

	/**
	 * Получение статистики индекса
	 */
	async getIndexStats(): Promise<any> {
		try {
			return await elasticsearchService.getIndexStats()
		} catch (error) {
			logger.error('Failed to get index stats:', error)
			return null
		}
	}
}

export const searchSyncService = new SearchSyncService()
