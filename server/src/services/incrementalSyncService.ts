import { elasticsearchService, SearchDocument } from './elasticsearchService'
import { syncMetadataService } from './syncMetadataService'
import bitrix24Service from './bitrix24Service'
import { logger } from '../utils/logger'
import { MoreThanOrEqual } from 'typeorm'

export interface IncrementalSyncOptions {
	forceFullSync?: boolean
	batchSize?: number
	maxAgeHours?: number
}

export interface IncrementalSyncResult {
	entityType: string
	totalProcessed: number
	successful: number
	failed: number
	errors: string[]
	duration: number
	isFullSync: boolean
}

class IncrementalSyncService {
	private readonly DEFAULT_BATCH_SIZE = 100
	private readonly DEFAULT_MAX_AGE_HOURS = 24

	/**
	 * Инкрементальная синхронизация продуктов
	 */
	async syncProducts(
		options: IncrementalSyncOptions = {}
	): Promise<IncrementalSyncResult> {
		const startTime = Date.now()
		const entityType = 'products'

		const result: IncrementalSyncResult = {
			entityType,
			totalProcessed: 0,
			successful: 0,
			failed: 0,
			errors: [],
			duration: 0,
			isFullSync: false,
		}

		try {
			logger.info(`🔄 Начинаем инкрементальную синхронизацию продуктов...`)

			// Обновляем статус
			await syncMetadataService.updateStatus(entityType, 'running')

			// Проверяем, нужна ли полная синхронизация
			const needsFullSync =
				options.forceFullSync ||
				(await syncMetadataService.needsFullSync(
					entityType,
					options.maxAgeHours || this.DEFAULT_MAX_AGE_HOURS
				))

			result.isFullSync = needsFullSync

			// Для продуктов всегда делаем полную синхронизацию
			logger.info('📦 Выполняем полную синхронизацию продуктов...')
			await this.performFullProductSync(result, options)

			// Обновляем метаданные
			await syncMetadataService.upsertMetadata({
				entityType,
				lastSyncTime: new Date(),
				lastFullSyncTime: needsFullSync ? new Date() : undefined,
				totalProcessed: result.totalProcessed,
				successful: result.successful,
				status: 'completed',
			})

			result.duration = Date.now() - startTime
			logger.info(
				`✅ Синхронизация продуктов завершена за ${result.duration}ms: ${result.successful}/${result.totalProcessed}`
			)
		} catch (error) {
			logger.error('❌ Ошибка при синхронизации продуктов:', error)
			result.errors.push(`Products sync failed: ${error.message}`)
			result.duration = Date.now() - startTime

			await syncMetadataService.updateStatus(
				entityType,
				'failed',
				error.message
			)
		}

		return result
	}

	/**
	 * Полная синхронизация продуктов (из локальной БД)
	 */
	private async performFullProductSync(
		result: IncrementalSyncResult,
		options: IncrementalSyncOptions
	): Promise<void> {
		try {
			// Получаем все продукты из локальной БД (PostgreSQL)
			const { AppDataSource } = await import(
				'../database/config/database.config'
			)
			const { Nomenclature } = await import(
				'../database/entities/Nomenclature.entity'
			)

			const nomenclatureRepository = AppDataSource.getRepository(Nomenclature)
			const products = await nomenclatureRepository.find({
				where: { isActive: true },
				relations: ['category', 'unit'],
				order: { sortOrder: 'ASC', name: 'ASC' },
			})

			logger.info(`Найдено ${products.length} продуктов в локальной БД для индексации`)

			result.totalProcessed = products.length

			// Подготавливаем документы для Elasticsearch
			const documents: SearchDocument[] = products.map((product) => ({
				id: `product_${product.id}`,
				localId: product.id,
				name: product.name || '',
				description: product.description || '',
				type: 'product' as const,
				sku: product.sku,
				price: product.price ? Number(product.price) : undefined,
				currency: product.currency || 'RUB',
				industry: product.category?.name || 'строительство',
				categoryId: product.categoryId || undefined,
				categoryName: product.category?.name || undefined,
				unitCode: product.unit?.code || undefined,
				unitName: product.unit?.shortName || product.unit?.name || undefined,
				bitrixId: product.bitrixProductId || undefined,
				tags: product.tags || [],
				attributes: product.attributes || undefined,
				createdAt: product.createdAt.toISOString(),
				updatedAt: product.updatedAt.toISOString(),
				searchableText: this.buildProductSearchableText(product),
			}))

			// Используем bulkUpsert для перезаписи данных
			const batchSize = options.batchSize || this.DEFAULT_BATCH_SIZE
			for (let i = 0; i < documents.length; i += batchSize) {
				const batch = documents.slice(i, i + batchSize)
				await elasticsearchService.bulkUpsert(batch)
				logger.info(
					`Обработано ${Math.min(i + batchSize, documents.length)}/${
						documents.length
					} продуктов`
				)
			}

			result.successful = documents.length
		} catch (error) {
			logger.error('Ошибка при полной синхронизации продуктов:', error)
			throw error
		}
	}

