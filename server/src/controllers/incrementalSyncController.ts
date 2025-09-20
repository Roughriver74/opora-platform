import { Request, Response } from 'express'
import { incrementalSyncService } from '../services/incrementalSyncService'
import { syncMetadataService } from '../services/syncMetadataService'
import { elasticsearchService } from '../services/elasticsearchService'
import { logger } from '../utils/logger'

export class IncrementalSyncController {
	/**
	 * Получение статуса всех синхронизаций
	 */
	async getSyncStatus(req: Request, res: Response): Promise<void> {
		try {
			const metadata = await syncMetadataService.getAllMetadata()

			res.json({
				success: true,
				data: metadata,
				timestamp: new Date().toISOString(),
			})
		} catch (error: any) {
			logger.error('Failed to get sync status:', error)
			res.status(500).json({
				success: false,
				message: 'Ошибка при получении статуса синхронизации',
				error: error.message,
				timestamp: new Date().toISOString(),
			})
		}
	}

	/**
	 * Инкрементальная синхронизация продуктов
	 */
	async syncProducts(req: Request, res: Response): Promise<void> {
		try {
			const { forceFullSync, batchSize, maxAgeHours } = req.body

			logger.info('🔄 Starting incremental products sync via API')

			const result = await incrementalSyncService.syncProducts({
				forceFullSync: forceFullSync || false,
				batchSize: batchSize || 100,
				maxAgeHours: maxAgeHours || 24,
			})

			logger.info('✅ Products sync completed via API:', result)

			res.json({
				success: true,
				message: 'Синхронизация продуктов завершена успешно',
				data: result,
				timestamp: new Date().toISOString(),
			})
		} catch (error: any) {
			logger.error('❌ Products sync failed via API:', error)
			res.status(500).json({
				success: false,
				message: 'Ошибка при синхронизации продуктов',
				error: error.message,
				timestamp: new Date().toISOString(),
			})
		}
	}

	/**
	 * Инкрементальная синхронизация компаний
	 */
	async syncCompanies(req: Request, res: Response): Promise<void> {
		try {
			const { forceFullSync, batchSize, maxAgeHours } = req.body

			logger.info('🔄 Starting incremental companies sync via API')

			const result = await incrementalSyncService.syncCompanies({
				forceFullSync: forceFullSync || false,
				batchSize: batchSize || 100,
				maxAgeHours: maxAgeHours || 24,
			})

			logger.info('✅ Companies sync completed via API:', result)

			res.json({
				success: true,
				message: 'Синхронизация компаний завершена успешно',
				data: result,
				timestamp: new Date().toISOString(),
			})
		} catch (error: any) {
			logger.error('❌ Companies sync failed via API:', error)
			res.status(500).json({
				success: false,
				message: 'Ошибка при синхронизации компаний',
				error: error.message,
				timestamp: new Date().toISOString(),
			})
		}
	}

	/**
	 * Инкрементальная синхронизация заявок
	 */
	async syncSubmissions(req: Request, res: Response): Promise<void> {
		try {
			const { forceFullSync, batchSize, maxAgeHours } = req.body

			logger.info('🔄 Starting incremental submissions sync via API')

			const result = await incrementalSyncService.syncSubmissions({
				forceFullSync: forceFullSync || false,
				batchSize: batchSize || 100,
				maxAgeHours: maxAgeHours || 24,
			})

			logger.info('✅ Submissions sync completed via API:', result)

			res.json({
				success: true,
				message: 'Синхронизация заявок завершена успешно',
				data: result,
				timestamp: new Date().toISOString(),
			})
		} catch (error: any) {
			logger.error('❌ Submissions sync failed via API:', error)
			res.status(500).json({
				success: false,
				message: 'Ошибка при синхронизации заявок',
				error: error.message,
				timestamp: new Date().toISOString(),
			})
		}
	}

