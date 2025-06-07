import express from 'express';
import * as formController from '../controllers/formController';
import { authMiddleware, requireAdmin } from '../middleware/authMiddleware';
import { Request, Response, NextFunction } from 'express';

const router = express.Router();

// Получение категорий сделок из Битрикс24 - должен быть перед маршрутами с параметрами
router.get('/bitrix/deal-categories', (req: Request, res: Response) => {
  formController.getDealCategories(req, res);
});

// Маршруты для управления формами
router.get('/', (req: Request, res: Response) => {
  formController.getAllForms(req, res);
});

router.post('/', authMiddleware, requireAdmin, (req: Request, res: Response) => {
  formController.createForm(req, res);
});

// Маршруты с параметрами - должны быть последними
router.get('/:id', (req: Request, res: Response) => {
  formController.getFormById(req, res);
});

router.put('/:id', authMiddleware, requireAdmin, (req: Request, res: Response) => {
  formController.updateForm(req, res);
});

router.delete('/:id', authMiddleware, requireAdmin, (req: Request, res: Response) => {
  formController.deleteForm(req, res);
});

export default router;
