import { Request, Response, NextFunction } from 'express';
import { jwtService, TokenPayload } from '../services/jwtService';

// Middleware для опциональной авторизации
// Если токен есть - проверяет и устанавливает req.user
// Если токена нет - просто пропускает дальше
export const optionalAuthMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // Нет токена - продолжаем как анонимный пользователь
      return next();
    }

    const token = authHeader.substring(7); // Убираем 'Bearer '
    
    if (!token) {
      // Пустой токен - продолжаем как анонимный пользователь
      return next();
    }

    try {
      // Пытаемся верифицировать токен через jwtService
      const tokenData: TokenPayload | null = await jwtService.verifyToken(token);
      
      if (!tokenData || tokenData.type !== 'access') {
        return next();
      }

      // Устанавливаем пользователя
      req.user = {
        id: tokenData.id,
        role: tokenData.role,
        isAdmin: tokenData.role === 'admin',
        isUser: tokenData.role === 'user',
        tokenType: tokenData.type
      };
      
      next();
      
    } catch (jwtError) {
      // Ошибка декодирования токена - продолжаем как анонимный пользователь
      next();
    }
    
  } catch (error) {
    // Любая другая ошибка - продолжаем как анонимный пользователь
    next();
  }
}; 