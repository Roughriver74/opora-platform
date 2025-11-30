import { Queue, Job, QueueEvents } from 'bullmq'
import {
	redisConnection,
	QueueName,
	defaultJobOptions,
	CreateSubmissionJobData,
	SubmissionJobType,
} from './config'
import { logger } from '../utils/logger'
import { getScheduledSubmissionRepository } from '../database/repositories/ScheduledSubmissionRepository'
import { ScheduledSubmissionStatus } from '../database/entities/ScheduledSubmission.entity'

/**
 * Сервис для управления очередью задач создания заявок
 */
export class SubmissionQueueService {
	private queue: Queue<CreateSubmissionJobData>
	private queueEvents: QueueEvents

	constructor() {
		this.queue = new Queue<CreateSubmissionJobData>(
			QueueName.SUBMISSION,
			{
				connection: redisConnection,
				defaultJobOptions,
			}
		)

		this.queueEvents = new QueueEvents(QueueName.SUBMISSION, {
			connection: redisConnection,
		})

		this.setupQueueEventHandlers()
		logger.info('📥 Сервис очереди заявок инициализирован')
	}

	/**
	 * Настройка обработчиков событий очереди
	 */
	private setupQueueEventHandlers(): void {
		this.queueEvents.on('error', (error) => {
			// Фильтруем частые ошибки подключения, чтобы не засорять логи
			const errorMessage = error?.message || String(error)
			if (errorMessage.includes('Name or service not known') || 
			    errorMessage.includes('ENOTFOUND') ||
			    errorMessage.includes('ECONNREFUSED')) {
				logger.warn(`⚠️ Ошибка подключения к Redis в очереди (работа продолжается): ${errorMessage}`)
			} else {
				logger.error('❌ Ошибка в очереди заявок:', error)
			}
		})

		this.queue.on('error', (error) => {
			// Фильтруем частые ошибки подключения, чтобы не засорять логи
			const errorMessage = error?.message || String(error)
			if (errorMessage.includes('Name or service not known') || 
			    errorMessage.includes('ENOTFOUND') ||
			    errorMessage.includes('ECONNREFUSED')) {
				logger.warn(`⚠️ Ошибка подключения к Redis в Queue (работа продолжается): ${errorMessage}`)
			} else {
				logger.error('❌ Ошибка в Queue:', error)
			}
		})

		this.queueEvents.on('waiting', ({ jobId }) => {
			logger.debug(`⏳ Задача ${jobId} ожидает обработки`)
		})

		this.queueEvents.on('active', ({ jobId }) => {
			logger.debug(`🔄 Задача ${jobId} начала обработку`)
		})

		this.queueEvents.on('completed', ({ jobId }) => {
			logger.info(`✅ Задача ${jobId} успешно выполнена`)
		})

		this.queueEvents.on('failed', ({ jobId, failedReason }) => {
			logger.error(`❌ Задача ${jobId} завершилась с ошибкой:`, failedReason)
		})
	}

	/**
	 * Добавляет задачу создания заявки в очередь
	 */
	async addCreateSubmissionJob(
		data: CreateSubmissionJobData,
		options?: {
			delay?: number // Задержка в миллисекундах
			priority?: number // Приоритет (чем меньше число, тем выше приоритет)
			attempts?: number // Количество попыток
		}
	): Promise<Job<CreateSubmissionJobData>> {
		const jobName = `create-submission-${data.type}`

		// Определяем опции для задачи
		const jobOptions = {
			...defaultJobOptions,
			delay: options?.delay,
			priority: options?.priority,
			attempts: options?.attempts || defaultJobOptions.attempts,
		}

		// Добавляем задачу в очередь
		const job = await this.queue.add(jobName, data, jobOptions)

		// Если это запланированная заявка, обновляем её статус
		if (data.scheduledSubmissionId) {
			try {
				const scheduledRepo = getScheduledSubmissionRepository()
				await scheduledRepo.updateStatus(
					data.scheduledSubmissionId,
					ScheduledSubmissionStatus.PROCESSING,
					{ jobId: job.id }
				)
			} catch (error) {
				logger.error(
					`Ошибка обновления статуса запланированной заявки ${data.scheduledSubmissionId}:`,
					error
				)
			}
		}

		logger.info(`📋 Задача ${job.id} добавлена в очередь: ${jobName}`)
		return job
	}

	/**
	 * Добавляет пакет задач для периодических заявок
	 */
	async addBulkCreateSubmissionJobs(
		jobs: Array<{
			data: CreateSubmissionJobData
			delay?: number
		}>
	): Promise<Job<CreateSubmissionJobData>[]> {
		const bulkJobs = jobs.map(({ data, delay }) => ({
			name: `create-submission-${data.type}`,
			data,
			opts: {
				...defaultJobOptions,
				delay,
			},
		}))

		const addedJobs = await this.queue.addBulk(bulkJobs)

		// Обновляем статусы запланированных заявок
		for (let i = 0; i < addedJobs.length; i++) {
			const job = addedJobs[i]
			const data = jobs[i].data

			if (data.scheduledSubmissionId && job) {
				try {
					const scheduledRepo = getScheduledSubmissionRepository()
					await scheduledRepo.updateStatus(
						data.scheduledSubmissionId,
						ScheduledSubmissionStatus.PROCESSING,
						{ jobId: job.id }
					)
				} catch (error) {
					logger.error(
						`Ошибка обновления статуса запланированной заявки ${data.scheduledSubmissionId}:`,
						error
					)
				}
			}
		}

		logger.info(`📋 Добавлено ${addedJobs.length} задач в очередь`)
		return addedJobs
	}

