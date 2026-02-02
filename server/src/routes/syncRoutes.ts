import { Router } from 'express'
import { syncController } from '../controllers/syncController'
import { authMiddleware } from '../middleware/authMiddleware'
import { requireAdmin } from '../middleware/requireAdmin'

const router = Router()

// Все маршруты синхронизации требуют аутентификации и админских прав
router.use(authMiddleware)
router.use(requireAdmin)

router.get('/status', syncController.getStatus.bind(syncController))
router.post('/start', syncController.startSync.bind(syncController))
router.post('/schedule', syncController.setSchedule.bind(syncController))
router.post('/clear', syncController.clearData.bind(syncController))
router.get('/stats', syncController.getStats.bind(syncController))

// Новые маршруты для синхронизации с поддержкой Bitrix ID
router.post('/bitrix', syncController.syncBitrixToElastic.bind(syncController))
router.post(
	'/reindex-bitrix',
	syncController.reindexWithBitrixId.bind(syncController)
)

// Переиндексация только пропущенных заявок (быстрая починка)
router.post(
	'/reindex-missing',
	syncController.reindexMissingSubmissions.bind(syncController)
)

/**
 * Все маршруты синхронизации временно без аутентификации для тестирования
 */

export default router
