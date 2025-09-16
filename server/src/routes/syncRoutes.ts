import { Router } from 'express'
import { syncController } from '../controllers/syncController'
import { authMiddleware } from '../middleware/authMiddleware'
import { requireAdmin } from '../middleware/requireAdmin'

const router = Router()

// Временно убираем аутентификацию для всех маршрутов синхронизации
router.get('/status', syncController.getStatus.bind(syncController))
router.post('/start', syncController.startSync.bind(syncController))
router.post('/schedule', syncController.setSchedule.bind(syncController))
router.post('/clear', syncController.clearData.bind(syncController))
router.get('/stats', syncController.getStats.bind(syncController))

// Все остальные маршруты требуют аутентификации и админских прав
router.use(authMiddleware)
router.use(requireAdmin)

/**
 * Все маршруты синхронизации временно без аутентификации для тестирования
 */

export default router
