import { Worker, Job } from 'bullmq'
import {
	redisConnection,
	QueueName,
	CreateSubmissionJobData,
	SubmissionJobType,
	JobResult,
} from './config'
import { logger } from '../utils/logger'
import { getSubmissionService } from '../services/SubmissionService'
import { getScheduledSubmissionRepository } from '../database/repositories/ScheduledSubmissionRepository'
import { ScheduledSubmissionStatus } from '../database/entities/ScheduledSubmission.entity'
import bitrix24Service from '../services/bitrix24Service'
import { getFormService } from '../services/FormService'
import { SubmissionPriority } from '../database/entities/Submission.entity'
import { getUserRepository } from '../database/repositories/UserRepository'

/**
 * Воркер для обработки задач создания заявок из очереди
 */
export class SubmissionQueueWorker {
	private worker: Worker<CreateSubmissionJobData, JobResult>
	private isRunning: boolean = false

	constructor(concurrency: number = 5) {
		this.worker = new Worker<CreateSubmissionJobData, JobResult>(
			QueueName.SUBMISSION,
			async (job: Job<CreateSubmissionJobData>) => {
				return this.processJob(job)
			},
			{
				connection: redisConnection,
				concurrency,
				autorun: false, // Не запускаем автоматически
			}
		)

		this.setupWorkerEventHandlers()
		logger.info(`🔧 Воркер очереди заявок инициализирован (concurrency: ${concurrency})`)
	}

	/**
	 * Настройка обработчиков событий воркера
	 */
	private setupWorkerEventHandlers(): void {
		this.worker.on('completed', (job: Job<CreateSubmissionJobData>, result: JobResult) => {
			logger.info(
				`✅ Задача ${job.id} выполнена: ${result.success ? 'успешно' : 'с ошибкой'}`
			)
		})

		this.worker.on('failed', (job: Job<CreateSubmissionJobData> | undefined, error: Error) => {
			logger.error(`❌ Задача ${job?.id} провалилась:`, error)
		})

		this.worker.on('error', (error: Error) => {
			// Фильтруем частые ошибки подключения, чтобы не засорять логи
			const errorMessage = error.message || String(error)
			if (errorMessage.includes('Name or service not known') || 
			    errorMessage.includes('ENOTFOUND') ||
			    errorMessage.includes('ECONNREFUSED')) {
				logger.warn(`⚠️ Ошибка подключения к Redis в воркере (работа продолжается): ${errorMessage}`)
			} else {
				logger.error('❌ Ошибка воркера:', error)
			}
		})

		this.worker.on('stalled', (jobId: string) => {
			logger.warn(`⚠️ Задача ${jobId} застряла`)
		})

		this.worker.on('closed', () => {
			logger.warn('⚠️ Воркер закрыт')
		})
	}

	/**
	 * Обрабатывает задачу из очереди
	 */
	private async processJob(job: Job<CreateSubmissionJobData>): Promise<JobResult> {
		const { data } = job
		logger.info(`🔄 Обработка задачи ${job.id}: ${data.type}`)

		try {
			let result: JobResult

			switch (data.type) {
				case SubmissionJobType.CREATE_SINGLE:
					result = await this.createSingleSubmission(job)
					break
				case SubmissionJobType.CREATE_SCHEDULED:
					result = await this.createScheduledSubmission(job)
					break
				default:
					throw new Error(`Неизвестный тип задачи: ${data.type}`)
			}

			// Обновляем прогресс
			await job.updateProgress(100)

			return result
		} catch (error: any) {
			logger.error(`Ошибка обработки задачи ${job.id}:`, error)

			// Если это запланированная заявка, обновляем её статус
			if (data.scheduledSubmissionId) {
				await this.updateScheduledSubmissionStatus(
					data.scheduledSubmissionId,
					ScheduledSubmissionStatus.FAILED,
					error.message
				)
			}

			throw error
		}
	}

	/**
	 * Создает одиночную заявку
	 */
	private async createSingleSubmission(
		job: Job<CreateSubmissionJobData>
	): Promise<JobResult> {
		const { data } = job
		const submissionService = getSubmissionService()

		// Обновляем прогресс
		await job.updateProgress(10)

		// Создаем заявку через типовой сервис
		const submission = await submissionService.createSubmission({
			formId: data.formId,
			userId: data.userId,
			title: await this.generateTitle(data.formId, data.formData),
			priority: this.mapPriority(data.priority),
			formData: data.formData,
			userName: data.userName,
			userEmail: data.userEmail,
		})

		// Обновляем прогресс
		await job.updateProgress(50)

		// Если указан ответственный, обновляем заявку
		if (data.assignedToId) {
			await submissionService.updateSubmission(submission.id, {
				assignedToId: data.assignedToId,
			})
		}

		// Синхронизируем с Bitrix24, если нужно
		if (!submission.bitrixDealId) {
			await this.syncWithBitrix(submission.id, data.formId, data.formData, {
				assignedToId: data.assignedToId,
			})
		}

		// Обновляем прогресс
		await job.updateProgress(90)

		return {
			success: true,
			submissionId: submission.id,
			submissionNumber: submission.submissionNumber,
			bitrixDealId: submission.bitrixDealId,
		}
	}

