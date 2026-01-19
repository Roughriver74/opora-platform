import { logger } from '../utils/logger'
import { AppDataSource } from '../database/config/database.config'
import { Submission, BitrixSyncStatus } from '../database/entities/Submission.entity'
import bitrix24Service from './bitrix24Service'
import { In, LessThanOrEqual } from 'typeorm'

export interface SyncOptions {
	maxAttempts?: number
	batchSize?: number
	delayBetweenRequests?: number // ms
}

export interface SyncResult {
	submissionId: string
	submissionNumber: string
	success: boolean
	bitrixDealId?: string
	error?: string
}

const DEFAULT_OPTIONS: Required<SyncOptions> = {
	maxAttempts: 5,
	batchSize: 10,
	delayBetweenRequests: 500,
}

class SubmissionSyncService {
	private submissionRepository = () => AppDataSource.getRepository(Submission)

	/**
	 * Синхронизирует одну заявку с Bitrix24
	 * @param submissionId - UUID заявки
	 * @returns Результат синхронизации
	 */
	async syncSubmission(submissionId: string): Promise<SyncResult> {
		const repository = this.submissionRepository()
		const submission = await repository.findOne({
			where: { id: submissionId },
			relations: ['form', 'user'],
		})

		if (!submission) {
			return {
				submissionId,
				submissionNumber: '',
				success: false,
				error: 'Submission not found',
			}
		}

		return this.syncSubmissionEntity(submission)
	}

	/**
	 * Внутренний метод синхронизации сущности
	 */
	private async syncSubmissionEntity(submission: Submission): Promise<SyncResult> {
		const repository = this.submissionRepository()

		const result: SyncResult = {
			submissionId: submission.id,
			submissionNumber: submission.submissionNumber,
			success: false,
		}

		// Проверка, включена ли интеграция с Bitrix24
		if (!bitrix24Service.isEnabled()) {
			logger.debug(`[SYNC] ⏭️ Пропуск синхронизации ${submission.submissionNumber} - Bitrix24 отключен`)
			result.success = true
			result.error = 'Bitrix24 integration disabled'
			return result
		}

		try {
			logger.info(
				`[SYNC] Синхронизация заявки ${submission.submissionNumber} с Bitrix24...`
			)

			// Подготавливаем данные для Bitrix24
			const dealData = this.prepareDealData(submission)

			// Создаем сделку в Bitrix24
			const dealResponse = await bitrix24Service.createDeal(dealData)

			if (!dealResponse || !dealResponse.result) {
				throw new Error('Bitrix24 вернул пустой ответ при создании сделки')
			}

			const bitrixDealId = dealResponse.result.toString()

			// Обновляем заявку с информацией о синхронизации
			submission.markSyncSuccess(bitrixDealId)
			await repository.save(submission)

			// Пытаемся обновить сделку с номером заявки для обратной связи
			try {
				await bitrix24Service.updateDeal(bitrixDealId, {
					UF_CRM_SUBMISSION_ID: submission.id,
					UF_CRM_SUBMISSION_NUMBER: submission.submissionNumber,
				})
			} catch (updateError) {
				// Не критично, если обновление не прошло
				logger.warn(
					`[SYNC] Не удалось обновить сделку ${bitrixDealId} с ID заявки: ${updateError.message}`
				)
			}

			result.success = true
			result.bitrixDealId = bitrixDealId

			logger.info(
				`[SYNC] ✅ Заявка ${submission.submissionNumber} синхронизирована, Bitrix Deal ID: ${bitrixDealId}`
			)
		} catch (error: any) {
			const errorInfo = this.classifyBitrixError(error)

			// Логирование по уровню серьезности
			if (errorInfo.severity === 'high') {
				logger.error(`[SYNC] ❌ ${submission.submissionNumber}: ${errorInfo.techMessage}`)
			} else if (errorInfo.severity === 'medium') {
				logger.warn(`[SYNC] ⚠️ ${submission.submissionNumber}: ${errorInfo.techMessage}`)
			} else {
				logger.debug(`[SYNC] 🔄 ${submission.submissionNumber}: ${errorInfo.techMessage} (retry available)`)
			}

			// Обновление статуса в БД
			submission.markSyncFailed(errorInfo.userMessage)
			await repository.save(submission)

			result.success = false
			result.error = errorInfo.userMessage

		}

		return result
	}

