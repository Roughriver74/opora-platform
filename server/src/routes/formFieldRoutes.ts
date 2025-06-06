import { Router } from 'express';
import * as formFieldController from '../controllers/formFieldController';

const router = Router();

type RouteHandler = Parameters<typeof router.get>[1]; // Вспомогательный тип для обработчиков маршрутов

// Маршруты для управления полями формы
router.get('/', formFieldController.getAllFields as RouteHandler);
router.post('/', formFieldController.createField as RouteHandler);

// Битрикс маршруты - должны быть перед маршрутами с параметрами
// Получение полей из Битрикс24
router.get('/bitrix/fields', formFieldController.getBitrixFields as RouteHandler);

// Получение продуктов из каталога Битрикс24
router.get('/bitrix/products', formFieldController.getProductsList as RouteHandler);

// Маршруты с параметрами должны идти последними
router.get('/:id', formFieldController.getFieldById as RouteHandler);
router.put('/:id', formFieldController.updateField as RouteHandler);
router.delete('/:id', formFieldController.deleteField as RouteHandler);

export default router;