	/**
	 * Создает запланированную заявку
	 */
	private async createScheduledSubmission(
		job: Job<CreateSubmissionJobData>
	): Promise<JobResult> {
		const { data } = job

		if (!data.scheduledSubmissionId) {
			throw new Error('scheduledSubmissionId не указан для запланированной заявки')
		}

		const scheduledRepo = getScheduledSubmissionRepository()
		const scheduled = await scheduledRepo.findById(data.scheduledSubmissionId)

		if (!scheduled) {
			throw new Error(`Запланированная заявка ${data.scheduledSubmissionId} не найдена`)
		}

		// Обновляем прогресс
		await job.updateProgress(10)

		// Создаем заявку
		const submissionService = getSubmissionService()
		const submission = await submissionService.createSubmission({
			formId: scheduled.formId,
			userId: scheduled.userId,
			title: await this.generateTitle(scheduled.formId, scheduled.formData),
			priority: this.mapPriority(scheduled.priority),
			formData: scheduled.formData,
			userName: scheduled.userName,
			userEmail: scheduled.userEmail,
			// Отмечаем как периодическую заявку, если есть группа периода
			isPeriodSubmission: !!scheduled.periodGroupId,
			periodGroupId: scheduled.periodGroupId,
			periodStartDate: scheduled.periodStartDate,
			periodEndDate: scheduled.periodEndDate,
		})

		// Обновляем прогресс
		await job.updateProgress(40)

		// Устанавливаем ответственного
		if (scheduled.assignedToId) {
			await submissionService.updateSubmission(submission.id, {
				assignedToId: scheduled.assignedToId,
			})
		}

		// Добавляем метаданные периода, если есть
		if (scheduled.periodGroupId) {
			await submissionService.updateSubmission(submission.id, {
				formData: {
					...submission.formData,
					_periodMetadata: {
						periodGroupId: scheduled.periodGroupId,
						periodPosition: scheduled.periodPosition,
						totalInPeriod: scheduled.totalInPeriod,
						periodStartDate: scheduled.periodStartDate,
						periodEndDate: scheduled.periodEndDate,
					},
				},
			})
		}

		// Обновляем прогресс
		await job.updateProgress(60)

		// Синхронизируем с Bitrix24
		const bitrixDealId = await this.syncWithBitrix(
			submission.id,
			scheduled.formId,
			scheduled.formData,
			{
				isPeriodSubmission: true,
				scheduledDate: scheduled.scheduledDate,
				scheduledTime: scheduled.scheduledTime,
				assignedToId: scheduled.assignedToId,
			}
		)

		// Обновляем прогресс
		await job.updateProgress(80)

		// Обновляем статус запланированной заявки
		scheduled.markAsProcessed(submission.id)
		await scheduledRepo.update(scheduled.id, scheduled)

		// Обновляем прогресс
		await job.updateProgress(90)

		logger.info(
			`✅ Запланированная заявка ${scheduled.id} успешно обработана. Создана заявка ${submission.submissionNumber}`
		)

		return {
			success: true,
			submissionId: submission.id,
			submissionNumber: submission.submissionNumber,
			bitrixDealId: bitrixDealId || undefined,
		}
	}

	/**
	 * Синхронизирует заявку с Bitrix24
	 */
	private async syncWithBitrix(
		submissionId: string,
		formId: string,
		formData: Record<string, any>,
		metadata?: {
			isPeriodSubmission?: boolean
			scheduledDate?: Date
			scheduledTime?: string
			assignedToId?: string // UUID пользователя из БД
		}
	): Promise<string | null> {
		try {
			const formService = getFormService()
			const form = await formService.findWithFields(formId)

			if (!form) {
				logger.warn(`Форма ${formId} не найдена для синхронизации с Bitrix24`)
				return null
			}

			// Подготавливаем данные для Bitrix24
			const dealData: Record<string, any> = {}
			let dealTitle = `Заявка от ${new Date().toLocaleDateString('ru-RU')}`

			for (const field of form.fields) {
				if (formData[field.name] !== undefined && field.bitrixFieldId) {
					const value = formData[field.name]
					dealData[field.bitrixFieldId] = value
					if (field.bitrixFieldId === 'TITLE' && value) {
						dealTitle = value
					}
				}
			}

			dealData.TITLE = dealTitle
			dealData.STAGE_ID = 'C1:NEW'
			dealData.CATEGORY_ID = form.bitrixDealCategory || '1'
			dealData.UF_CRM_1750107484181 = submissionId // ID заявки в системе

			// Для периодических заявок добавляем специальное поле
			if (metadata?.isPeriodSubmission) {
				dealData.UF_CRM_1760208480 = '1' // Признак периодической заявки
				logger.info(`📅 Периодическая заявка: scheduledDate=${metadata.scheduledDate}, scheduledTime=${metadata.scheduledTime}`)
			}

			// Устанавливаем ответственного из assignedToId
			if (metadata?.assignedToId) {
				try {
					const userRepository = getUserRepository()
					const assignedUser = await userRepository.findById(metadata.assignedToId)
					if (assignedUser?.bitrixUserId) {
						dealData.ASSIGNED_BY_ID = assignedUser.bitrixUserId
						logger.info(`👤 Ответственный: ${assignedUser.fullName} (Bitrix ID: ${assignedUser.bitrixUserId})`)
					}
				} catch (error) {
					logger.warn(`⚠️ Не удалось получить данные ответственного: ${error}`)
				}
			}


			// Логируем данные перед отправкой в Bitrix24
			logger.info(`📤 Отправка данных в Bitrix24: ${JSON.stringify(dealData, null, 2)}`)

			// Создаем сделку в Bitrix24
			const dealResponse = await bitrix24Service.createDeal(dealData)
			const bitrixDealId = dealResponse.result?.toString?.()

			if (bitrixDealId) {
				// Обновляем заявку с ID сделки
				const submissionService = getSubmissionService()
				await submissionService.updateBitrixDealId(submissionId, bitrixDealId)

				logger.info(`✅ Заявка ${submissionId} синхронизирована с Bitrix24: ${bitrixDealId}`)
				return bitrixDealId
			}

			return null
		} catch (error) {
			logger.error(`Ошибка синхронизации с Bitrix24 для заявки ${submissionId}:`, error)
			return null
		}
	}

