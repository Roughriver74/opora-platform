import { Router } from 'express';
import * as formController from '../controllers/formController';

const router = Router();

type RouteHandler = Parameters<typeof router.get>[1]; // Вспомогательный тип для обработчиков маршрутов

// Получение категорий сделок из Битрикс24 - должен быть перед маршрутами с параметрами
router.get('/bitrix/deal-categories', formController.getDealCategories as RouteHandler);

// Маршруты для управления формами
router.get('/', formController.getAllForms as RouteHandler);
router.post('/', formController.createForm as RouteHandler);

// Маршруты с параметрами - должны быть последними
router.get('/:id', formController.getFormById as RouteHandler);
router.put('/:id', formController.updateForm as RouteHandler);
router.delete('/:id', formController.deleteForm as RouteHandler);

export default router;
