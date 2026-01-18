import { Router } from 'express'
import * as companyController from '../controllers/companyController'
import { authMiddleware, requireAdmin } from '../middleware/authMiddleware'

const router = Router()

// === Публичные маршруты (требуют авторизации, но не админ) ===

// Поиск компаний (для форм)
router.get('/search', authMiddleware, companyController.search)

// === Административные маршруты ===

// Получить статистику (до :id чтобы не перехватывался)
router.get('/stats', authMiddleware, requireAdmin, companyController.getStats)

// Получить компании с ошибками синхронизации
router.get('/sync-errors', authMiddleware, requireAdmin, companyController.getSyncErrors)

// Получить компании, ожидающие синхронизации
router.get('/pending-sync', authMiddleware, requireAdmin, companyController.getPendingSync)

// Найти по ИНН
router.get('/by-inn/:inn', authMiddleware, companyController.getByInn)

// CRUD для компаний
router.get('/', authMiddleware, requireAdmin, companyController.getAll)
router.get('/:id', authMiddleware, companyController.getById)
router.post('/', authMiddleware, requireAdmin, companyController.create)
router.put('/:id', authMiddleware, requireAdmin, companyController.update)
router.delete('/:id', authMiddleware, requireAdmin, companyController.remove)

// Полное удаление (hard delete)
router.delete('/:id/hard', authMiddleware, requireAdmin, companyController.hardDelete)

export default router