	/**
	 * Классификация ошибок Bitrix24 для умной обработки
	 */
	private classifyBitrixError(error: any): {
		category: 'network' | 'api_client' | 'api_server' | 'validation' | 'unknown'
		severity: 'low' | 'medium' | 'high'
		retryable: boolean
		userMessage: string
		techMessage: string
	} {
		// Сетевые ошибки (ECONNABORTED, ENOTFOUND, ETIMEDOUT, ECONNRESET)
		if (error.code?.includes?.('ECONN') || error.code?.includes?.('ETIMEDOUT')) {
			return {
				category: 'network',
				severity: 'low',
				retryable: true,
				userMessage: 'Bitrix24 временно недоступен',
				techMessage: `Сетевая ошибка: ${error.code}`,
			}
		}

		const status = error.response?.status
		const bitrixError = error.response?.data?.error_description || error.response?.data?.error

		// Клиентские ошибки (4xx)
		if (status >= 400 && status < 500) {
			return {
				category: 'api_client',
				severity: status === 429 ? 'medium' : 'high',
				retryable: status === 429,
				userMessage: status === 429 ? 'Превышен лимит запросов к Bitrix24' : 'Ошибка запроса к Bitrix24',
				techMessage: `Ошибка API (${status}): ${bitrixError || 'Unknown'}`,
			}
		}

		// Серверные ошибки (5xx)
		if (status >= 500) {
			return {
				category: 'api_server',
				severity: 'medium',
				retryable: true,
				userMessage: 'Bitrix24 временно недоступен',
				techMessage: `Ошибка сервера Bitrix24 (${status})`,
			}
		}

		// Неизвестная ошибка
		return {
			category: 'unknown',
			severity: 'medium',
			retryable: true,
			userMessage: 'Ошибка синхронизации с Bitrix24',
			techMessage: error.message || 'Unknown error',
		}
	}