	/**
	 * Инкрементальная синхронизация продуктов
	 */
	private async performIncrementalProductSync(
		result: IncrementalSyncResult,
		options: IncrementalSyncOptions
	): Promise<void> {
		try {
			// Получаем время последней синхронизации
			const metadata = await syncMetadataService.getMetadata('products')
			const lastSyncTime = metadata?.lastSyncTime

			if (!lastSyncTime) {
				logger.warn(
					'Время последней синхронизации не найдено, выполняем полную синхронизацию'
				)
				await this.performFullProductSync(result, options)
				return
			}

			logger.info(`Синхронизируем продукты с ${lastSyncTime.toISOString()}`)

			// Здесь нужно добавить логику получения измененных продуктов из Bitrix24
			// Пока что делаем полную синхронизацию, так как Bitrix24 API не предоставляет
			// эффективный способ получения изменений по времени
			logger.warn(
				'Bitrix24 API не поддерживает инкрементальную синхронизацию, выполняем полную синхронизацию'
			)
			await this.performFullProductSync(result, options)
		} catch (error) {
			logger.error('Ошибка при инкрементальной синхронизации продуктов:', error)
			throw error
		}
	}

	/**
	 * Инкрементальная синхронизация компаний
	 */
	async syncCompanies(
		options: IncrementalSyncOptions = {}
	): Promise<IncrementalSyncResult> {
		const startTime = Date.now()
		const entityType = 'companies'

		const result: IncrementalSyncResult = {
			entityType,
			totalProcessed: 0,
			successful: 0,
			failed: 0,
			errors: [],
			duration: 0,
			isFullSync: false,
		}

		try {
			logger.info(`🔄 Начинаем инкрементальную синхронизацию компаний...`)

			await syncMetadataService.updateStatus(entityType, 'running')

			const needsFullSync =
				options.forceFullSync ||
				(await syncMetadataService.needsFullSync(
					entityType,
					options.maxAgeHours || this.DEFAULT_MAX_AGE_HOURS
				))

			result.isFullSync = needsFullSync

			// Для компаний всегда делаем полную синхронизацию
			logger.info('🏢 Выполняем полную синхронизацию компаний...')
			await this.performFullCompanySync(result, options)

			await syncMetadataService.upsertMetadata({
				entityType,
				lastSyncTime: new Date(),
				lastFullSyncTime: needsFullSync ? new Date() : undefined,
				totalProcessed: result.totalProcessed,
				successful: result.successful,
				status: 'completed',
			})

			result.duration = Date.now() - startTime
			logger.info(
				`✅ Синхронизация компаний завершена за ${result.duration}ms: ${result.successful}/${result.totalProcessed}`
			)
		} catch (error) {
			logger.error('❌ Ошибка при синхронизации компаний:', error)
			result.errors.push(`Companies sync failed: ${error.message}`)
			result.duration = Date.now() - startTime

			await syncMetadataService.updateStatus(
				entityType,
				'failed',
				error.message
			)
		}

		return result
	}