	/**
	 * Полная инкрементальная синхронизация всех данных
	 */
	async syncAllData(req: Request, res: Response): Promise<void> {
		try {
			const { forceFullSync, batchSize, maxAgeHours } = req.body

			logger.info('🚀 Starting full incremental sync via API')

			const results = await incrementalSyncService.syncAllData({
				forceFullSync: forceFullSync || false,
				batchSize: batchSize || 100,
				maxAgeHours: maxAgeHours || 24,
			})

			logger.info('✅ Full incremental sync completed via API:', results)

			res.json({
				success: true,
				message: 'Полная инкрементальная синхронизация завершена успешно',
				data: results,
				timestamp: new Date().toISOString(),
			})
		} catch (error: any) {
			logger.error('❌ Full incremental sync failed via API:', error)
			res.status(500).json({
				success: false,
				message: 'Ошибка при полной синхронизации',
				error: error.message,
				timestamp: new Date().toISOString(),
			})
		}
	}

	/**
	 * Получение статистики индекса
	 */
	async getIndexStats(req: Request, res: Response): Promise<void> {
		try {
			const stats = await elasticsearchService.getIndexStats()

			res.json({
				success: true,
				data: stats,
				timestamp: new Date().toISOString(),
			})
		} catch (error: any) {
			logger.error('Failed to get index stats:', error)
			res.status(500).json({
				success: false,
				message: 'Ошибка при получении статистики индекса',
				error: error.message,
				timestamp: new Date().toISOString(),
			})
		}
	}

	/**
	 * Инициализация алиаса Elasticsearch
	 */
	async initializeAlias(req: Request, res: Response): Promise<void> {
		try {
			logger.info('🔧 Initializing Elasticsearch alias via API')

			await elasticsearchService.initializeAlias()

			logger.info('✅ Elasticsearch alias initialized successfully')

			res.json({
				success: true,
				message: 'Алиас Elasticsearch инициализирован успешно',
				timestamp: new Date().toISOString(),
			})
		} catch (error: any) {
			logger.error('❌ Failed to initialize alias:', error)
			res.status(500).json({
				success: false,
				message: 'Ошибка при инициализации алиаса',
				error: error.message,
				timestamp: new Date().toISOString(),
			})
		}
	}

	/**
	 * Очистка метаданных синхронизации для конкретного типа
	 */
	async clearSyncMetadata(req: Request, res: Response): Promise<void> {
		try {
			const { entityType } = req.params

			if (entityType) {
				await syncMetadataService.clearMetadata(entityType)
				logger.info(`Cleared metadata for ${entityType}`)

				res.json({
					success: true,
					message: `Метаданные для ${entityType} очищены`,
					timestamp: new Date().toISOString(),
				})
			} else {
				// Очищаем все метаданные
				const allMetadata = await syncMetadataService.getAllMetadata()
				for (const metadata of allMetadata) {
					await syncMetadataService.clearMetadata(metadata.entityType)
				}
				logger.info('Cleared all sync metadata')

				res.json({
					success: true,
					message: 'Все метаданные синхронизации очищены',
					timestamp: new Date().toISOString(),
				})
			}
		} catch (error: any) {
			logger.error('Failed to clear sync metadata:', error)
			res.status(500).json({
				success: false,
				message: 'Ошибка при очистке метаданных',
				error: error.message,
				timestamp: new Date().toISOString(),
			})
		}
	}

	/**
	 * Принудительное обновление индекса
	 */
	async refreshIndex(req: Request, res: Response): Promise<void> {
		try {
			logger.info('🔄 Refreshing Elasticsearch index via API')

			await elasticsearchService.refreshIndex()

			logger.info('✅ Elasticsearch index refreshed successfully')

			res.json({
				success: true,
				message: 'Индекс Elasticsearch обновлен успешно',
				timestamp: new Date().toISOString(),
			})
		} catch (error: any) {
			logger.error('❌ Failed to refresh index:', error)
			res.status(500).json({
				success: false,
				message: 'Ошибка при обновлении индекса',
				error: error.message,
				timestamp: new Date().toISOString(),
			})
		}
	}
}

export const incrementalSyncController = new IncrementalSyncController()
