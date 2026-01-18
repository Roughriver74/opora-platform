import { Router } from 'express'
import * as contactController from '../controllers/contactController'
import { authMiddleware, requireAdmin } from '../middleware/authMiddleware'

const router = Router()

// === Публичные маршруты (требуют авторизации, но не админ) ===

// Поиск контактов (для форм)
router.get('/search', authMiddleware, contactController.search)

// === Административные маршруты ===

// Получить статистику (до :id чтобы не перехватывался)
router.get('/stats', authMiddleware, requireAdmin, contactController.getStats)

// Получить контакты с ошибками синхронизации
router.get('/sync-errors', authMiddleware, requireAdmin, contactController.getSyncErrors)

// Получить контакты, ожидающие синхронизации
router.get('/pending-sync', authMiddleware, requireAdmin, contactController.getPendingSync)

// Найти по телефону
router.get('/by-phone/:phone', authMiddleware, contactController.getByPhone)

// Найти по email
router.get('/by-email/:email', authMiddleware, contactController.getByEmail)

// Получить контакты компании
router.get('/by-company/:companyId', authMiddleware, contactController.getByCompany)

// Получить основной контакт компании
router.get('/primary/:companyId', authMiddleware, contactController.getPrimaryByCompany)

// CRUD для контактов
router.get('/', authMiddleware, requireAdmin, contactController.getAll)
router.get('/:id', authMiddleware, contactController.getById)
router.post('/', authMiddleware, requireAdmin, contactController.create)
router.put('/:id', authMiddleware, requireAdmin, contactController.update)
router.delete('/:id', authMiddleware, requireAdmin, contactController.remove)

// Полное удаление (hard delete)
router.delete('/:id/hard', authMiddleware, requireAdmin, contactController.hardDelete)

// Установить основной контакт
router.post('/:id/set-primary', authMiddleware, requireAdmin, contactController.setPrimary)

export default router