	/**
	 * Полная синхронизация компаний (из локальной БД)
	 */
	private async performFullCompanySync(
		result: IncrementalSyncResult,
		options: IncrementalSyncOptions
	): Promise<void> {
		try {
			// Получаем все компании из локальной БД (PostgreSQL)
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

			logger.info(`Найдено ${companies.length} компаний в локальной БД для индексации`)

			result.totalProcessed = companies.length

			const documents: SearchDocument[] = companies.map((company) => ({
				id: `company_${company.id}`,
				localId: company.id,
				name: company.name || '',
				shortName: company.shortName || undefined,
				description: company.notes || '',
				type: 'company' as const,
				companyType: company.companyType,
				industry: company.industry || '',
				phone: company.phone || '',
				additionalPhones: company.additionalPhones || [],
				email: company.email || '',
				website: company.website || undefined,
				address: company.actualAddress || company.legalAddress || '',
				legalAddress: company.legalAddress || undefined,
				postalAddress: company.postalAddress || undefined,
				inn: company.inn || '',
				kpp: company.kpp || undefined,
				ogrn: company.ogrn || undefined,
				bankName: company.bankName || undefined,
				bankBik: company.bankBik || undefined,
				bankAccount: company.bankAccount || undefined,
				bitrixId: company.bitrixCompanyId || undefined,
				tags: company.tags || [],
				attributes: company.attributes || undefined,
				createdAt: company.createdAt.toISOString(),
				updatedAt: company.updatedAt.toISOString(),
				searchableText: this.buildCompanySearchableText(company),
			}))

			// Используем инкрементальное обновление для компаний
			const batchSize = options.batchSize || this.DEFAULT_BATCH_SIZE
			for (let i = 0; i < documents.length; i += batchSize) {
				const batch = documents.slice(i, i + batchSize)
				await elasticsearchService.bulkUpsert(batch)
				logger.info(
					`Обработано ${Math.min(i + batchSize, documents.length)}/${
						documents.length
					} компаний`
				)
			}

			result.successful = documents.length
		} catch (error) {
			logger.error('Ошибка при полной синхронизации компаний:', error)
			throw error
		}
	}

	/**
	 * Инкрементальная синхронизация компаний
	 */
	private async performIncrementalCompanySync(
		result: IncrementalSyncResult,
		options: IncrementalSyncOptions
	): Promise<void> {
		// Для локальной БД делаем полную синхронизацию
		logger.info('Выполняем полную синхронизацию компаний из локальной БД')
		await this.performFullCompanySync(result, options)
	}

	/**
	 * Инкрементальная синхронизация контактов
	 */
	async syncContacts(
		options: IncrementalSyncOptions = {}
	): Promise<IncrementalSyncResult> {
		const startTime = Date.now()
		const entityType = 'contacts'

		const result: IncrementalSyncResult = {
			entityType,
			totalProcessed: 0,
			successful: 0,
			failed: 0,
			errors: [],
			duration: 0,
			isFullSync: false,
		}

		try {
			logger.info(`🔄 Начинаем синхронизацию контактов...`)

			await syncMetadataService.updateStatus(entityType, 'running')

			const needsFullSync =
				options.forceFullSync ||
				(await syncMetadataService.needsFullSync(
					entityType,
					options.maxAgeHours || this.DEFAULT_MAX_AGE_HOURS
				))

			result.isFullSync = needsFullSync

			logger.info('👤 Выполняем полную синхронизацию контактов...')
			await this.performFullContactSync(result, options)

			await syncMetadataService.upsertMetadata({
				entityType,
				lastSyncTime: new Date(),
				lastFullSyncTime: needsFullSync ? new Date() : undefined,
				totalProcessed: result.totalProcessed,
				successful: result.successful,
				status: 'completed',
			})

			result.duration = Date.now() - startTime
			logger.info(
				`✅ Синхронизация контактов завершена за ${result.duration}ms: ${result.successful}/${result.totalProcessed}`
			)
		} catch (error) {
			logger.error('❌ Ошибка при синхронизации контактов:', error)
			result.errors.push(`Contacts sync failed: ${error.message}`)
			result.duration = Date.now() - startTime

			await syncMetadataService.updateStatus(
				entityType,
				'failed',
				error.message
			)
		}

		return result
	}

