import { Request, Response, NextFunction, RequestHandler as ExpressRequestHandler } from 'express';

declare global {
  namespace Express {
    // Добавляем поле isAdmin в объект Request
    interface Request {
      isAdmin?: boolean;
    }
  }

  // Типы для наших обработчиков маршрутов
  type RequestHandler = ExpressRequestHandler;
  
  // Тип для контроллеров, которые могут вернуть Response
  type ControllerFunction = (req: Request, res: Response, next?: NextFunction) => void | Promise<void> | any;
}

export {};
