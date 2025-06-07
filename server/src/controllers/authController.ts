import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import AdminToken from '../models/AdminToken';

// Время жизни токена - 7 дней
const TOKEN_EXPIRY = '7d';

/**
 * Аутентификация администратора
 */
export const adminLogin = async (req: Request, res: Response) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Пароль обязателен' 
      });
    }

    // Получаем пароль из переменных окружения
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminPassword) {
      console.error('ADMIN_PASSWORD не установлен в переменных окружения');
      return res.status(500).json({ 
        success: false, 
        message: 'Внутренняя ошибка сервера' 
      });
    }

    // Проверяем пароль
    if (password !== adminPassword) {
      return res.status(401).json({ 
        success: false, 
        message: 'Неверный пароль' 
      });
    }

    // Создаем JWT токен
    const secret = process.env.JWT_SECRET || 'default-jwt-secret-key-change-in-production';
    const token = jwt.sign({}, secret, { expiresIn: TOKEN_EXPIRY });

    // Сохраняем токен в базе данных для возможности отзыва
    await AdminToken.create({ token });

    res.json({
      success: true,
      token,
      expiresIn: TOKEN_EXPIRY
    });
  } catch (error) {
    console.error('Ошибка аутентификации:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Внутренняя ошибка сервера' 
    });
  }
};

/**
 * Проверка валидности токена
 */
export const verifyToken = async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'Токен отсутствует' 
      });
    }

    // Проверяем токен в базе данных
    const tokenDoc = await AdminToken.findOne({ token });
    
    if (!tokenDoc) {
      return res.status(401).json({ 
        success: false, 
        message: 'Токен недействителен или отозван' 
      });
    }

    const secret = process.env.JWT_SECRET || 'default-jwt-secret-key-change-in-production';
    
    jwt.verify(token, secret, (err: jwt.VerifyErrors | null) => {
      if (err) {
        return res.status(401).json({ 
          success: false, 
          message: 'Токен недействителен' 
        });
      }
      
      res.json({ 
        success: true, 
        message: 'Токен действителен' 
      });
    });
  } catch (error) {
    console.error('Ошибка проверки токена:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Внутренняя ошибка сервера' 
    });
  }
};

/**
 * Logout - отзыв токена
 */
export const logout = async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (token) {
      // Удаляем токен из базы данных
      await AdminToken.deleteOne({ token });
    }
    
    res.json({ 
      success: true, 
      message: 'Выход выполнен успешно' 
    });
  } catch (error) {
    console.error('Ошибка при выходе:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Внутренняя ошибка сервера' 
    });
  }
};