	/**
	 * Полная синхронизация контактов (из локальной БД)
	 */
	private async performFullContactSync(
		result: IncrementalSyncResult,
		options: IncrementalSyncOptions
	): Promise<void> {
		try {
			// Получаем все контакты из локальной БД (PostgreSQL)
			const { AppDataSource } = await import(
				'../database/config/database.config'
			)
			const { Contact } = await import(
				'../database/entities/Contact.entity'
			)

			const contactRepository = AppDataSource.getRepository(Contact)
			const contacts = await contactRepository.find({
				where: { isActive: true },
				relations: ['company'],
				order: { lastName: 'ASC', firstName: 'ASC' },
			})

			logger.info(`Найдено ${contacts.length} контактов в локальной БД для индексации`)

			result.totalProcessed = contacts.length

			const documents: SearchDocument[] = contacts.map((contact) => ({
				id: `contact_${contact.id}`,
				localId: contact.id,
				name: this.buildContactFullName(contact),
				firstName: contact.firstName,
				lastName: contact.lastName || undefined,
				middleName: contact.middleName || undefined,
				description: contact.notes || '',
				type: 'contact' as const,
				contactType: contact.contactType,
				position: contact.position || undefined,
				department: contact.department || undefined,
				phone: contact.phone || '',
				additionalPhones: contact.additionalPhones || [],
				email: contact.email || '',
				address: contact.address || undefined,
				companyId: contact.companyId || undefined,
				companyName: contact.company?.name || undefined,
				companyInn: contact.company?.inn || undefined,
				isPrimary: contact.isPrimary,
				bitrixId: contact.bitrixContactId || undefined,
				tags: contact.tags || [],
				attributes: contact.attributes || undefined,
				createdAt: contact.createdAt.toISOString(),
				updatedAt: contact.updatedAt.toISOString(),
				searchableText: this.buildContactSearchableText(contact),
			}))

			// Используем инкрементальное обновление для контактов
			const batchSize = options.batchSize || this.DEFAULT_BATCH_SIZE
			for (let i = 0; i < documents.length; i += batchSize) {
				const batch = documents.slice(i, i + batchSize)
				await elasticsearchService.bulkUpsert(batch)
				logger.info(
					`Обработано ${Math.min(i + batchSize, documents.length)}/${
						documents.length
					} контактов`
				)
			}

			result.successful = documents.length
		} catch (error) {
			logger.error('Ошибка при полной синхронизации контактов:', error)
			throw error
		}
	}

	/**
	 * Инкрементальная синхронизация заявок
	 */
	async syncSubmissions(
		options: IncrementalSyncOptions = {}
	): Promise<IncrementalSyncResult> {
		const startTime = Date.now()
		const entityType = 'submissions'

		const result: IncrementalSyncResult = {
			entityType,
			totalProcessed: 0,
			successful: 0,
			failed: 0,
			errors: [],
			duration: 0,
			isFullSync: false,
		}

		try {
			logger.info(`🔄 Начинаем инкрементальную синхронизацию заявок...`)

			await syncMetadataService.updateStatus(entityType, 'running')

			const needsFullSync =
				options.forceFullSync ||
				(await syncMetadataService.needsFullSync(
					entityType,
					options.maxAgeHours || this.DEFAULT_MAX_AGE_HOURS
				))

			result.isFullSync = needsFullSync

			// Для заявок всегда делаем полную синхронизацию
			logger.info('📋 Выполняем полную синхронизацию заявок...')
			await this.performFullSubmissionSync(result, options)

			await syncMetadataService.upsertMetadata({
				entityType,
				lastSyncTime: new Date(),
				lastFullSyncTime: needsFullSync ? new Date() : undefined,
				totalProcessed: result.totalProcessed,
				successful: result.successful,
				status: 'completed',
			})

			result.duration = Date.now() - startTime
			logger.info(
				`✅ Синхронизация заявок завершена за ${result.duration}ms: ${result.successful}/${result.totalProcessed}`
			)
		} catch (error) {
			logger.error('❌ Ошибка при синхронизации заявок:', error)
			result.errors.push(`Submissions sync failed: ${error.message}`)
			result.duration = Date.now() - startTime

			await syncMetadataService.updateStatus(
				entityType,
				'failed',
				error.message
			)
		}

		return result
	}

