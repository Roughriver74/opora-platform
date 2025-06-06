import { Router } from 'express';
import * as submissionController from '../controllers/submissionController';

const router = Router();

// Вспомогательный тип для обработчиков маршрутов
type RouteHandler = Parameters<typeof router.get>[1];

// Маршрут для отправки формы
router.post('/submit', submissionController.submitForm as RouteHandler);

export default router;
