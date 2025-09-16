import cron from 'node-cron'
import { elasticsearchService } from './elasticsearchService'
import { searchSyncService } from './searchSyncService'
import { logger } from '../utils/logger'

interface SyncStatus {
	isRunning: boolean
	lastSync: Date | null
	nextSync: Date | null
	totalRecords: number
	successfulRecords: number
	failedRecords: number
	errors: string[]
}

class SyncScheduler {
	private syncStatus: SyncStatus = {
		isRunning: false,
		lastSync: null,
		nextSync: null,
		totalRecords: 0,
		successfulRecords: 0,
		failedRecords: 0,
		errors: [],
	}

	private cronJob: cron.ScheduledTask | null = null

	constructor() {
		this.startScheduler()
	}

	/**
	 * Запускает планировщик синхронизации
	 * По умолчанию: каждые 6 часов
	 */
	public startScheduler(schedule: string = '0 */6 * * *'): void {
		if (this.cronJob) {
			this.cronJob.destroy()
		}

		this.cronJob = cron.schedule(
			schedule,
			async () => {
				await this.performSync()
			},
			{
				scheduled: true,
				timezone: 'Europe/Moscow',
			}
		)

		// Вычисляем время следующей синхронизации
		this.updateNextSyncTime(schedule)

		logger.info(`🕐 Планировщик синхронизации запущен. Расписание: ${schedule}`)
	}

	/**
	 * Останавливает планировщик
	 */
	public stopScheduler(): void {
		if (this.cronJob) {
			this.cronJob.destroy()
			this.cronJob = null
			this.syncStatus.nextSync = null
			logger.info('🛑 Планировщик синхронизации остановлен')
		}
	}

	/**
	 * Выполняет синхронизацию данных
	 */
	public async performSync(force: boolean = false): Promise<SyncStatus> {
		if (this.syncStatus.isRunning && !force) {
			logger.warn('⚠️ Синхронизация уже выполняется')
			return this.syncStatus
		}

		this.syncStatus.isRunning = true
		this.syncStatus.errors = []

		try {
			logger.info('🔄 Начинаем синхронизацию данных с Bitrix24...')

			// Очищаем старые данные
			await this.clearOldData()

			// Синхронизируем данные
			const result = await searchSyncService.syncAllData()

			this.syncStatus.lastSync = new Date()
			this.syncStatus.totalRecords = result.totalProcessed
			this.syncStatus.successfulRecords = result.successful
			this.syncStatus.failedRecords = result.failed
			this.syncStatus.errors = result.errors

			logger.info(
				`✅ Синхронизация завершена: ${result.successful}/${result.totalProcessed} записей успешно обработано`
			)
		} catch (error) {
			logger.error('❌ Ошибка при синхронизации:', error)
			this.syncStatus.errors.push(
				error instanceof Error ? error.message : String(error)
			)
		} finally {
			this.syncStatus.isRunning = false
		}

		return this.syncStatus
	}

	/**
	 * Очищает старые данные из Elasticsearch
	 */
	private async clearOldData(): Promise<void> {
		try {
			logger.info('🧹 Очищаем старые данные...')

			// Удаляем все документы из индекса
			await elasticsearchService.clearIndex()

			logger.info('✅ Старые данные очищены')
		} catch (error) {
			logger.error('❌ Ошибка при очистке данных:', error)
			throw error
		}
	}

	/**
	 * Обновляет время следующей синхронизации
	 */
	private updateNextSyncTime(schedule: string): void {
		try {
			const now = new Date()
			const nextRun = cron.schedule(schedule).nextDate()
			this.syncStatus.nextSync = nextRun
		} catch (error) {
			logger.error(
				'Ошибка при вычислении времени следующей синхронизации:',
				error
			)
		}
	}

	/**
	 * Получает статус синхронизации
	 */
	public getStatus(): SyncStatus {
		return { ...this.syncStatus }
	}

	/**
	 * Устанавливает новое расписание
	 */
	public setSchedule(schedule: string): void {
		this.startScheduler(schedule)
	}

	/**
	 * Получает доступные расписания
	 */
	public getAvailableSchedules(): { [key: string]: string } {
		return {
			'Каждый час': '0 * * * *',
			'Каждые 3 часа': '0 */3 * * *',
			'Каждые 6 часов': '0 */6 * * *',
			'Каждые 12 часов': '0 */12 * * *',
			'Ежедневно в 2:00': '0 2 * * *',
			'Ежедневно в 6:00': '0 6 * * *',
			'Ежедневно в 12:00': '0 12 * * *',
			'Ежедневно в 18:00': '0 18 * * *',
			'Еженедельно (воскресенье в 2:00)': '0 2 * * 0',
			Отключено: '',
		}
	}
}

export const syncScheduler = new SyncScheduler()
