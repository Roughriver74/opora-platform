/**
 * Валидация пароля для формы входа
 */
export const validatePassword = (password: string): string | null => {
  if (!password || password.trim().length === 0) {
    return 'Пароль обязателен для заполнения';
  }

  if (password.length < 3) {
    return 'Пароль должен содержать минимум 3 символа';
  }

  if (password.length > 100) {
    return 'Пароль слишком длинный (максимум 100 символов)';
  }

  return null;
};

/**
 * Валидация всей формы входа
 */
export const validateLoginForm = (password: string): Record<string, string> => {
  const errors: Record<string, string> = {};

  const passwordError = validatePassword(password);
  if (passwordError) {
    errors.password = passwordError;
  }

  return errors;
};
