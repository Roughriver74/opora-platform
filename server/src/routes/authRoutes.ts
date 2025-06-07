import express from 'express';
import * as authController from '../controllers/authController';
import { authMiddleware, requireAdmin } from '../middleware/authMiddleware';
import { Request, Response } from 'express';

const router = express.Router();

// Авторизация администратора
router.post('/admin-login', (req: Request, res: Response) => {
  authController.adminLogin(req, res);
});

// Проверка токена
router.get('/verify-token', authMiddleware, (req: Request, res: Response) => {
  authController.verifyToken(req, res);
});

// Выход
router.post('/logout', authMiddleware, requireAdmin, (req: Request, res: Response) => {
  authController.logout(req, res);
});

export default router;