	/**
	 * Подготовка данных для создания сделки в Bitrix24
	 */
	private prepareDealData(submission: Submission): any {
		const formData = submission.formData || {}

		// Базовые поля сделки
		const dealData: any = {
			TITLE: submission.title || `Заявка №${submission.submissionNumber}`,
			COMMENTS: submission.notes || '',
			SOURCE_ID: 'WEB',
			CATEGORY_ID: submission.bitrixCategoryId || formData.categoryId || '0',
		}

		// Добавляем данные из формы
		// Контактная информация
		if (formData.contactPhone || formData.phone) {
			dealData.PHONE = [{ VALUE: formData.contactPhone || formData.phone, VALUE_TYPE: 'WORK' }]
		}

		if (formData.contactEmail || formData.email) {
			dealData.EMAIL = [{ VALUE: formData.contactEmail || formData.email, VALUE_TYPE: 'WORK' }]
		}

		// Привязка к контакту Bitrix24
		if (formData.contactBitrixId || formData.contact?.bitrixId) {
			dealData.CONTACT_ID = formData.contactBitrixId || formData.contact?.bitrixId
		}

		// Привязка к компании Bitrix24
		if (formData.companyBitrixId || formData.company?.bitrixId) {
			dealData.COMPANY_ID = formData.companyBitrixId || formData.company?.bitrixId
		}

		// Сумма сделки
		if (formData.amount || formData.totalPrice || formData.price) {
			dealData.OPPORTUNITY = formData.amount || formData.totalPrice || formData.price
			dealData.CURRENCY_ID = formData.currency || 'RUB'
		}

		// Добавляем кастомные поля формы в UF_ поля Bitrix24
		const customFieldsMapping: Record<string, string> = {
			// Поля материалов
			material: 'UF_CRM_MATERIAL',
			materialName: 'UF_CRM_MATERIAL_NAME',
			quantity: 'UF_CRM_QUANTITY',
			volume: 'UF_CRM_VOLUME',
			deliveryAddress: 'UF_CRM_DELIVERY_ADDRESS',
			address: 'UF_CRM_ADDRESS',
			deliveryDate: 'UF_CRM_DELIVERY_DATE',
			// Поля из CRM
			notes: 'UF_CRM_NOTES',
			comment: 'UF_CRM_COMMENT',
		}

		for (const [formField, bitrixField] of Object.entries(customFieldsMapping)) {
			if (formData[formField] !== undefined && formData[formField] !== null && formData[formField] !== '') {
				dealData[bitrixField] = formData[formField]
			}
		}

		// Добавляем все остальные поля формы как JSON в комментарии
		if (Object.keys(formData).length > 0) {
			const formDataComment = Object.entries(formData)
				.filter(([key, value]) => value !== null && value !== undefined && value !== '')
				.map(([key, value]) => `${key}: ${typeof value === 'object' ? JSON.stringify(value) : value}`)
				.join('\n')

			if (formDataComment) {
				dealData.COMMENTS = (dealData.COMMENTS ? dealData.COMMENTS + '\n\n' : '') +
					'--- Данные формы ---\n' + formDataComment
			}
		}

		// Добавляем метаданные заявки
		dealData.COMMENTS = (dealData.COMMENTS ? dealData.COMMENTS + '\n\n' : '') +
			`--- Метаданные ---\n` +
			`ID заявки: ${submission.id}\n` +
			`Номер заявки: ${submission.submissionNumber}\n` +
			`Создана: ${submission.createdAt.toISOString()}`

		return dealData
	}

	/**
	 * Повторная синхронизация всех неудачных заявок
	 */
	async retryFailedSubmissions(options: SyncOptions = {}): Promise<SyncResult[]> {
		const opts = { ...DEFAULT_OPTIONS, ...options }
		const repository = this.submissionRepository()

		logger.info(`[SYNC] Начинаем повторную синхронизацию неудачных заявок...`)

		// Получаем заявки с failed статусом и не превысившие лимит попыток
		const submissions = await repository.find({
			where: {
				bitrixSyncStatus: BitrixSyncStatus.FAILED,
				bitrixSyncAttempts: LessThanOrEqual(opts.maxAttempts),
			},
			relations: ['form', 'user'],
			take: opts.batchSize,
			order: { createdAt: 'ASC' },
		})

		logger.info(`[SYNC] Найдено ${submissions.length} заявок для повторной синхронизации`)

		const results: SyncResult[] = []

		for (const submission of submissions) {
			const result = await this.syncSubmissionEntity(submission)
			results.push(result)

			// Задержка между запросами
			if (opts.delayBetweenRequests > 0) {
				await this.delay(opts.delayBetweenRequests)
			}
		}

		const successful = results.filter(r => r.success).length
		const failed = results.filter(r => !r.success).length

		logger.info(
			`[SYNC] Повторная синхронизация завершена: ${successful} успешно, ${failed} неудачно`
		)

		return results
	}

