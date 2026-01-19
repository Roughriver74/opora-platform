import { Router } from 'express'
import * as apiTokenController from '../controllers/apiTokenController'
import { authMiddleware, requireAdmin } from '../middleware/authMiddleware'

const router = Router()

/**
 * @swagger
 * tags:
 *   name: API Tokens
 *   description: Управление API токенами для внешних систем
 */

// Все маршруты требуют авторизации и прав администратора
router.use(authMiddleware)
router.use(requireAdmin)

// Генерация нового токена
router.post('/generate', apiTokenController.generateToken)

// Список всех токенов
router.get('/', apiTokenController.listTokens)

// Отзыв токена
router.delete('/:tokenId', apiTokenController.revokeToken)

export default router
