import { Request, Response, NextFunction } from 'express';

export const adminMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const user = req.user;
  
  if (!user) {
    res.status(401).json({ message: 'Не авторизован' });
    return;
  }
  
  if (user.role !== 'admin') {
    res.status(403).json({ message: 'Доступ запрещен. Требуются права администратора' });
    return;
  }
  
  next();
}; 