import cron from 'node-cron'
import { logger } from '../utils/logger'
import { getScheduledSubmissionRepository } from '../database/repositories/ScheduledSubmissionRepository'
import { getSubmissionQueueService } from '../queue/SubmissionQueueService'
import { SubmissionJobType } from '../queue/config'
import { ScheduledSubmissionStatus } from '../database/entities/ScheduledSubmission.entity'

/**
 * Сервис планировщика для обработки запланированных заявок
 * Проверяет базу данных и добавляет задачи в очередь для заявок, которые нужно создать
 */
export class SubmissionSchedulerService {
	private cronJob: cron.ScheduledTask | null = null
	private isProcessing: boolean = false
	private lastCheck: Date | null = null

	constructor() {
		logger.info('📅 Инициализация планировщика заявок')
	}

	/**
	 * Запускает планировщик
	 * По умолчанию проверяет каждые 30 минут
	 */
	start(schedule: string = '*/30 * * * *'): void {
		if (this.cronJob) {
			logger.warn('⚠️ Планировщик заявок уже запущен')
			return
		}

		// Создаем cron задачу
		this.cronJob = cron.schedule(
			schedule,
			async () => {
				await this.processScheduledSubmissions()
			},
			{
				scheduled: true,
				timezone: 'Europe/Moscow',
			}
		)

		logger.info(`📅 Планировщик заявок запущен с расписанием: ${schedule}`)

		// Выполняем первую проверку сразу после запуска (с задержкой)
		setTimeout(() => {
			this.processScheduledSubmissions().catch(error => {
				logger.error('Ошибка при первоначальной проверке заявок:', error)
			})
		}, 5000) // Задержка 5 секунд для инициализации системы
	}

	/**
	 * Останавливает планировщик
	 */
	stop(): void {
		if (this.cronJob) {
			this.cronJob.stop()
			this.cronJob = null
			logger.info('⏹️ Планировщик заявок остановлен')
		}
	}

	/**
	 * Обрабатывает запланированные заявки
	 */
	async processScheduledSubmissions(): Promise<{
		processed: number
		failed: number
		skipped: number
	}> {
		if (this.isProcessing) {
			logger.warn('⚠️ Обработка заявок уже выполняется')
			return { processed: 0, failed: 0, skipped: 0 }
		}

		this.isProcessing = true
		const startTime = new Date()

		try {
			logger.info('🔍 Проверка запланированных заявок...')

			// Получаем репозиторий и сервис очереди
			const scheduledRepo = getScheduledSubmissionRepository()
			const queueService = getSubmissionQueueService()

			// Ищем заявки, готовые к обработке
			const readySubmissions = await scheduledRepo.findReadyToProcess(100)

			if (readySubmissions.length === 0) {
				logger.debug('📭 Нет заявок для обработки')
				return { processed: 0, failed: 0, skipped: 0 }
			}

			logger.info(`📋 Найдено ${readySubmissions.length} заявок для обработки`)

			let processed = 0
			let failed = 0
			let skipped = 0

			// Обрабатываем каждую заявку
			for (const scheduled of readySubmissions) {
				try {
					// Проверяем, не обрабатывается ли уже эта заявка
					if (scheduled.status !== ScheduledSubmissionStatus.PENDING) {
						skipped++
						continue
					}

					// Проверяем, готова ли заявка к обработке
					if (!scheduled.isReadyToProcess()) {
						skipped++
						continue
					}

					logger.info(
						`⚙️ Добавление в очередь заявки ${scheduled.id} на ${scheduled.scheduledDate}`
					)

					// Добавляем задачу в очередь
					await queueService.addCreateSubmissionJob({
						type: SubmissionJobType.CREATE_SCHEDULED,
						scheduledSubmissionId: scheduled.id,
						formId: scheduled.formId,
						formData: scheduled.formData,
						userId: scheduled.userId,
						userName: scheduled.userName,
						userEmail: scheduled.userEmail,
						assignedToId: scheduled.assignedToId,
						priority: scheduled.priority,
						metadata: {
							periodGroupId: scheduled.periodGroupId,
							periodPosition: scheduled.periodPosition,
							totalInPeriod: scheduled.totalInPeriod,
							scheduledDate: scheduled.scheduledDate.toISOString(),
							scheduledTime: scheduled.scheduledTime,
						},
					})

					// Обновляем статус на "обрабатывается"
					scheduled.markAsProcessing()
					await scheduledRepo.update(scheduled.id, scheduled)

					processed++
				} catch (error: any) {
					logger.error(`Ошибка обработки заявки ${scheduled.id}:`, error)

					// Помечаем заявку как неудачную
					scheduled.markAsFailed(error.message)
					await scheduledRepo.update(scheduled.id, scheduled)

					failed++
				}
			}

			this.lastCheck = new Date()
			const duration = Date.now() - startTime.getTime()

			logger.info(
				`✅ Обработка завершена за ${duration}мс: обработано=${processed}, ошибок=${failed}, пропущено=${skipped}`
			)

			// Пытаемся сбросить старые неудачные задачи для повторной попытки
			const resetCount = await this.resetFailedSubmissions()
			if (resetCount > 0) {
				logger.info(`🔄 Сброшено ${resetCount} неудачных заявок для повторной попытки`)
			}

			return { processed, failed, skipped }
		} catch (error) {
			logger.error('❌ Критическая ошибка при обработке заявок:', error)
			throw error
		} finally {
			this.isProcessing = false
		}
	}