	/**
	 * Получает статистику очереди
	 */
	async getQueueStats(): Promise<{
		waiting: number
		active: number
		completed: number
		failed: number
		delayed: number
	}> {
		const [
			waiting,
			active,
			completed,
			failed,
			delayed,
		] = await Promise.all([
			this.queue.getWaitingCount(),
			this.queue.getActiveCount(),
			this.queue.getCompletedCount(),
			this.queue.getFailedCount(),
			this.queue.getDelayedCount(),
		])

		return {
			waiting,
			active,
			completed,
			failed,
			delayed,
		}
	}

	/**
	 * Получает задачи из очереди
	 */
	async getJobs(
		types: Array<'waiting' | 'active' | 'completed' | 'failed' | 'delayed'> = ['waiting', 'active'],
		start = 0,
		end = 20
	): Promise<Job<CreateSubmissionJobData>[]> {
		return this.queue.getJobs(types, start, end)
	}

	/**
	 * Получает задачу по ID
	 */
	async getJob(jobId: string): Promise<Job<CreateSubmissionJobData> | undefined> {
		return this.queue.getJob(jobId)
	}

	/**
	 * Отменяет задачу
	 */
	async cancelJob(jobId: string): Promise<boolean> {
		const job = await this.getJob(jobId)
		if (!job) {
			return false
		}

		await job.remove()

		// Обновляем статус запланированной заявки, если есть
		const data = job.data
		if (data.scheduledSubmissionId) {
			try {
				const scheduledRepo = getScheduledSubmissionRepository()
				await scheduledRepo.updateStatus(
					data.scheduledSubmissionId,
					ScheduledSubmissionStatus.CANCELLED
				)
			} catch (error) {
				logger.error(
					`Ошибка обновления статуса запланированной заявки ${data.scheduledSubmissionId}:`,
					error
				)
			}
		}

		logger.info(`🚫 Задача ${jobId} отменена`)
		return true
	}

	/**
	 * Очищает выполненные задачи
	 */
	async cleanCompletedJobs(grace: number = 1000): Promise<void> {
		await this.queue.clean(grace, 1000, 'completed')
		logger.info('🧹 Выполненные задачи очищены')
	}

	/**
	 * Очищает неудачные задачи
	 */
	async cleanFailedJobs(grace: number = 1000): Promise<void> {
		await this.queue.clean(grace, 1000, 'failed')
		logger.info('🧹 Неудачные задачи очищены')
	}

	/**
	 * Приостанавливает очередь
	 */
	async pause(): Promise<void> {
		await this.queue.pause()
		logger.info('⏸️ Очередь заявок приостановлена')
	}

	/**
	 * Возобновляет очередь
	 */
	async resume(): Promise<void> {
		await this.queue.resume()
		logger.info('▶️ Очередь заявок возобновлена')
	}

	/**
	 * Закрывает соединение с очередью
	 */
	async close(): Promise<void> {
		await this.queueEvents.close()
		await this.queue.close()
		logger.info('🔒 Соединение с очередью заявок закрыто')
	}

	/**
	 * Повторяет неудачную задачу
	 */
	async retryFailedJob(jobId: string): Promise<boolean> {
		const job = await this.getJob(jobId)
		if (!job || job.failedReason === undefined) {
			return false
		}

		await job.retry()

		// Обновляем статус запланированной заявки
		const data = job.data
		if (data.scheduledSubmissionId) {
			try {
				const scheduledRepo = getScheduledSubmissionRepository()
				const scheduled = await scheduledRepo.findById(data.scheduledSubmissionId)
				if (scheduled) {
					scheduled.resetForRetry()
					await scheduledRepo.update(scheduled.id, scheduled)
				}
			} catch (error) {
				logger.error(
					`Ошибка сброса статуса запланированной заявки ${data.scheduledSubmissionId}:`,
					error
				)
			}
		}

		logger.info(`🔄 Задача ${jobId} отправлена на повторное выполнение`)
		return true
	}

	/**
	 * Получает прогресс задачи
	 */
	async getJobProgress(jobId: string): Promise<string | boolean | number | object | undefined> {
		const job = await this.getJob(jobId)
		return job?.progress
	}

	/**
	 * Обновляет прогресс задачи (используется воркером)
	 */
	async updateJobProgress(job: Job<CreateSubmissionJobData>, progress: string | boolean | number | object): Promise<void> {
		await job.updateProgress(progress)
	}
}

// Экспорт синглтона сервиса
let submissionQueueService: SubmissionQueueService | null = null

export const getSubmissionQueueService = (): SubmissionQueueService => {
	if (!submissionQueueService) {
		submissionQueueService = new SubmissionQueueService()
	}
	return submissionQueueService
}