import express from 'express'
import { authMiddleware } from '../middleware/authMiddleware'
import { 
	getOptimizedSubmissions,
	getOptimizedUserSubmissions,
	getSubmissionStats,
	updateDenormalizedData
} from '../controllers/optimizedSubmissionController'

const router = express.Router()

// Оптимизированные маршруты для заявок
router.get('/optimized', authMiddleware, getOptimizedSubmissions) // Все заявки (для админов)
router.get('/optimized/my', authMiddleware, getOptimizedUserSubmissions) // Заявки пользователя
router.get('/optimized/stats', authMiddleware, getSubmissionStats) // Статистика
router.post('/optimized/update-denormalized', authMiddleware, updateDenormalizedData) // Обновление денормализованных данных

export default router