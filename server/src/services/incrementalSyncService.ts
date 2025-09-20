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

			if (needsFullSync) {
				logger.info('📦 Выполняем полную синхронизацию продуктов...')
				await this.performFullProductSync(result, options)
			} else {
				logger.info('⚡ Выполняем инкрементальную синхронизацию продуктов...')
				await this.performIncrementalProductSync(result, options)
			}

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
	 * Полная синхронизация продуктов
	 */
	private async performFullProductSync(
		result: IncrementalSyncResult,
		options: IncrementalSyncOptions
	): Promise<void> {
		try {
			// Создаем временный индекс
			const tempIndexName = await elasticsearchService.createTemporaryIndex()

			try {
				// Получаем все продукты из Bitrix24
				const products = await bitrix24Service.getAllProducts()
				logger.info(`Найдено ${products.length} продуктов для синхронизации`)

				result.totalProcessed = products.length

				// Подготавливаем документы
				const documents: SearchDocument[] = products.map((product: any) => ({
					id: `product_${product.ID}`,
					name: product.NAME || '',
					description: product.DESCRIPTION || '',
					type: 'product' as const,
					price: product.PRICE ? parseFloat(product.PRICE) : undefined,
					currency: product.CURRENCY_ID || 'RUB',
					industry: 'строительство',
					bitrixId: product.ID,
					createdAt: new Date().toISOString(),
					updatedAt: new Date().toISOString(),
					searchableText: this.buildSearchableText(product),
				}))

				// Индексируем в временный индекс
				const batchSize = options.batchSize || this.DEFAULT_BATCH_SIZE
				for (let i = 0; i < documents.length; i += batchSize) {
					const batch = documents.slice(i, i + batchSize)
					await elasticsearchService.bulkIndex(batch, tempIndexName)
					logger.info(
						`Обработано ${Math.min(i + batchSize, documents.length)}/${
							documents.length
						} продуктов`
					)
				}

				// Переключаем алиас на новый индекс
				await elasticsearchService.switchAlias(tempIndexName)

				// Удаляем старый индекс
				const oldIndexName = await elasticsearchService.getCurrentIndexName()
				if (oldIndexName !== tempIndexName) {
					await elasticsearchService.deleteOldIndex(oldIndexName)
				}

				result.successful = documents.length
			} catch (error) {
				// В случае ошибки удаляем временный индекс
				await elasticsearchService.deleteOldIndex(tempIndexName)
				throw error
			}
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

			if (needsFullSync) {
				logger.info('🏢 Выполняем полную синхронизацию компаний...')
				await this.performFullCompanySync(result, options)
			} else {
				logger.info('⚡ Выполняем инкрементальную синхронизацию компаний...')
				await this.performIncrementalCompanySync(result, options)
			}

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
	 * Полная синхронизация компаний
	 */
	private async performFullCompanySync(
		result: IncrementalSyncResult,
		options: IncrementalSyncOptions
	): Promise<void> {
		try {
			const companies = await bitrix24Service.getAllCompaniesWithRequisites()
			logger.info(`Найдено ${companies.length} компаний для синхронизации`)

			result.totalProcessed = companies.length

			const documents: SearchDocument[] = companies.map((company: any) => ({
				id: `company_${company.ID}`,
				name: company.TITLE || '',
				description: company.COMMENTS || '',
				type: 'company' as const,
				industry: company.INDUSTRY || '',
				phone: company.PHONE?.[0]?.VALUE || '',
				email: company.EMAIL?.[0]?.VALUE || '',
				address: company.ADDRESS || '',
				inn: company.RQ_INN || '',
				bitrixId: company.ID,
				assignedById: company.ASSIGNED_BY_ID,
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
				searchableText: this.buildSearchableText(company),
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
		// Аналогично продуктам, пока что делаем полную синхронизацию
		logger.warn(
			'Bitrix24 API не поддерживает инкрементальную синхронизацию, выполняем полную синхронизацию'
		)
		await this.performFullCompanySync(result, options)
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

			if (needsFullSync) {
				logger.info('📋 Выполняем полную синхронизацию заявок...')
				await this.performFullSubmissionSync(result, options)
			} else {
				logger.info('⚡ Выполняем инкрементальную синхронизацию заявок...')
				await this.performIncrementalSubmissionSync(result, options)
			}

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
			'🚀 Начинаем полную инкрементальную синхронизацию всех данных...'
		)

		const results: IncrementalSyncResult[] = []

		try {
			// Синхронизируем продукты
			const productsResult = await this.syncProducts(options)
			results.push(productsResult)

			// Синхронизируем компании
			const companiesResult = await this.syncCompanies(options)
			results.push(companiesResult)

			// Синхронизируем заявки
			const submissionsResult = await this.syncSubmissions(options)
			results.push(submissionsResult)

			// Обновляем индекс для поиска
			await elasticsearchService.refreshIndex()

			logger.info('✅ Полная инкрементальная синхронизация завершена')
		} catch (error) {
			logger.error('❌ Ошибка при полной синхронизации:', error)
			throw error
		}

		return results
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
