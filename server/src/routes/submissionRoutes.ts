import express from 'express';
import * as submissionController from '../controllers/submissionController';
import { Request, Response } from 'express';

const router = express.Router();

// Маршрут для отправки формы
router.post('/submit', (req: Request, res: Response) => {
  submissionController.submitForm(req, res);
});

export default router;
