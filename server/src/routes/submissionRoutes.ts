import express from 'express'
import * as submissionController from '../controllers/submissionController'
import { getOptimizedUserSubmissions } from '../controllers/optimizedSubmissionController'
import {
	authMiddleware,
	requireAuth,
	requireAdmin,
} from '../middleware/authMiddleware'
import { Request, Response } from 'express'

const router = express.Router()

// Публичный роут для обновления статуса по Битрикс ID (без авторизации)
// Используется для внешних интеграций
router.get('/update-status', (req: Request, res: Response) => {
	submissionController.updateStatusByBitrixId(req, res)
})

// Публичный роут для проверки поля UF_CRM_1750107484181 в Битрикс24
router.get('/check-field/:dealId', (req: Request, res: Response) => {
	submissionController.checkBitrixField(req, res)
})

// Публичный webhook для синхронизации заявки из Bitrix24
router.post('/sync-from-bitrix', (req: Request, res: Response) => {
	submissionController.syncSubmissionFromBitrix(req, res)
})

// Применяем middleware авторизации для всех роутов
router.use(authMiddleware)

// Маршрут для отправки формы (доступен всем авторизованным)
router.post('/submit', (req: Request, res: Response) => {
	submissionController.submitForm(req, res)
})

// Получение всех заявок (только для админов)
router.get('/', requireAdmin, (req: Request, res: Response) => {
	console.log(
		'📍 Маршрут / вызван, перенаправляем к submissionController.getAllSubmissions'
	)
	submissionController.getAllSubmissions(req, res)
})

// Получение заявок текущего пользователя (оптимизированная версия)
router.get('/my', requireAuth, getOptimizedUserSubmissions)

// Получение статусов из Битрикс24
router.get(
	'/bitrix/stages/:categoryId',
	requireAuth,
	(req: Request, res: Response) => {
		submissionController.getBitrixStages(req, res)
	}
)

// ====================================================================
// Sync API endpoints (DB-First архитектура)
// Важно: эти роуты должны быть ДО /:id, чтобы не перехватывались
// ====================================================================

// Получение статистики синхронизации (только админы)
router.get('/sync/stats', requireAdmin, (req: Request, res: Response) => {
	submissionController.getSyncStats(req, res)
})

// Повторная синхронизация неудачных заявок (только админы)
router.post('/sync/retry', requireAdmin, (req: Request, res: Response) => {
	submissionController.retrySyncForSubmissions(req, res)
})

// Синхронизация всех ожидающих заявок (только админы)
router.post('/sync/pending', requireAdmin, (req: Request, res: Response) => {
	submissionController.syncPendingSubmissions(req, res)
})

// Сброс статуса синхронизации для заявок (только админы)
router.post('/sync/reset', requireAdmin, (req: Request, res: Response) => {
	submissionController.resetSyncStatusForSubmissions(req, res)
})

// Полная синхронизация всех несинхронизированных заявок (только админы)
router.post('/sync/all', requireAdmin, (req: Request, res: Response) => {
	submissionController.syncAllUnsyncedSubmissions(req, res)
})

// Ручная синхронизация конкретной заявки с Bitrix24 (только админы)
router.post('/:id/sync', requireAdmin, (req: Request, res: Response) => {
	submissionController.manualSyncSubmission(req, res)
})

// Получение заявки по ID (должен быть последним, чтобы не перехватывать другие маршруты)
router.get('/:id', requireAuth, (req: Request, res: Response) => {
	submissionController.getSubmissionById(req, res)
})

// Получение заявки с актуальными данными из Битрикс24 для редактирования
router.get('/:id/edit', requireAuth, (req: Request, res: Response) => {
	submissionController.getSubmissionWithBitrixData(req, res)
})

// Получение данных полей формы для заявки
router.get('/:id/form-fields', requireAuth, (req: Request, res: Response) => {
	submissionController.getSubmissionFormFields(req, res)
})

// Копирование заявки
router.post('/:id/copy', requireAuth, (req: Request, res: Response) => {
	submissionController.copySubmission(req, res)
})

// Отмена заявки
router.post('/:id/cancel', requireAuth, (req: Request, res: Response) => {
	submissionController.cancelSubmission(req, res)
})

// Обновление статуса заявки
router.patch('/:id/status', requireAuth, (req: Request, res: Response) => {
	submissionController.updateSubmissionStatus(req, res)
})

// Обновление заявки
router.put('/:id', requireAuth, (req: Request, res: Response) => {
	submissionController.updateSubmission(req, res)
})

// Удаление заявки (только админы)
router.delete('/:id', requireAdmin, (req: Request, res: Response) => {
	submissionController.deleteSubmission(req, res)
})

export default router
