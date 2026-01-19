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

			// Синхронизация заявок
			logger.info('Starting submissions sync...')
			const submissionsStats = await this.syncSubmissions()
			this.mergeStats(stats, submissionsStats)

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
			// Получаем ВСЕ продукты из PostgreSQL (локальная БД)
			logger.info('Загружаем все продукты из PostgreSQL...')

			const { AppDataSource } = await import(
				'../database/config/database.config'
			)
			const { Nomenclature } = await import(
				'../database/entities/Nomenclature.entity'
			)

			const nomenclatureRepository = AppDataSource.getRepository(Nomenclature)
			const products = await nomenclatureRepository.find({
				where: { isActive: true },
				order: { name: 'ASC' },
			})

			logger.info(`Found ${products.length} products to sync`)

			const documents: SearchDocument[] = products.map((product: any) => ({
				id: `product_${product.bitrixProductId || product.id}`,
				name: product.name || '',
				description: product.description || '',
				type: 'product' as const,
				price: product.price ? parseFloat(product.price.toString()) : undefined,
				currency: product.currency || 'RUB',
				bitrixId: product.bitrixProductId || product.id, // Bitrix ID из PostgreSQL
				createdAt: product.createdAt?.toISOString() || new Date().toISOString(),
				updatedAt: product.updatedAt?.toISOString() || new Date().toISOString(),
				searchableText: this.buildProductSearchableText(product),
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
			// Получаем ВСЕ компании из PostgreSQL (локальная БД)
			logger.info('Загружаем все компании из PostgreSQL...')

			const { AppDataSource } = await import(
				'../database/config/database.config'
			)
			const { Company } = await import(
				'../database/entities/Company.entity'
			)

			const companyRepository = AppDataSource.getRepository(Company)
			const companies = await companyRepository.find({
				where: { isActive: true },
				order: { name: 'ASC' },
			})

			logger.info(`Found ${companies.length} companies to sync`)

			const documents: SearchDocument[] = companies.map((company: any) => ({
				id: `company_${company.bitrixCompanyId || company.id}`,
				name: company.name || '',
				description: company.notes || '',
				type: 'company' as const,
				industry: company.industry || '',
				phone: company.phone || '',
				email: company.email || '',
				address: company.actualAddress || company.legalAddress || '',
				inn: company.inn || '', // ИНН из PostgreSQL
				bitrixId: company.bitrixCompanyId || company.id,
				createdAt: company.createdAt?.toISOString() || new Date().toISOString(),
				updatedAt: company.updatedAt?.toISOString() || new Date().toISOString(),
				searchableText: this.buildCompanySearchableText(company),
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
	 * Синхронизация заявок
	 */
	async syncSubmissions(): Promise<SyncStats> {
		const stats: SyncStats = {
			totalProcessed: 0,
			successful: 0,
			failed: 0,
			errors: [],
		}

		try {
			// Импортируем необходимые модули
			const { AppDataSource } = await import(
				'../database/config/database.config'
			)
			const { Submission } = await import(
				'../database/entities/Submission.entity'
			)

			logger.info('Загружаем все заявки из базы данных...')

			// Получаем все заявки из базы данных
			const submissionRepository = AppDataSource.getRepository(Submission)
			const submissions = await submissionRepository.find({
				order: { createdAt: 'DESC' },
			})

			logger.info(`Found ${submissions.length} submissions to sync`)

			const documents: SearchDocument[] = []
			let indexedCount = 0
			let errorCount = 0

			for (const submission of submissions) {
				try {
					// Очищаем formData от пустых значений
					const cleanedFormData = submission.formData
						? Object.fromEntries(
								Object.entries(submission.formData).filter(
									([_, value]) =>
										value !== null && value !== undefined && value !== ''
								)
						  )
						: {}

					const submissionData: SearchDocument = {
						id: `submission_${submission.id}`,
						name: submission.title || `Заявка #${submission.submissionNumber}`,
						description: submission.notes || '',
						type: 'submission' as const,
						status: submission.status,
						priority: submission.priority,
						tags: submission.tags || [],
						formData: cleanedFormData,
						submissionNumber: submission.submissionNumber,
						userName: submission.userName,
						userEmail: submission.userEmail,
						formName: submission.formName,
						formTitle: submission.formTitle,
						notes: submission.notes,
						createdAt: submission.createdAt.toISOString(),
						updatedAt: submission.updatedAt.toISOString(),
						searchableText: this.buildSubmissionSearchableText(submission),
					}

					documents.push(submissionData)
					indexedCount++
				} catch (error) {
					logger.error(
						`Ошибка при подготовке заявки ${submission.submissionNumber}:`,
						error
					)
					errorCount++
				}
			}

			stats.totalProcessed = documents.length

			if (documents.length > 0) {
				await elasticsearchService.bulkIndex(documents)
				stats.successful = documents.length
			}

			logger.info(
				`Submissions sync completed: ${stats.successful}/${stats.totalProcessed} (errors: ${errorCount})`
			)
		} catch (error) {
			logger.error('Submissions sync failed:', error)
			stats.errors.push(`Submissions sync failed: ${error.message}`)
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
			obj.RQ_INN || '', // Добавляем ИНН в поисковый текст
		]

		return searchableFields
			.filter(field => field && field.trim())
			.join(' ')
			.trim()
	}

	/**
	 * Построение поискового текста для заявки
	 */
	private buildSubmissionSearchableText(submission: any): string {
		const searchableFields = [
			submission.title || '',
			submission.notes || '',
			submission.submissionNumber || '',
			submission.userName || '',
			submission.userEmail || '',
			submission.formName || '',
			submission.formTitle || '',
			submission.status || '',
			submission.priority || '',
		]

		// Добавляем данные из formData
		if (submission.formData && typeof submission.formData === 'object') {
			Object.values(submission.formData).forEach(value => {
				if (value && typeof value === 'string') {
					searchableFields.push(value)
				}
			})
		}

		return searchableFields
			.filter(field => field && field.trim())
			.join(' ')
			.trim()
	}

	/**
	 * Построение поискового текста для продукта из PostgreSQL
	 */
	private buildProductSearchableText(product: any): string {
		const searchableFields = [
			product.name || '',
			product.description || '',
			product.article || '',
			product.barcode || '',
			product.category || '',
			product.manufacturer || '',
			product.tags?.join(' ') || '',
		]

		return searchableFields
			.filter(field => field && field.trim())
			.join(' ')
			.trim()
	}

	/**
	 * Построение поискового текста для компании из PostgreSQL
	 */
	private buildCompanySearchableText(company: any): string {
		const searchableFields = [
			company.name || '',
			company.shortName || '',
			company.inn || '',
			company.kpp || '',
			company.ogrn || '',
			company.phone || '',
			company.email || '',
			company.actualAddress || '',
			company.legalAddress || '',
			company.industry || '',
			company.notes || '',
			...(company.additionalPhones || []),
			...(company.tags || []),
		]

		return searchableFields
			.filter(field => field && String(field).trim())
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
