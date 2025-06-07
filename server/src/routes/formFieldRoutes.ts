import express from 'express';
import { Router } from 'express';
import { authMiddleware, requireAdmin } from '../middleware/authMiddleware';
import * as formFieldController from '../controllers/formFieldController';
import { Request, Response } from 'express';

const router = express.Router();

// Маршруты для управления полями формы
router.get('/', (req: Request, res: Response) => {
  formFieldController.getAllFields(req, res);
});

router.post('/', authMiddleware, requireAdmin, (req: Request, res: Response) => {
  formFieldController.createField(req, res);
});

// Битрикс маршруты - должны быть перед маршрутами с параметрами
// Получение полей из Битрикс24
router.get('/bitrix/fields', (req: Request, res: Response) => {
  formFieldController.getBitrixFields(req, res);
});

// Получение продуктов из каталога Битрикс24
router.get('/bitrix/products', (req: Request, res: Response) => {
  formFieldController.getProductsList(req, res);
});

// Маршруты с параметрами должны идти последними
router.get('/:id', (req: Request, res: Response) => {
  formFieldController.getFieldById(req, res);
});

router.put('/:id', authMiddleware, requireAdmin, (req: Request, res: Response) => {
  formFieldController.updateField(req, res);
});

router.delete('/:id', authMiddleware, requireAdmin, (req: Request, res: Response) => {
  formFieldController.deleteField(req, res);
});

export default router;
