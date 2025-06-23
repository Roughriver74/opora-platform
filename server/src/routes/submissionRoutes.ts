import express from 'express'
import * as submissionController from '../controllers/submissionController'
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

// Применяем middleware авторизации для всех роутов
router.use(authMiddleware)

// Маршрут для отправки формы (доступен всем авторизованным)
router.post('/submit', (req: Request, res: Response) => {
	submissionController.submitForm(req, res)
})

// Получение всех заявок (только для админов)
router.get('/', requireAdmin, (req: Request, res: Response) => {
	submissionController.getAllSubmissions(req, res)
})

// Получение заявок текущего пользователя
router.get('/my', requireAuth, (req: Request, res: Response) => {
	submissionController.getMySubmissions(req, res)
})

// Получение заявки по ID
router.get('/:id', requireAuth, (req: Request, res: Response) => {
	submissionController.getSubmissionById(req, res)
})

// Получение заявки с актуальными данными из Битрикс24 для редактирования
router.get('/:id/edit', requireAuth, (req: Request, res: Response) => {
	console.log(`[ROUTE EDIT] GET /:id/edit вызван для заявки ${req.params.id}`)
	console.log(`[ROUTE EDIT] Пользователь: ${req.user?.id}`)
	submissionController.getSubmissionWithBitrixData(req, res)
})

// Копирование заявки
router.post('/:id/copy', requireAuth, (req: Request, res: Response) => {
	console.log(`[ROUTE COPY] POST /:id/copy вызван для заявки ${req.params.id}`)
	console.log(`[ROUTE COPY] Пользователь: ${req.user?.id}`)
	submissionController.copySubmission(req, res)
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

// Получение статусов из Битрикс24
router.get(
	'/bitrix/stages/:categoryId',
	requireAuth,
	(req: Request, res: Response) => {
		submissionController.getBitrixStages(req, res)
	}
)

export default router
