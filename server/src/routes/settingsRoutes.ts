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

// Bitrix24 специфичные endpoints
router.get('/bitrix24/config', settingsController.getBitrix24Config)
router.post('/bitrix24/test-connection', settingsController.testBitrix24Connection)
router.post('/bitrix24/reload', adminMiddleware, settingsController.reloadBitrix24Integration)

// Изменение настроек (только для админов)
router.put('/:key', adminMiddleware, settingsController.updateSetting)
router.delete('/:key', adminMiddleware, settingsController.deleteSetting)

export default router
