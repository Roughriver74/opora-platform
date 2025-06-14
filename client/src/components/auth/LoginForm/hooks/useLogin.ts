import { useState, useCallback } from 'react';
import { useAuth } from '../../../../contexts/auth';
import { LoginCredentials } from '../../../../contexts/auth/types';
import { validatePassword } from '../validation';

export interface UseLoginReturn {
  email: string;
  password: string;
  isLoading: boolean;
  error: string | null;
  validationErrors: Record<string, string>;
  isFormValid: boolean;
  handleEmailChange: (value: string) => void;
  handlePasswordChange: (value: string) => void;
  handleSubmit: () => Promise<void>;
  clearError: () => void;
}

export const useLogin = (): UseLoginReturn => {
  const { login, error: authError, isLoading: authLoading, clearError: clearAuthError } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [localError, setLocalError] = useState<string | null>(null);

  // Валидация email
  const validateEmail = (email: string): string | null => {
    if (!email.trim()) {
      return 'Email обязателен';
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return 'Неверный формат email';
    }
    return null;
  };

  // Валидация формы
  const validateForm = useCallback((): boolean => {
    const errors: Record<string, string> = {};
    
    const emailError = validateEmail(email);
    if (emailError) {
      errors.email = emailError;
    }
    
    const passwordError = validatePassword(password);
    if (passwordError) {
      errors.password = passwordError;
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  }, [email, password]);

  // Обработчик изменения email
  const handleEmailChange = useCallback((value: string): void => {
    setEmail(value);
    
    // Очищаем ошибки при изменении поля
    if (validationErrors.email) {
      setValidationErrors(prev => ({
        ...prev,
        email: ''
      }));
    }
    
    if (localError || authError) {
      setLocalError(null);
      clearAuthError();
    }
  }, [validationErrors.email, localError, authError, clearAuthError]);

  // Обработчик изменения пароля
  const handlePasswordChange = useCallback((value: string): void => {
    setPassword(value);
    
    // Очищаем ошибки при изменении поля
    if (validationErrors.password) {
      setValidationErrors(prev => ({
        ...prev,
        password: ''
      }));
    }
    
    if (localError || authError) {
      setLocalError(null);
      clearAuthError();
    }
  }, [validationErrors.password, localError, authError, clearAuthError]);

  // Обработчик отправки формы
  const handleSubmit = useCallback(async (): Promise<void> => {
    if (!validateForm()) {
      return;
    }

    const credentials: LoginCredentials = {
      email: email.trim(),
      password: password.trim()
    };

    try {
      const success = await login(credentials);
      
      if (!success) {
        setLocalError('Неверный пароль');
      }
    } catch (error) {
      console.error('Ошибка при входе:', error);
      setLocalError('Произошла ошибка. Попробуйте снова.');
    }
  }, [password, validateForm, login]);

  // Очистка ошибок
  const clearError = useCallback((): void => {
    setLocalError(null);
    clearAuthError();
    setValidationErrors({});
  }, [clearAuthError]);

  // Проверка валидности формы
  const isFormValid = email.trim().length > 0 && password.trim().length > 0 && Object.keys(validationErrors).length === 0;

  return {
    email,
    password,
    isLoading: authLoading,
    error: localError || authError,
    validationErrors,
    isFormValid,
    handleEmailChange,
    handlePasswordChange,
    handleSubmit,
    clearError
  };
};
