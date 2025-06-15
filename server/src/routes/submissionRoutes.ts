import express from 'express'
import * as submissionController from '../controllers/submissionController'
import {
	authMiddleware,
	requireAuth,
	requireAdmin,
} from '../middleware/authMiddleware'
import { Request, Response } from 'express'

const router = express.Router()

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
