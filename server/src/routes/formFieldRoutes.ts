import { Router } from 'express';
import * as formFieldController from '../controllers/formFieldController';
import { authMiddleware, requireAdmin } from '../middleware/authMiddleware';

const router = Router();

// Получение всех полей
router.get('/', formFieldController.getAllFields);

router.post('/', authMiddleware, requireAdmin, formFieldController.createField);

// Битрикс маршруты - должны быть перед маршрутами с параметрами
// Получение полей из Битрикс24
router.get('/bitrix/fields', formFieldController.getBitrixFields);

// Получение продуктов из каталога Битрикс24
router.get('/bitrix/products', formFieldController.getProductsList);

// Маршруты с параметрами должны идти последними
router.get('/:id', formFieldController.getFieldById);

router.put('/:id', authMiddleware, requireAdmin, formFieldController.updateField);

router.delete('/:id', authMiddleware, requireAdmin, formFieldController.deleteField);

export default router;