	/**
	 * Полная синхронизация заявок
	 */
	private async performFullSubmissionSync(
		result: IncrementalSyncResult,
		options: IncrementalSyncOptions
	): Promise<void> {
		try {
			// Импортируем необходимые модули
			const { AppDataSource } = await import(
				'../database/config/database.config'
			)
			const { Submission } = await import(
				'../database/entities/Submission.entity'
			)

			const submissionRepository = AppDataSource.getRepository(Submission)
			const submissions = await submissionRepository.find({
				order: { createdAt: 'DESC' },
			})

			logger.info(`Найдено ${submissions.length} заявок для синхронизации`)
			result.totalProcessed = submissions.length

			const documents: SearchDocument[] = []
			let errorCount = 0

			for (const submission of submissions) {
				try {
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
				} catch (error) {
					logger.error(
						`Ошибка при подготовке заявки ${submission.submissionNumber}:`,
						error
					)
					errorCount++
				}
			}

			// Используем инкрементальное обновление для заявок
			const batchSize = options.batchSize || this.DEFAULT_BATCH_SIZE
			for (let i = 0; i < documents.length; i += batchSize) {
				const batch = documents.slice(i, i + batchSize)
				await elasticsearchService.bulkUpsert(batch)
				logger.info(
					`Обработано ${Math.min(i + batchSize, documents.length)}/${
						documents.length
					} заявок`
				)
			}

			result.successful = documents.length
			result.failed = errorCount
		} catch (error) {
			logger.error('Ошибка при полной синхронизации заявок:', error)
			throw error
		}
	}

	/**
	 * Инкрементальная синхронизация заявок
	 */
	private async performIncrementalSubmissionSync(
		result: IncrementalSyncResult,
		options: IncrementalSyncOptions
	): Promise<void> {
		try {
			const metadata = await syncMetadataService.getMetadata('submissions')
			const lastSyncTime = metadata?.lastSyncTime

			if (!lastSyncTime) {
				logger.warn(
					'Время последней синхронизации не найдено, выполняем полную синхронизацию'
				)
				await this.performFullSubmissionSync(result, options)
				return
			}

			// Импортируем необходимые модули
			const { AppDataSource } = await import(
				'../database/config/database.config'
			)
			const { Submission } = await import(
				'../database/entities/Submission.entity'
			)

			const submissionRepository = AppDataSource.getRepository(Submission)

			// Получаем только измененные заявки
			const submissions = await submissionRepository.find({
				where: [
					{ updatedAt: MoreThanOrEqual(lastSyncTime) },
					{ createdAt: MoreThanOrEqual(lastSyncTime) },
				],
				order: { updatedAt: 'DESC' },
			})

			logger.info(
				`Найдено ${
					submissions.length
				} измененных заявок с ${lastSyncTime.toISOString()}`
			)
			result.totalProcessed = submissions.length

			if (submissions.length === 0) {
				result.successful = 0
				return
			}

			const documents: SearchDocument[] = []
			let errorCount = 0

			for (const submission of submissions) {
				try {
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
				} catch (error) {
					logger.error(
						`Ошибка при подготовке заявки ${submission.submissionNumber}:`,
						error
					)
					errorCount++
				}
			}

			// Используем инкрементальное обновление
			const batchSize = options.batchSize || this.DEFAULT_BATCH_SIZE
			for (let i = 0; i < documents.length; i += batchSize) {
				const batch = documents.slice(i, i + batchSize)
				await elasticsearchService.bulkUpsert(batch)
				logger.info(
					`Обработано ${Math.min(i + batchSize, documents.length)}/${
						documents.length
					} заявок`
				)
			}

			result.successful = documents.length
			result.failed = errorCount
		} catch (error) {
			logger.error('Ошибка при инкрементальной синхронизации заявок:', error)
			throw error
		}
	}

