import bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;

/**
 * Утилиты для работы с хешированием паролей
 */
export class PasswordHashService {
  /**
   * Хеширование пароля
   */
  static async hashPassword(password: string): Promise<string> {
    try {
      const salt = await bcrypt.genSalt(SALT_ROUNDS);
      return await bcrypt.hash(password, salt);
    } catch (error) {
      console.error('Ошибка хеширования пароля:', error);
      throw new Error('Не удалось хешировать пароль');
    }
  }

  /**
   * Сравнение пароля с хешем
   */
  static async comparePassword(password: string, hash: string): Promise<boolean> {
    try {
      return await bcrypt.compare(password, hash);
    } catch (error) {
      console.error('Ошибка сравнения пароля:', error);
      return false;
    }
  }

  /**
   * Валидация силы пароля
   */
  static validatePassword(password: string): { isValid: boolean; message?: string } {
    if (!password) {
      return { isValid: false, message: 'Пароль не может быть пустым' };
    }

    if (password.length < 6) {
      return { isValid: false, message: 'Пароль должен содержать минимум 6 символов' };
    }

    if (password.length > 128) {
      return { isValid: false, message: 'Пароль слишком длинный (максимум 128 символов)' };
    }

    // Проверка на наличие хотя бы одной буквы и одной цифры
    const hasLetter = /[a-zA-Z]/.test(password);
    const hasNumber = /\d/.test(password);

    if (!hasLetter || !hasNumber) {
      return { 
        isValid: false, 
        message: 'Пароль должен содержать хотя бы одну букву и одну цифру' 
      };
    }

    return { isValid: true };
  }

  /**
   * Генерация случайного пароля
   */
  static generateRandomPassword(length: number = 12): string {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    
    return password;
  }
} 