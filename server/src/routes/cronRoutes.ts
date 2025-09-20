import { Router } from 'express'
import { cronController } from '../controllers/cronController'
import { authMiddleware } from '../middleware/authMiddleware'
import { requireAdmin } from '../middleware/requireAdmin'

const router = Router()

// Все маршруты cron требуют аутентификации и админских прав
router.use(authMiddleware)
router.use(requireAdmin)

/**
 * @route GET /api/cron/jobs
 * @desc Получение списка cron-задач
 * @access Private
 */
router.get('/jobs', cronController.getCronJobs.bind(cronController))

/**
 * @route POST /api/cron/schedule
 * @desc Установка расписания синхронизации
 * @access Private
 */
router.post('/schedule', cronController.setSyncSchedule.bind(cronController))

/**
 * @route DELETE /api/cron/schedule
 * @desc Остановка cron-задач синхронизации
 * @access Private
 */
router.delete('/schedule', cronController.stopSyncSchedule.bind(cronController))

/**
 * @route GET /api/cron/status
 * @desc Получение статуса cron-сервиса
 * @access Private
 */
router.get('/status', cronController.getCronStatus.bind(cronController))

export default router

