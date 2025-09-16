import { Request, Response } from 'express'
import { syncScheduler } from '../services/syncScheduler'
import { elasticsearchService } from '../services/elasticsearchService'
import { logger } from '../utils/logger'

export class SyncController {
	/**
	 * Получение статуса синхронизации
	 */
	async getStatus(req: Request, res: Response): Promise<void> {
		try {
			const status = syncScheduler.getStatus()
			const indexStats = await elasticsearchService.getIndexStats()

			res.json({
				success: true,
				data: {
					syncStatus: status,
					indexStats: indexStats,
					availableSchedules: syncScheduler.getAvailableSchedules(),
				},
			})
		} catch (error) {
			logger.error('Ошибка при получении статуса синхронизации:', error)
			res.status(500).json({
				success: false,
				message: 'Ошибка при получении статуса синхронизации',
				error: error instanceof Error ? error.message : String(error),
			})
		}
	}

	/**
	 * Запуск синхронизации вручную
	 */
	async startSync(req: Request, res: Response): Promise<void> {
		try {
			const { force = false } = req.body

			logger.info(`🔄 Запуск ручной синхронизации (force: ${force})`)

			// Запускаем синхронизацию в фоне
			syncScheduler
				.performSync(force)
				.then(() => {
					logger.info('✅ Ручная синхронизация завершена')
				})
				.catch(error => {
					logger.error('❌ Ошибка при ручной синхронизации:', error)
				})

			res.json({
				success: true,
				message: 'Синхронизация запущена',
			})
		} catch (error) {
			logger.error('Ошибка при запуске синхронизации:', error)
			res.status(500).json({
				success: false,
				message: 'Ошибка при запуске синхронизации',
				error: error instanceof Error ? error.message : String(error),
			})
		}
	}

	/**
	 * Установка расписания синхронизации
	 */
	async setSchedule(req: Request, res: Response): Promise<void> {
		try {
			const { schedule } = req.body

			if (!schedule) {
				// Отключаем планировщик
				syncScheduler.stopScheduler()
				logger.info('🛑 Планировщик синхронизации отключен')
			} else {
				// Устанавливаем новое расписание
				syncScheduler.setSchedule(schedule)
				logger.info(`🕐 Установлено новое расписание: ${schedule}`)
			}

			res.json({
				success: true,
				message: 'Расписание обновлено',
			})
		} catch (error) {
			logger.error('Ошибка при установке расписания:', error)
			res.status(500).json({
				success: false,
				message: 'Ошибка при установке расписания',
				error: error instanceof Error ? error.message : String(error),
			})
		}
	}

	/**
	 * Очистка данных Elasticsearch
	 */
	async clearData(req: Request, res: Response): Promise<void> {
		try {
			logger.info('🧹 Запуск очистки данных Elasticsearch...')

			await elasticsearchService.clearIndex()

			res.json({
				success: true,
				message: 'Данные очищены',
			})
		} catch (error) {
			logger.error('Ошибка при очистке данных:', error)
			res.status(500).json({
				success: false,
				message: 'Ошибка при очистке данных',
				error: error instanceof Error ? error.message : String(error),
			})
		}
	}

	/**
	 * Получение статистики Elasticsearch
	 */
	async getStats(req: Request, res: Response): Promise<void> {
		try {
			const stats = await elasticsearchService.getIndexStats()

			res.json({
				success: true,
				data: {
					stats,
					timestamp: new Date().toISOString(),
				},
			})
		} catch (error) {
			logger.error('Ошибка при получении статистики:', error)
			res.status(500).json({
				success: false,
				message: 'Ошибка при получении статистики',
				error: error instanceof Error ? error.message : String(error),
			})
		}
	}

	/**
	 * Синхронизация данных из Bitrix24 в Elasticsearch (с поддержкой Bitrix ID)
	 */
	async syncBitrixToElastic(req: Request, res: Response): Promise<void> {
		try {
			logger.info('🔄 Starting Bitrix24 to Elasticsearch sync via API')

			// Импортируем функцию синхронизации
			const { syncBitrixToElasticsearch } = await import(
				'../scripts/syncBitrixToElasticsearch'
			)
			await syncBitrixToElasticsearch()

			logger.info('✅ Bitrix24 to Elasticsearch sync completed successfully')
			res.json({
				success: true,
				message: 'Синхронизация данных завершена успешно',
				timestamp: new Date().toISOString(),
			})
		} catch (error: any) {
			logger.error('❌ Bitrix24 to Elasticsearch sync failed:', error)
			res.status(500).json({
				success: false,
				message: 'Ошибка при синхронизации данных',
				error: error.message,
				timestamp: new Date().toISOString(),
			})
		}
	}

	/**
	 * Переиндексация с поддержкой Bitrix ID
	 */
	async reindexWithBitrixId(req: Request, res: Response): Promise<void> {
		try {
			logger.info('🔄 Starting reindex with Bitrix ID support via API')

			// 1. Check Elasticsearch connection
			const isConnected = await elasticsearchService.healthCheck()
			if (!isConnected) {
				throw new Error('Elasticsearch is not connected')
			}

			// 2. Delete existing index (if any)
			logger.info('🗑️ Deleting existing index...')
			await elasticsearchService.deleteIndex()
			logger.info('✅ Index deleted successfully')

			// 3. Initialize index with new mapping
			logger.info('📝 Initializing new index with Bitrix ID mapping...')
			await elasticsearchService.initializeIndex()
			logger.info('✅ New index initialized successfully')

			// 4. Run full sync from Bitrix24 to populate the new index
			logger.info('📦 Running full Bitrix24 to Elasticsearch sync...')
			const { syncBitrixToElasticsearch } = await import(
				'../scripts/syncBitrixToElasticsearch'
			)
			await syncBitrixToElasticsearch()
			logger.info('✅ Full sync completed successfully')

			logger.info('🎉 Reindex with Bitrix ID completed successfully')
			res.json({
				success: true,
				message: 'Переиндексация с поддержкой Bitrix ID завершена успешно',
				timestamp: new Date().toISOString(),
			})
		} catch (error: any) {
			logger.error('❌ Reindex with Bitrix ID failed:', error)
			res.status(500).json({
				success: false,
				message: 'Ошибка при переиндексации',
				error: error.message,
				timestamp: new Date().toISOString(),
			})
		}
	}
}

export const syncController = new SyncController()
