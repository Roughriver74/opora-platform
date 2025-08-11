import { Router } from 'express'
import * as syncController from '../controllers/syncController'
import { requireAdmin } from '../middleware/authMiddleware'

const router = Router()

// Синхронизация пользователей из Bitrix24 (только для админов)
router.post('/users', requireAdmin, syncController.syncUsers)

// Статистика пользователей
router.get('/users/stats', requireAdmin, syncController.getUsersStats)

export default router