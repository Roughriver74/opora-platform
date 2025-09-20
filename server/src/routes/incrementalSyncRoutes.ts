import { Router } from 'express'
import { incrementalSyncController } from '../controllers/incrementalSyncController'
import { authMiddleware } from '../middleware/authMiddleware'

const router = Router()

// Все маршруты требуют аутентификации
router.use(authMiddleware)

/**
 * @route GET /api/incremental-sync/status
 * @desc Получение статуса всех синхронизаций
 * @access Private
 */
router.get(
	'/status',
	incrementalSyncController.getSyncStatus.bind(incrementalSyncController)
)

/**
 * @route POST /api/incremental-sync/products
 * @desc Инкрементальная синхронизация продуктов
 * @access Private
 * @body { forceFullSync?: boolean, batchSize?: number, maxAgeHours?: number }
 */
router.post(
	'/products',
	incrementalSyncController.syncProducts.bind(incrementalSyncController)
)

/**
 * @route POST /api/incremental-sync/companies
 * @desc Инкрементальная синхронизация компаний
 * @access Private
 * @body { forceFullSync?: boolean, batchSize?: number, maxAgeHours?: number }
 */
router.post(
	'/companies',
	incrementalSyncController.syncCompanies.bind(incrementalSyncController)
)

/**
 * @route POST /api/incremental-sync/submissions
 * @desc Инкрементальная синхронизация заявок
 * @access Private
 * @body { forceFullSync?: boolean, batchSize?: number, maxAgeHours?: number }
 */
router.post(
	'/submissions',
	incrementalSyncController.syncSubmissions.bind(incrementalSyncController)
)

/**
 * @route POST /api/incremental-sync/all
 * @desc Полная инкрементальная синхронизация всех данных
 * @access Private
 * @body { forceFullSync?: boolean, batchSize?: number, maxAgeHours?: number }
 */
router.post(
	'/all',
	incrementalSyncController.syncAllData.bind(incrementalSyncController)
)

/**
 * @route GET /api/incremental-sync/stats
 * @desc Получение статистики индекса Elasticsearch
 * @access Private
 */
router.get(
	'/stats',
	incrementalSyncController.getIndexStats.bind(incrementalSyncController)
)

/**
 * @route POST /api/incremental-sync/initialize-alias
 * @desc Инициализация алиаса Elasticsearch
 * @access Private
 */
router.post(
	'/initialize-alias',
	incrementalSyncController.initializeAlias.bind(incrementalSyncController)
)

/**
 * @route POST /api/incremental-sync/refresh-index
 * @desc Принудительное обновление индекса
 * @access Private
 */
router.post(
	'/refresh-index',
	incrementalSyncController.refreshIndex.bind(incrementalSyncController)
)

/**
 * @route DELETE /api/incremental-sync/metadata/:entityType
 * @desc Очистка метаданных синхронизации для конкретного типа
 * @access Private
 * @param entityType - Тип сущности
 */
router.delete(
	'/metadata/:entityType',
	incrementalSyncController.clearSyncMetadata.bind(incrementalSyncController)
)

/**
 * @route DELETE /api/incremental-sync/metadata
 * @desc Очистка всех метаданных синхронизации
 * @access Private
 */
router.delete(
	'/metadata',
	incrementalSyncController.clearSyncMetadata.bind(incrementalSyncController)
)

export default router
