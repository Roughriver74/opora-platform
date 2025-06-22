import express from 'express'
import * as settingsController from '../controllers/settingsController'
import { adminMiddleware } from '../middleware/adminMiddleware'
import { requireAuth } from '../middleware/authMiddleware'

const router = express.Router()

// Все роуты требуют авторизации
router.use(requireAuth)

// Получение настроек (доступно всем авторизованным пользователям)
router.get('/', settingsController.getAllSettings)
router.get('/category/:category', settingsController.getSettingsByCategory)
router.get('/:key', settingsController.getSetting)

// Изменение настроек (только для админов)
router.put('/:key', adminMiddleware, settingsController.updateSetting)
router.delete('/:key', adminMiddleware, settingsController.deleteSetting)

export default router
