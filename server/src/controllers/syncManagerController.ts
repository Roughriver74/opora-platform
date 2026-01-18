/**
 * SyncManagerController - API для управления универсальной системой синхронизации
 */

import { Request, Response } from 'express'
import { syncManager, SyncEntityType, SyncDirection } from '../services/sync'
import { logger } from '../utils/logger'

class SyncManagerController {
	/**
	 * Получение списка провайдеров
	 * GET /api/sync-manager/providers
	 */
	async getProviders(req: Request, res: Response): Promise<void> {
		try {
			const providers = syncManager.getProviders()

			res.json({
				success: true,
				data: providers,
			})
		} catch (error: any) {
			logger.error('[SyncManagerController] Ошибка получения провайдеров:', error)
			res.status(500).json({
				success: false,
				message: 'Ошибка получения списка провайдеров',
				error: error.message,
			})
		}
	}

	/**
	 * Получение статистики провайдера
	 * GET /api/sync-manager/providers/:providerId/stats
	 */
	async getProviderStats(req: Request, res: Response): Promise<void> {
		try {
			const { providerId } = req.params
			const stats = await syncManager.getProviderStats(providerId)

			if (!stats.provider) {
				res.status(404).json({
					success: false,
					message: 'Провайдер ' + providerId + ' не найден',
				})
				return
			}

			res.json({
				success: true,
				data: stats,
			})
		} catch (error: any) {
			logger.error('[SyncManagerController] Ошибка получения статистики:', error)
			res.status(500).json({
				success: false,
				message: 'Ошибка получения статистики провайдера',
				error: error.message,
			})
		}
	}

	/**
	 * Тест подключения провайдера
	 * POST /api/sync-manager/providers/:providerId/test
	 */
	async testConnection(req: Request, res: Response): Promise<void> {
		try {
			const { providerId } = req.params
			const result = await syncManager.testConnection(providerId)

			res.json({
				success: result.success,
				message: result.message,
			})
		} catch (error: any) {
			logger.error('[SyncManagerController] Ошибка теста подключения:', error)
			res.status(500).json({
				success: false,
				message: 'Ошибка теста подключения',
				error: error.message,
			})
		}
	}

	/**
	 * Запуск синхронизации
	 * POST /api/sync-manager/run
	 */
	async runSync(req: Request, res: Response): Promise<void> {
		try {
			const {
				providerId,
				entityType,
				direction = 'import',
				options = {},
			} = req.body

			// Валидация
			if (!providerId) {
				res.status(400).json({
					success: false,
					message: 'Не указан providerId',
				})
				return
			}

			if (!entityType) {
				res.status(400).json({
					success: false,
					message: 'Не указан entityType',
				})
				return
			}

			const validEntityTypes: SyncEntityType[] = [
				'company',
				'contact',
				'nomenclature',
				'submission',
				'user',
			]
			if (!validEntityTypes.includes(entityType)) {
				res.status(400).json({
					success: false,
					message: 'Недопустимый entityType. Допустимые: ' + validEntityTypes.join(', '),
				})
				return
			}

			const validDirections: SyncDirection[] = ['import', 'export', 'bidirectional']
			if (!validDirections.includes(direction)) {
				res.status(400).json({
					success: false,
					message: 'Недопустимый direction. Допустимые: ' + validDirections.join(', '),
				})
				return
			}

			logger.info(
				'[SyncManagerController] Запуск синхронизации: ' + providerId + ' / ' + entityType + ' / ' + direction
			)

			const result = await syncManager.sync(
				providerId,
				entityType as SyncEntityType,
				direction as SyncDirection,
				options
			)

			res.json({
				success: result.success,
				data: result,
				message: result.success
					? 'Синхронизация завершена: ' + result.created + ' создано, ' + result.updated + ' обновлено'
					: 'Синхронизация завершена с ошибками: ' + result.failed + ' ошибок',
			})
		} catch (error: any) {
			logger.error('[SyncManagerController] Ошибка синхронизации:', error)
			res.status(500).json({
				success: false,
				message: 'Ошибка выполнения синхронизации',
				error: error.message,
			})
		}
	}

