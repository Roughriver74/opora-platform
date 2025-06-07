import { Router } from 'express';
import * as authController from '../controllers/authController';
import { authMiddleware, requireAdmin } from '../middleware/authMiddleware';

const router = Router();

// Авторизация админа
router.post('/admin-login', authController.adminLogin);

// Проверка текущего состояния авторизации
router.get('/check', authMiddleware, authController.verifyToken);

// Выход
router.post('/logout', authMiddleware, requireAdmin, authController.logout);

export default router;