	/**
	 * Сбрасывает неудачные заявки для повторной попытки
	 */
	private async resetFailedSubmissions(): Promise<number> {
		try {
			const scheduledRepo = getScheduledSubmissionRepository()
			return await scheduledRepo.resetFailedJobs(3, 2) // Макс 3 попытки, старше 2 часов
		} catch (error) {
			logger.error('Ошибка при сбросе неудачных заявок:', error)
			return 0
		}
	}

	/**
	 * Принудительно обрабатывает заявки (для тестирования или ручного запуска)
	 */
	async processNow(): Promise<{
		processed: number
		failed: number
		skipped: number
	}> {
		logger.info('🚀 Принудительная обработка запланированных заявок')
		return this.processScheduledSubmissions()
	}

	/**
	 * Получает статус планировщика
	 */
	getStatus(): {
		running: boolean
		processing: boolean
		lastCheck: Date | null
	} {
		return {
			running: this.cronJob !== null,
			processing: this.isProcessing,
			lastCheck: this.lastCheck,
		}
	}

	/**
	 * Получает статистику по запланированным заявкам
	 */
	async getStatistics(): Promise<{
		total: number
		pending: number
		processing: number
		completed: number
		failed: number
		cancelled: number
	}> {
		const scheduledRepo = getScheduledSubmissionRepository()
		return scheduledRepo.getStatistics()
	}

	/**
	 * Получает следующее время запуска
	 */
	getNextRunTime(): Date | null {
		// TODO: Вычислить на основе cron расписания
		if (!this.cronJob) {
			return null
		}

		// Простое приближение - добавляем 30 минут к последней проверке
		if (this.lastCheck) {
			const next = new Date(this.lastCheck)
			next.setMinutes(next.getMinutes() + 30)
			return next
		}

		return null
	}

	/**
	 * Изменяет расписание планировщика
	 */
	reschedule(newSchedule: string): void {
		logger.info(`🔄 Изменение расписания планировщика на: ${newSchedule}`)
		this.stop()
		this.start(newSchedule)
	}
}

// Экспорт синглтона сервиса
let submissionSchedulerService: SubmissionSchedulerService | null = null

export const getSubmissionSchedulerService = (): SubmissionSchedulerService => {
	if (!submissionSchedulerService) {
		submissionSchedulerService = new SubmissionSchedulerService()
	}
	return submissionSchedulerService
}