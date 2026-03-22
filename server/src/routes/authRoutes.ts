import { Router } from 'express'
import * as authController from '../controllers/authController'
import { authMiddleware, requireAdmin } from '../middleware/authMiddleware'

const router = Router()

// Авторизация админа
router.post('/admin-login', authController.adminLogin)

// Авторизация пользователя
router.post('/user-login', authController.userLogin)

// Универсальный маршрут для авторизации (перенаправляет на user-login)
router.post('/login', authController.userLogin)

// Проверка текущего состояния авторизации
router.get('/check', authMiddleware, authController.verifyToken)

// Обновление токена
router.post('/refresh', authController.refreshToken)

// Выход
router.post('/logout', authMiddleware, requireAdmin, authController.logout)

// Мультитенант: выбор организации
router.post('/select-organization', authMiddleware, authController.selectOrganization)

// Мультитенант: мои организации
router.get('/organizations', authMiddleware, authController.getMyOrganizations)

export default router