	/**
	 * Генерирует заголовок заявки из данных формы
	 */
	private async generateTitle(
		formId: string,
		formData: Record<string, any>
	): Promise<string> {
		// Загружаем форму чтобы найти поле которое маппится на TITLE в Bitrix24
		try {
			const formService = getFormService()
			const form = await formService.findWithFields(formId)

			if (form) {
				// Ищем поле с bitrixFieldId === 'TITLE'
				for (const field of form.fields) {
					if (
						field.bitrixFieldId === 'TITLE' &&
						formData[field.name] &&
						formData[field.name].trim()
					) {
						return String(formData[field.name])
					}
				}
			}
		} catch (error) {
			logger.warn('Ошибка при загрузке формы для генерации title:', error)
		}

		// Fallback: ищем поле с названием или используем дату
		const possibleTitleFields = ['title', 'name', 'subject', 'тема', 'название']

		for (const field of possibleTitleFields) {
			if (formData[field]) {
				return String(formData[field])
			}
		}

		// Если есть дата доставки
		const dateFields = Object.keys(formData).filter(key =>
			key.includes('date') || key.includes('дата')
		)
		if (dateFields.length > 0 && formData[dateFields[0]]) {
			return `Заявка на ${formData[dateFields[0]]}`
		}

		return `Заявка от ${new Date().toLocaleDateString('ru-RU')}`
	}

	/**
	 * Преобразует приоритет из строки в enum
	 */
	private mapPriority(priority?: string): SubmissionPriority {
		if (!priority) {
			return SubmissionPriority.MEDIUM
		}

		const priorityMap: Record<string, SubmissionPriority> = {
			low: SubmissionPriority.LOW,
			medium: SubmissionPriority.MEDIUM,
			high: SubmissionPriority.HIGH,
			urgent: SubmissionPriority.URGENT,
		}

		return priorityMap[priority.toLowerCase()] || SubmissionPriority.MEDIUM
	}

	/**
	 * Обновляет статус запланированной заявки
	 */
	private async updateScheduledSubmissionStatus(
		scheduledSubmissionId: string,
		status: ScheduledSubmissionStatus,
		error?: string
	): Promise<void> {
		try {
			const scheduledRepo = getScheduledSubmissionRepository()
			await scheduledRepo.updateStatus(scheduledSubmissionId, status, { error })
		} catch (err) {
			logger.error(
				`Ошибка обновления статуса запланированной заявки ${scheduledSubmissionId}:`,
				err
			)
		}
	}

	/**
	 * Запускает воркер
	 */
	async start(): Promise<void> {
		if (this.isRunning) {
			logger.warn('⚠️ Воркер уже запущен')
			return
		}

		this.worker.run() // Don't await - it's a long-running process
		this.isRunning = true
		logger.info('▶️ Воркер очереди заявок запущен')
	}

	/**
	 * Останавливает воркер
	 */
	async stop(): Promise<void> {
		if (!this.isRunning) {
			logger.warn('⚠️ Воркер уже остановлен')
			return
		}

		await this.worker.pause()
		this.isRunning = false
		logger.info('⏸️ Воркер очереди заявок остановлен')
	}

	/**
	 * Закрывает воркер
	 */
	async close(): Promise<void> {
		await this.worker.close()
		this.isRunning = false
		logger.info('🔒 Воркер очереди заявок закрыт')
	}

	/**
	 * Проверяет, запущен ли воркер
	 */
	isActive(): boolean {
		return this.isRunning
	}
}

// Экспорт синглтона воркера
let submissionQueueWorker: SubmissionQueueWorker | null = null

export const getSubmissionQueueWorker = (concurrency?: number): SubmissionQueueWorker => {
	if (!submissionQueueWorker) {
		submissionQueueWorker = new SubmissionQueueWorker(concurrency || 5)
	}
	return submissionQueueWorker
}