import { Router } from 'express'
import * as formController from '../controllers/formController'
import { authMiddleware, requireAdmin } from '../middleware/authMiddleware'

const router = Router()

// Получение всех форм
router.get('/', formController.getAllForms)

// Создание новой формы
router.post('/', authMiddleware, requireAdmin, formController.createForm)

// Получение категорий сделок из Битрикс24
router.get('/bitrix/deal-categories', formController.getDealCategories)

// Получение статусов сделок из Битрикс24
router.get('/bitrix/deal-stages', formController.getDealStages)

// Тестирование подключения к Битрикс24
router.get(
	'/bitrix/test-connection',
	authMiddleware,
	requireAdmin,
	formController.testConnection
)

// Тестирование синхронизации с Битрикс24
router.post(
	'/bitrix/test-sync',
	authMiddleware,
	requireAdmin,
	formController.testSync
)

// Получение формы по ID
router.get('/:id', formController.getFormById)

// Обновление формы
router.put('/:id', authMiddleware, requireAdmin, formController.updateForm)

// Удаление формы
router.delete('/:id', authMiddleware, requireAdmin, formController.deleteForm)

// Обработка отправки формы (публичный endpoint)
router.post('/:id/submit', formController.submitForm)

export default router