	/**
	 * Полная синхронизация всех данных
	 */
	async syncAllData(
		options: IncrementalSyncOptions = {}
	): Promise<IncrementalSyncResult[]> {
		logger.info(
			'🚀 Начинаем полную синхронизацию всех данных из локальной БД...'
		)

		const results: IncrementalSyncResult[] = []

		try {
			// Синхронизируем продукты (из Nomenclature entity)
			const productsResult = await this.syncProducts(options)
			results.push(productsResult)

			// Синхронизируем компании (из Company entity)
			const companiesResult = await this.syncCompanies(options)
			results.push(companiesResult)

			// Синхронизируем контакты (из Contact entity)
			const contactsResult = await this.syncContacts(options)
			results.push(contactsResult)

			// Синхронизируем заявки (из Submission entity)
			const submissionsResult = await this.syncSubmissions(options)
			results.push(submissionsResult)

			// Обновляем индекс для поиска
			await elasticsearchService.refreshIndex()

			logger.info('✅ Полная синхронизация из локальной БД завершена')
		} catch (error) {
			logger.error('❌ Ошибка при полной синхронизации:', error)
			throw error
		}

		return results
	}

	/**
	 * Построение ФИО контакта
	 */
	private buildContactFullName(contact: any): string {
		const parts = [contact.lastName, contact.firstName, contact.middleName].filter(Boolean)
		return parts.join(' ') || 'Без имени'
	}

	/**
	 * Построение поискового текста для продукта (Nomenclature)
	 */
	private buildProductSearchableText(product: any): string {
		const searchableFields = [
			product.sku || '',
			product.name || '',
			product.description || '',
			product.category?.name || '',
			product.unit?.name || '',
			product.unit?.shortName || '',
			...(product.tags || []),
		]

		return searchableFields
			.filter(field => field && String(field).trim())
			.join(' ')
			.trim()
	}

	/**
	 * Построение поискового текста для компании (Company)
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
	 * Построение поискового текста для контакта (Contact)
	 */
	private buildContactSearchableText(contact: any): string {
		const searchableFields = [
			contact.lastName || '',
			contact.firstName || '',
			contact.middleName || '',
			contact.phone || '',
			contact.email || '',
			contact.position || '',
			contact.department || '',
			contact.address || '',
			contact.company?.name || '',
			contact.company?.inn || '',
			contact.notes || '',
			...(contact.additionalPhones || []),
			...(contact.tags || []),
		]

		return searchableFields
			.filter(field => field && String(field).trim())
			.join(' ')
			.trim()
	}

	/**
	 * Построение поискового текста из объекта Bitrix24 (legacy)
	 * @deprecated Используйте buildProductSearchableText, buildCompanySearchableText, buildContactSearchableText
	 */
	private buildSearchableText(obj: any): string {
		const searchableFields = [
			obj.NAME || obj.TITLE || '',
			obj.DESCRIPTION || obj.COMMENTS || '',
			obj.INDUSTRY || '',
			obj.ADDRESS || '',
			obj.PHONE?.[0]?.VALUE || '',
			obj.EMAIL?.[0]?.VALUE || '',
			obj.RQ_INN || '',
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
}

export const incrementalSyncService = new IncrementalSyncService()
