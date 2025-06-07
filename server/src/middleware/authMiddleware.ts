import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import AdminToken from '../models/AdminToken';

// Расширяем интерфейс Request для добавления пользовательских свойств
declare global {
  namespace Express {
    interface Request {
      isAdmin?: boolean;
    }
  }
}

/**
 * Middleware для проверки JWT токена и определения прав администратора
 */
export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Получаем токен из заголовков Authorization
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    // Если токен не предоставлен, пропускаем запрос для публичных маршрутов
    if (!token) {
      req.isAdmin = false;
      return next();
    }

    // Проверяем, есть ли токен в базе данных (не отозван ли он)
    const tokenDoc = await AdminToken.findOne({ token });
    
    if (!tokenDoc) {
      req.isAdmin = false;
      return next();
    }

    // Проверяем JWT токен
    const secret = process.env.JWT_SECRET || 'default-jwt-secret-key-change-in-production';
    
    jwt.verify(token, secret, (err) => {
      if (err) {
        req.isAdmin = false;
        return next();
      }
      
      // Токен действителен, пользователь - администратор
      req.isAdmin = true;
      next();
    });
  } catch (error) {
    console.error('Ошибка в middleware авторизации:', error);
    req.isAdmin = false;
    next();
  }
};

/**
 * Middleware для проверки прав администратора
 * Используется после authMiddleware для защищенных маршрутов
 */
export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.isAdmin) {
    return res.status(401).json({ 
      success: false, 
      message: 'Требуются права администратора' 
    });
  }
  
  next();
};
