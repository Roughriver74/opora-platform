import { AppDataSource } from '../../database/config/database.config'
import { incrementalSyncService } from '../../services/incrementalSyncService'
import { logger } from '../../utils/logger'

/**
 * Инкрементальная синхронизация заявок
 */
async function incrementalSync() {
	try {
		console.log('⚡ Запуск инкрементальной синхронизации...')

		// Инициализация базы данных
		await AppDataSource.initialize()
		console.log('✅ База данных подключена')

		// Инкрементальная синхронизация заявок
		const result = await incrementalSyncService.syncSubmissions({
			forceFullSync: false,
			batchSize: 100,
		})

		console.log('✅ Инкрементальная синхронизация завершена:', {
			total: result.totalProcessed,
			successful: result.successful,
			failed: result.failed,
			errors: result.errors.length,
			duration: result.duration,
			isFullSync: result.isFullSync,
		})

		if (result.errors.length > 0) {
			console.log('⚠️ Ошибки при синхронизации:')
			result.errors.forEach(error => console.log(`  - ${error}`))
		}
	} catch (error) {
		console.error('❌ Ошибка при инкрементальной синхронизации:', error)
		process.exit(1)
	} finally {
		if (AppDataSource.isInitialized) {
			await AppDataSource.destroy()
			console.log('🔌 Соединение с базой данных закрыто')
		}
	}
}

// Запускаем скрипт, если он вызван напрямую
if (require.main === module) {
	incrementalSync()
}
