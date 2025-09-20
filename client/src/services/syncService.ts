import api from './api'

export interface SyncStatus {
	isRunning: boolean
	lastSync: string | null
	nextSync: string | null
	totalRecords: number
	successfulRecords: number
	failedRecords: number
	errors: string[]
	progress: number
	currentStep: string
	startTime: string | null
}

export interface IndexStats {
	total: any
	primaries: any
	docs: {
		count: number
		deleted: number
	}
	store: {
		size_in_bytes: number
	}
}

export interface SyncResponse {
	success: boolean
	data?: {
		syncStatus: SyncStatus
		indexStats: IndexStats
		availableSchedules: { [key: string]: string }
	}
	message?: string
	error?: string
}

export interface StatsResponse {
	success: boolean
	data?: {
		stats: IndexStats
		timestamp: string
	}
	message?: string
	error?: string
}

class SyncService {
	/**
	 * Получение статуса синхронизации
	 */
	async getStatus(): Promise<SyncResponse> {
		const response = await api.get('/api/sync/status')
		return response.data
	}

	/**
	 * Запуск синхронизации вручную
	 */
	async startSync(
		force: boolean = false
	): Promise<{ success: boolean; message: string }> {
		const response = await api.post('/api/sync/start', { force })
		return response.data
	}

	/**
	 * Установка расписания синхронизации (через cron)
	 */
	async setSchedule(
		schedule: string
	): Promise<{ success: boolean; message: string }> {
		const response = await api.post('/api/cron/schedule', { schedule })
		return response.data
	}

	/**
	 * Очистка данных Elasticsearch
	 */
	async clearData(): Promise<{ success: boolean; message: string }> {
		const response = await api.post('/api/sync/clear')
		return response.data
	}

	/**
	 * Синхронизация с Bitrix24 в Elasticsearch (инкрементальная система)
	 */
	async syncBitrixToElastic(): Promise<{
		success: boolean
		message: string
		data?: any
	}> {
		const response = await api.post(
			'/api/incremental-sync/all',
			{
				forceFullSync: false,
				batchSize: 500, // Увеличиваем batchSize для более быстрой синхронизации
				maxAgeHours: 24,
			},
			{
				timeout: 300000, // 5 минут для синхронизации
			}
		)
		return response.data
	}

	/**
	 * Переиндексация с поддержкой Bitrix ID (инкрементальная система)
	 */
	async reindexWithBitrixId(): Promise<{
		success: boolean
		message: string
		data?: any
	}> {
		const response = await api.post(
			'/api/incremental-sync/all',
			{
				forceFullSync: true,
				batchSize: 200,
				maxAgeHours: 24,
			},
			{
				timeout: 600000, // 10 минут для полной переиндексации
			}
		)
		return response.data
	}

	/**
	 * Получение статистики инкрементальной синхронизации
	 */
	async getIncrementalSyncStats(): Promise<{
		success: boolean
		data?: any
	}> {
		const response = await api.get('/api/incremental-sync/stats')
		return response.data
	}

	/**
	 * Получение метаданных синхронизации
	 */
	async getSyncMetadata(): Promise<{
		success: boolean
		data?: any
	}> {
		const response = await api.get('/api/incremental-sync/metadata')
		return response.data
	}

	/**
	 * Инициализация алиаса Elasticsearch
	 */
	async initializeAlias(): Promise<{
		success: boolean
		message: string
	}> {
		const response = await api.post('/api/incremental-sync/initialize-alias')
		return response.data
	}

	/**
	 * Полная инкрементальная синхронизация
	 */
	async runIncrementalSync(
		options: {
			forceFullSync?: boolean
			batchSize?: number
			maxAgeHours?: number
		} = {}
	): Promise<{
		success: boolean
		message: string
		data?: any
	}> {
		const timeout = options.forceFullSync ? 600000 : 300000 // 10 минут для полной, 5 минут для инкрементальной
		const response = await api.post('/api/incremental-sync/all', options, {
			timeout,
		})
		return response.data
	}

	/**
	 * Получение статистики Elasticsearch
	 */
	async getStats(): Promise<StatsResponse> {
		const response = await api.get('/api/sync/stats')
		return response.data
	}

	/**
	 * Получение доступных расписаний
	 */
	getAvailableSchedules(): { [key: string]: string } {
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

	/**
	 * Форматирование размера в байтах
	 */
	formatBytes(bytes: number): string {
		if (bytes === 0) return '0 Bytes'

		const k = 1024
		const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
		const i = Math.floor(Math.log(bytes) / Math.log(k))

		return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
	}

	/**
	 * Форматирование даты
	 */
	formatDate(dateString: string | null): string {
		if (!dateString) return 'Никогда'

		const date = new Date(dateString)
		return date.toLocaleString('ru-RU', {
			year: 'numeric',
			month: '2-digit',
			day: '2-digit',
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit',
		})
	}
}

export const syncService = new SyncService()
