import { searchSyncService } from '../services/searchSyncService'
import { logger } from '../utils/logger'

async function syncData() {
	try {
		logger.info('🚀 Запуск синхронизации данных...')

		const result = await searchSyncService.syncAllData()

		logger.info(
			`✅ Синхронизация завершена: ${result.successful}/${result.totalProcessed} записей успешно обработано`
		)

		if (result.errors.length > 0) {
			logger.error('❌ Ошибки при синхронизации:', result.errors)
		}

		process.exit(0)
	} catch (error) {
		logger.error('❌ Критическая ошибка при синхронизации:', error)
		process.exit(1)
	}
}

syncData()
