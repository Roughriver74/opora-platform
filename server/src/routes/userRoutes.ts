import { Router } from 'express';
import * as userController from '../controllers/userController';
import { authMiddleware, requireAdmin, requireAuth } from '../middleware/authMiddleware';

const router = Router();

// Все роуты требуют авторизации
router.use(authMiddleware);

// Получение всех пользователей с пагинацией и фильтрацией (только для админов)
router.get('/', requireAdmin, userController.getAllUsers);

// Получение пользователя по ID (для всех авторизованных)
router.get('/:id', requireAuth, userController.getUserById);

// Создание нового пользователя (только для админов)
router.post('/', requireAdmin, userController.createUser);

// Обновление пользователя (только для админов)
router.put('/:id', requireAdmin, userController.updateUser);

// Удаление пользователя (только для админов)
router.delete('/:id', requireAdmin, userController.deleteUser);

// Изменение статуса пользователя (только для админов)
router.patch('/:id/status', requireAdmin, userController.updateUserStatus);

// Синхронизация с Битрикс24 (только для админов)
router.post('/sync/bitrix', requireAdmin, userController.syncWithBitrix);

// Обновление настроек пользователя (пользователь может изменять только свои настройки)
router.put('/:userId/settings', requireAuth, userController.updateUserSettings);

export default router; 