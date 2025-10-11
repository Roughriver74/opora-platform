import { Router } from 'express'
import {
	createPeriodSubmissions,
	getPeriodGroup,
	getPeriodSubmissions,
	cancelPeriodGroup,
	updatePeriodGroup,
} from '../controllers/periodSubmissionController'
import { authMiddleware } from '../middleware/authMiddleware'

const router = Router()

/**
 * POST /api/submissions/period
 * Создание периодических заявок
 * Доступ: authenticated users
 */
router.post('/', authMiddleware, createPeriodSubmissions)

/**
 * GET /api/submissions/period/:periodGroupId
 * Получение информации о группе периода
 * Доступ: authenticated users
 */
router.get('/:periodGroupId', authMiddleware, getPeriodGroup)

/**
 * GET /api/submissions/period/:periodGroupId/submissions
 * Получение всех заявок периода
 * Доступ: authenticated users
 */
router.get('/:periodGroupId/submissions', authMiddleware, getPeriodSubmissions)

/**
 * POST /api/submissions/period/:periodGroupId/cancel
 * Отмена всех заявок периода
 * Доступ: authenticated users (owner or admin)
 */
router.post('/:periodGroupId/cancel', authMiddleware, cancelPeriodGroup)

/**
 * PATCH /api/submissions/period/:periodGroupId
 * Обновление всех заявок периода
 * Доступ: authenticated users (owner or admin)
 */
router.patch('/:periodGroupId', authMiddleware, updatePeriodGroup)

export default router