	/**
	 * Синхронизация всех ожидающих заявок
	 */
	async syncPendingSubmissions(options: SyncOptions = {}): Promise<SyncResult[]> {
		const opts = { ...DEFAULT_OPTIONS, ...options }
		const repository = this.submissionRepository()

		logger.info(`[SYNC] Начинаем синхронизацию ожидающих заявок...`)

		const submissions = await repository.find({
			where: {
				bitrixSyncStatus: BitrixSyncStatus.PENDING,
			},
			relations: ['form', 'user'],
			take: opts.batchSize,
			order: { createdAt: 'ASC' },
		})

		logger.info(`[SYNC] Найдено ${submissions.length} заявок для синхронизации`)

		const results: SyncResult[] = []

		for (const submission of submissions) {
			const result = await this.syncSubmissionEntity(submission)
			results.push(result)

			if (opts.delayBetweenRequests > 0) {
				await this.delay(opts.delayBetweenRequests)
			}
		}

		const successful = results.filter(r => r.success).length
		const failed = results.filter(r => !r.success).length

		logger.info(
			`[SYNC] Синхронизация ожидающих заявок завершена: ${successful} успешно, ${failed} неудачно`
		)

		return results
	}

	/**
	 * Синхронизация всех несинхронизированных заявок (pending + failed)
	 */
	async syncAllUnsyncedSubmissions(options: SyncOptions = {}): Promise<SyncResult[]> {
		const opts = { ...DEFAULT_OPTIONS, ...options }
		const repository = this.submissionRepository()

		logger.info(`[SYNC] Начинаем полную синхронизацию несинхронизированных заявок...`)

		const submissions = await repository.find({
			where: [
				{ bitrixSyncStatus: BitrixSyncStatus.PENDING },
				{
					bitrixSyncStatus: BitrixSyncStatus.FAILED,
					bitrixSyncAttempts: LessThanOrEqual(opts.maxAttempts),
				},
			],
			relations: ['form', 'user'],
			take: opts.batchSize,
			order: { createdAt: 'ASC' },
		})

		logger.info(`[SYNC] Найдено ${submissions.length} заявок для синхронизации`)

		const results: SyncResult[] = []

		for (const submission of submissions) {
			const result = await this.syncSubmissionEntity(submission)
			results.push(result)

			if (opts.delayBetweenRequests > 0) {
				await this.delay(opts.delayBetweenRequests)
			}
		}

		const successful = results.filter(r => r.success).length
		const failed = results.filter(r => !r.success).length

		logger.info(
			`[SYNC] Полная синхронизация завершена: ${successful} успешно, ${failed} неудачно`
		)

		return results
	}

	/**
	 * Получить статистику синхронизации
	 */
	async getSyncStats(): Promise<{
		total: number
		synced: number
		pending: number
		failed: number
		avgAttempts: number
	}> {
		const repository = this.submissionRepository()

		const [total, synced, pending, failed] = await Promise.all([
			repository.count(),
			repository.count({ where: { bitrixSyncStatus: BitrixSyncStatus.SYNCED } }),
			repository.count({ where: { bitrixSyncStatus: BitrixSyncStatus.PENDING } }),
			repository.count({ where: { bitrixSyncStatus: BitrixSyncStatus.FAILED } }),
		])

		// Средний количество попыток для failed
		const failedWithAttempts = await repository
			.createQueryBuilder('submission')
			.select('AVG(submission.bitrixSyncAttempts)', 'avgAttempts')
			.where('submission.bitrixSyncStatus = :status', { status: BitrixSyncStatus.FAILED })
			.getRawOne()

		return {
			total,
			synced,
			pending,
			failed,
			avgAttempts: parseFloat(failedWithAttempts?.avgAttempts || '0'),
		}
	}

	/**
	 * Сбросить статус синхронизации для повторной попытки
	 */
	async resetSyncStatus(submissionIds: string[]): Promise<number> {
		const repository = this.submissionRepository()

		const result = await repository.update(
			{ id: In(submissionIds) },
			{
				bitrixSyncStatus: BitrixSyncStatus.PENDING,
				bitrixSyncError: undefined,
				bitrixSyncAttempts: 0,
			}
		)

		return result.affected || 0
	}

	private delay(ms: number): Promise<void> {
		return new Promise(resolve => setTimeout(resolve, ms))
	}
}

export const submissionSyncService = new SubmissionSyncService()
export default submissionSyncService
