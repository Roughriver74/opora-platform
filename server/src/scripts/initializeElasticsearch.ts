import { searchSyncService } from '../services/searchSyncService'
import { logger } from '../utils/logger'

/**
 * Инициализация Elasticsearch при запуске сервера
 */
export const initializeElasticsearch = async (): Promise<void> => {
	try {
		logger.info('🚀 Initializing Elasticsearch...')

		// Инициализация индекса
		await searchSyncService.initialize()

		// Инициализация алиаса для инкрементальной синхронизации
		const { elasticsearchService } = await import(
			'../services/elasticsearchService'
		)
		await elasticsearchService.initializeAlias()

		// Проверка здоровья
		const isHealthy = await searchSyncService.healthCheck()

		if (isHealthy) {
			logger.info('✅ Elasticsearch initialized successfully')

			// Получаем статистику индекса
			const stats = await searchSyncService.getIndexStats()
			if (stats) {
				const docCount = stats.total?.docs?.count || 0
				logger.info(`📊 Index stats: ${docCount} documents`)

				// Если индекс пустой, предлагаем синхронизацию
				if (docCount === 0) {
					logger.info('📝 Index is empty. Consider running data sync.')
				}
			}
		} else {
			logger.warn('⚠️ Elasticsearch is not healthy')
		}
	} catch (error) {
		logger.error('❌ Failed to initialize Elasticsearch:', error)
		// Не прерываем запуск сервера, если Elasticsearch недоступен
		logger.info('🔄 Server will continue without Elasticsearch')
	}
}

/**
 * Синхронизация данных в фоновом режиме
 */
export const syncDataInBackground = async (): Promise<void> => {
	try {
		logger.info('🔄 Starting background data sync...')

		const stats = await searchSyncService.syncAllData()

		logger.info('✅ Background sync completed:', {
			total: stats.totalProcessed,
			successful: stats.successful,
			failed: stats.failed,
			errors: stats.errors.length,
		})
	} catch (error) {
		logger.error('❌ Background sync failed:', error)
	}
}
