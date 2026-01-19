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
	 * Синхронизация данных из Bitrix24 в Elasticsearch (использует новую инкрементальную систему)
	 */
	async syncBitrixToElastic(req: Request, res: Response): Promise<void> {
		try {
			logger.info(
				'🔄 Starting incremental Bitrix24 to Elasticsearch sync via API'
			)

			// Импортируем инкрементальный сервис синхронизации
			const { incrementalSyncService } = await import(
				'../services/incrementalSyncService'
			)

			// Получаем параметры из запроса (с fallback на пустой объект)
			const { forceFullSync, batchSize, maxAgeHours } = req.body || {}

			// Выполняем полную инкрементальную синхронизацию
			const results = await incrementalSyncService.syncAllData({
				forceFullSync: forceFullSync || false,
				batchSize: batchSize || 100,
				maxAgeHours: maxAgeHours || 24,
			})

			// Подсчитываем общую статистику
			const totalProcessed = results.reduce(
				(sum, r) => sum + r.totalProcessed,
				0
			)
			const totalSuccessful = results.reduce((sum, r) => sum + r.successful, 0)
			const totalFailed = results.reduce((sum, r) => sum + r.failed, 0)
			const allErrors = results.flatMap(r => r.errors)

			logger.info(
				'✅ Incremental Bitrix24 to Elasticsearch sync completed successfully'
			)
			res.json({
				success: true,
				message: 'Инкрементальная синхронизация данных завершена успешно',
				data: {
					results,
					summary: {
						totalProcessed,
						totalSuccessful,
						totalFailed,
						errors: allErrors,
					},
				},
				timestamp: new Date().toISOString(),
			})
		} catch (error: any) {
			logger.error(
				'❌ Incremental Bitrix24 to Elasticsearch sync failed:',
				error
			)
			res.status(500).json({
				success: false,
				message: 'Ошибка при инкрементальной синхронизации данных',
				error: error.message,
				timestamp: new Date().toISOString(),
			})
		}
	}

	/**
	 * Переиндексация с поддержкой Bitrix ID (использует новую инкрементальную систему)
	 */
	async reindexWithBitrixId(req: Request, res: Response): Promise<void> {
		try {
			logger.info(
				'🔄 Starting reindex with Bitrix ID support via API (using incremental sync)'
			)

			// Импортируем инкрементальный сервис синхронизации
			const { incrementalSyncService } = await import(
				'../services/incrementalSyncService'
			)

			// Инициализируем алиас Elasticsearch
			logger.info('🔧 Initializing Elasticsearch alias...')
			await elasticsearchService.initializeAlias()

			// Выполняем полную инкрементальную синхронизацию с принудительным обновлением
			logger.info('📦 Running full incremental sync with force update...')
			const results = await incrementalSyncService.syncAllData({
				forceFullSync: true, // Принудительная полная синхронизация
				batchSize: 200,
				maxAgeHours: 24,
			})

			// Подсчитываем общую статистику
			const totalProcessed = results.reduce(
				(sum, r) => sum + r.totalProcessed,
				0
			)
			const totalSuccessful = results.reduce((sum, r) => sum + r.successful, 0)
			const totalFailed = results.reduce((sum, r) => sum + r.failed, 0)
			const allErrors = results.flatMap(r => r.errors)

			logger.info('🎉 Reindex with Bitrix ID completed successfully')
			res.json({
				success: true,
				message:
					'Переиндексация с поддержкой Bitrix ID завершена успешно (инкрементальная система)',
				data: {
					results,
					summary: {
						totalProcessed,
						totalSuccessful,
						totalFailed,
						errors: allErrors,
					},
				},
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
