import cron from 'node-cron'
import { elasticsearchService } from './elasticsearchService'
import { searchSyncService } from './searchSyncService'
import { incrementalSyncService } from './incrementalSyncService'
import { syncMetadataService } from './syncMetadataService'
import { logger } from '../utils/logger'

interface SyncStatus {
	isRunning: boolean
	lastSync: Date | null
	nextSync: Date | null
	totalRecords: number
	successfulRecords: number
	failedRecords: number
	errors: string[]
	progress: number
	currentStep: string
	startTime: Date | null
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
		progress: 0,
		currentStep: 'Готов к синхронизации',
		startTime: null,
	}

	private cronJob: cron.ScheduledTask | null = null

	constructor() {
		this.startScheduler()
	}

	/**
	 * Запускает планировщик синхронизации
	 * По умолчанию: каждые 30 минут
	 */
	public startScheduler(schedule: string = '*/30 * * * *'): void {
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
	 * Выполняет синхронизацию данных (использует новую инкрементальную систему)
	 */
	public async performSync(force: boolean = false): Promise<SyncStatus> {
		if (this.syncStatus.isRunning && !force) {
			logger.warn('⚠️ Синхронизация уже выполняется')
			return this.syncStatus
		}

		this.syncStatus.isRunning = true
		this.syncStatus.errors = []
		this.syncStatus.progress = 0
		this.syncStatus.startTime = new Date()
		this.syncStatus.currentStep =
			'Инициализация инкрементальной синхронизации...'

		try {
			logger.info('🔄 Начинаем инкрементальную синхронизацию данных...')

			// Инициализируем алиас если нужно
			this.syncStatus.currentStep = 'Инициализация алиаса Elasticsearch...'
			this.syncStatus.progress = 5
			try {
				await elasticsearchService.initializeAlias()
			} catch (error) {
				logger.warn('Предупреждение при инициализации алиаса:', error.message)
			}

			// Определяем стратегию синхронизации
			this.syncStatus.currentStep = 'Определение стратегии синхронизации...'
			this.syncStatus.progress = 10

			const entityTypes = ['products', 'companies', 'submissions']
			let totalProcessed = 0
			let totalSuccessful = 0
			let totalFailed = 0
			const allErrors: string[] = []

			// Синхронизируем каждый тип данных
			for (let i = 0; i < entityTypes.length; i++) {
				const entityType = entityTypes[i]
				const progressStart = 15 + i * 25
				const progressEnd = 15 + (i + 1) * 25

				this.syncStatus.currentStep = `Синхронизация ${entityType}...`
				this.syncStatus.progress = progressStart

				try {
					let result
					switch (entityType) {
						case 'products':
							result = await incrementalSyncService.syncProducts({
								forceFullSync: force,
								batchSize: 100,
								maxAgeHours: 24,
							})
							break
						case 'companies':
							result = await incrementalSyncService.syncCompanies({
								forceFullSync: force,
								batchSize: 100,
								maxAgeHours: 24,
							})
							break
						case 'submissions':
							result = await incrementalSyncService.syncSubmissions({
								forceFullSync: force,
								batchSize: 100,
								maxAgeHours: 24,
							})
							break
						default:
							throw new Error(`Неизвестный тип сущности: ${entityType}`)
					}

					totalProcessed += result.totalProcessed
					totalSuccessful += result.successful
					totalFailed += result.failed
					allErrors.push(...result.errors)

					this.syncStatus.progress = progressEnd
					logger.info(
						`✅ ${entityType}: ${result.successful}/${result.totalProcessed}`
					)
				} catch (error) {
					logger.error(`❌ Ошибка синхронизации ${entityType}:`, error)
					allErrors.push(`${entityType}: ${error.message}`)
					totalFailed++
				}
			}

			// Обновляем индекс для поиска
			this.syncStatus.currentStep = 'Обновление индекса для поиска...'
			this.syncStatus.progress = 90
			try {
				await elasticsearchService.refreshIndex()
			} catch (error) {
				logger.warn('Предупреждение при обновлении индекса:', error.message)
			}

			this.syncStatus.lastSync = new Date()
			this.syncStatus.totalRecords = totalProcessed
			this.syncStatus.successfulRecords = totalSuccessful
			this.syncStatus.failedRecords = totalFailed
			this.syncStatus.errors = allErrors
			this.syncStatus.progress = 100
			this.syncStatus.currentStep = 'Инкрементальная синхронизация завершена'

			logger.info(
				`✅ Инкрементальная синхронизация завершена: ${totalSuccessful}/${totalProcessed} записей успешно обработано`
			)
		} catch (error) {
			logger.error('❌ Критическая ошибка при синхронизации:', error)
			this.syncStatus.errors.push(
				error instanceof Error ? error.message : String(error)
			)
			this.syncStatus.currentStep = 'Критическая ошибка синхронизации'
			this.syncStatus.progress = 0
		} finally {
			this.syncStatus.isRunning = false
		}

		return this.syncStatus
	}

	/**
	 * Получает статус всех синхронизаций
	 */
	public async getSyncMetadata(): Promise<any[]> {
		try {
			return await syncMetadataService.getAllMetadata()
		} catch (error) {
			logger.error('❌ Ошибка при получении метаданных синхронизации:', error)
			return []
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
			'Каждые 30 минут': '*/30 * * * *',
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
