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

	/**
	 * Переиндексация заявок, отсутствующих в Elasticsearch
	 * Находит заявки с formData в PostgreSQL, которых нет в ES, и индексирует их
	 */
	async reindexMissingSubmissions(
		req: Request,
		res: Response
	): Promise<void> {
		try {
			logger.info(
				'🔍 Начинаем поиск заявок, отсутствующих в Elasticsearch...'
			)

			const { AppDataSource } = await import(
				'../database/config/database.config'
			)
			const { Submission } = await import(
				'../database/entities/Submission.entity'
			)

			const submissionRepository = AppDataSource.getRepository(Submission)
			const submissions = await submissionRepository.find({
				order: { createdAt: 'DESC' },
			})

			logger.info(
				`📊 Всего заявок в PostgreSQL: ${submissions.length}`
			)

			// Проверяем каждую заявку на наличие в ES
			const missingSubmissions: typeof submissions = []

			for (const submission of submissions) {
				try {
					const docId = `submission_${submission.id}`
					const esDoc =
						await elasticsearchService.getDocumentById(docId)

					if (!esDoc || !esDoc.formData) {
						missingSubmissions.push(submission)
					}
				} catch {
					// Документ не найден в ES
					missingSubmissions.push(submission)
				}
			}

			logger.info(
				`⚠️ Найдено ${missingSubmissions.length} заявок, отсутствующих в ES`
			)

			if (missingSubmissions.length === 0) {
				res.json({
					success: true,
					message: 'Все заявки уже проиндексированы в Elasticsearch',
					data: {
						totalInPostgres: submissions.length,
						missingInES: 0,
						reindexed: 0,
					},
				})
				return
			}

			// Индексируем пропущенные заявки
			let reindexed = 0
			let failed = 0
			const errors: string[] = []

			for (const submission of missingSubmissions) {
				try {
					await elasticsearchService.indexSubmission(submission)
					reindexed++
					logger.info(
						`✅ Переиндексирована заявка #${submission.submissionNumber} (${submission.id})`
					)
				} catch (error: any) {
					failed++
					errors.push(
						`#${submission.submissionNumber}: ${error.message}`
					)
					logger.error(
						`❌ Ошибка переиндексации заявки #${submission.submissionNumber}:`,
						error
					)
				}
			}

			logger.info(
				`🎉 Переиндексация пропущенных заявок завершена: ${reindexed} успешно, ${failed} ошибок`
			)

			res.json({
				success: true,
				message: `Переиндексировано ${reindexed} заявок из ${missingSubmissions.length} пропущенных`,
				data: {
					totalInPostgres: submissions.length,
					missingInES: missingSubmissions.length,
					reindexed,
					failed,
					errors: errors.length > 0 ? errors : undefined,
				},
				timestamp: new Date().toISOString(),
			})
		} catch (error: any) {
			logger.error(
				'❌ Ошибка при переиндексации пропущенных заявок:',
				error
			)
			res.status(500).json({
				success: false,
				message: 'Ошибка при переиндексации пропущенных заявок',
				error: error.message,
				timestamp: new Date().toISOString(),
			})
		}
	}
}

export const syncController = new SyncController()