	/**
	 * Запуск полной синхронизации всех провайдеров
	 * POST /api/sync-manager/run-all
	 */
	async runSyncAll(req: Request, res: Response): Promise<void> {
		try {
			const { options = {} } = req.body

			logger.info('[SyncManagerController] Запуск полной синхронизации всех провайдеров')

			const results = await syncManager.syncAll(options)

			const totalProcessed = results.reduce((sum, r) => sum + r.totalProcessed, 0)
			const totalCreated = results.reduce((sum, r) => sum + r.created, 0)
			const totalUpdated = results.reduce((sum, r) => sum + r.updated, 0)
			const totalFailed = results.reduce((sum, r) => sum + r.failed, 0)
			const allSuccess = results.every(r => r.success)

			res.json({
				success: allSuccess,
				data: {
					results,
					summary: {
						totalProcessed,
						totalCreated,
						totalUpdated,
						totalFailed,
						providersCount: results.length,
					},
				},
				message: allSuccess
					? 'Полная синхронизация завершена: ' + totalCreated + ' создано, ' + totalUpdated + ' обновлено'
					: 'Синхронизация завершена с ошибками: ' + totalFailed + ' ошибок',
			})
		} catch (error: any) {
			logger.error('[SyncManagerController] Ошибка полной синхронизации:', error)
			res.status(500).json({
				success: false,
				message: 'Ошибка полной синхронизации',
				error: error.message,
			})
		}
	}

	/**
	 * Получение статуса синхронизации
	 * GET /api/sync-manager/status
	 */
	async getStatus(req: Request, res: Response): Promise<void> {
		try {
			const { providerId } = req.query
			const status = await syncManager.getStatus(providerId as string | undefined)

			res.json({
				success: true,
				data: status,
			})
		} catch (error: any) {
			logger.error('[SyncManagerController] Ошибка получения статуса:', error)
			res.status(500).json({
				success: false,
				message: 'Ошибка получения статуса синхронизации',
				error: error.message,
			})
		}
	}

	/**
	 * Импорт компаний из Bitrix24
	 * POST /api/sync-manager/import/companies
	 */
	async importCompanies(req: Request, res: Response): Promise<void> {
		try {
			const { options = {} } = req.body

			logger.info('[SyncManagerController] Импорт компаний из Bitrix24')

			const result = await syncManager.sync('bitrix24', 'company', 'import', options)

			res.json({
				success: result.success,
				data: result,
				message: result.success
					? 'Импорт компаний завершен: ' + result.created + ' создано, ' + result.updated + ' обновлено'
					: 'Импорт завершен с ошибками: ' + result.failed + ' ошибок',
			})
		} catch (error: any) {
			logger.error('[SyncManagerController] Ошибка импорта компаний:', error)
			res.status(500).json({
				success: false,
				message: 'Ошибка импорта компаний',
				error: error.message,
			})
		}
	}

	/**
	 * Импорт контактов из Bitrix24
	 * POST /api/sync-manager/import/contacts
	 */
	async importContacts(req: Request, res: Response): Promise<void> {
		try {
			const { options = {} } = req.body

			logger.info('[SyncManagerController] Импорт контактов из Bitrix24')

			const result = await syncManager.sync('bitrix24', 'contact', 'import', options)

			res.json({
				success: result.success,
				data: result,
				message: result.success
					? 'Импорт контактов завершен: ' + result.created + ' создано, ' + result.updated + ' обновлено'
					: 'Импорт завершен с ошибками: ' + result.failed + ' ошибок',
			})
		} catch (error: any) {
			logger.error('[SyncManagerController] Ошибка импорта контактов:', error)
			res.status(500).json({
				success: false,
				message: 'Ошибка импорта контактов',
				error: error.message,
			})
		}
	}

	/**
	 * Импорт номенклатуры из Bitrix24
	 * POST /api/sync-manager/import/nomenclature
	 */
	async importNomenclature(req: Request, res: Response): Promise<void> {
		try {
			const { options = {} } = req.body

			logger.info('[SyncManagerController] Импорт номенклатуры из Bitrix24')

			const result = await syncManager.sync('bitrix24', 'nomenclature', 'import', options)

			res.json({
				success: result.success,
				data: result,
				message: result.success
					? 'Импорт номенклатуры завершен: ' + result.created + ' создано, ' + result.updated + ' обновлено'
					: 'Импорт завершен с ошибками: ' + result.failed + ' ошибок',
			})
		} catch (error: any) {
			logger.error('[SyncManagerController] Ошибка импорта номенклатуры:', error)
			res.status(500).json({
				success: false,
				message: 'Ошибка импорта номенклатуры',
				error: error.message,
			})
		}
	}
}

export const syncManagerController = new SyncManagerController()
