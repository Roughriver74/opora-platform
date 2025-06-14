import { useState, useEffect, useCallback } from 'react';
import { SelectChangeEvent } from '@mui/material';
import { apiService } from '../../../../../services/apiService';
import { User, CreateUserData, UpdateUserData } from '../../../../../types/user';

interface FormData {
  email: string;
  password: string;
  role: 'admin' | 'user';
  firstName: string;
  lastName: string;
  phone: string;
  bitrix_id: string;
  status: 'active' | 'inactive';
}

interface FormErrors {
  email?: string;
  password?: string;
  role?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  bitrix_id?: string;
}

export interface UseUserFormReturn {
  formData: FormData;
  errors: FormErrors;
  loading: boolean;
  isValid: boolean;
  handleInputChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  handleSelectChange: (event: SelectChangeEvent) => void;
  handleSwitchChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  handleSubmit: (event: React.FormEvent) => void;
  generatePassword: () => void;
}

export const useUserForm = (
  user: User | null | undefined,
  onSave: (user: User) => void,
  onClose: () => void
): UseUserFormReturn => {
  const isEditing = Boolean(user);

  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: '',
    role: 'user',
    firstName: '',
    lastName: '',
    phone: '',
    bitrix_id: '',
    status: 'active'
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);

  // Заполнение формы при редактировании
  useEffect(() => {
    if (user) {
      setFormData({
        email: user.email || '',
        password: '', // Пароль всегда пустой при редактировании
        role: user.role || 'user',
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        phone: user.phone || '',
        bitrix_id: user.bitrix_id || '',
        status: user.status || 'active'
      });
    } else {
      // Сброс формы для нового пользователя
      setFormData({
        email: '',
        password: '',
        role: 'user',
        firstName: '',
        lastName: '',
        phone: '',
        bitrix_id: '',
        status: 'active'
      });
    }
    setErrors({});
  }, [user]);

  // Валидация формы
  const validateForm = useCallback((): boolean => {
    const newErrors: FormErrors = {};

    // Email
    if (!formData.email) {
      newErrors.email = 'Email обязателен';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Неверный формат email';
    }

    // Пароль (обязателен только при создании)
    if (!isEditing && !formData.password) {
      newErrors.password = 'Пароль обязателен';
    } else if (formData.password && formData.password.length < 6) {
      newErrors.password = 'Пароль должен содержать минимум 6 символов';
    } else if (formData.password && !/(?=.*[a-zA-Z])(?=.*\d)/.test(formData.password)) {
      newErrors.password = 'Пароль должен содержать буквы и цифры';
    }

    // Телефон (опциональная валидация)
    if (formData.phone && !/^\+?[\d\s\-\(\)]+$/.test(formData.phone)) {
      newErrors.phone = 'Неверный формат телефона';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData, isEditing]);

  // Обработчики изменения полей
  const handleInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Очищаем ошибку для изменившегося поля
    if (errors[name as keyof FormErrors]) {
      setErrors(prev => ({
        ...prev,
        [name]: undefined
      }));
    }
  }, [errors]);

  const handleSelectChange = useCallback((event: SelectChangeEvent) => {
    const { name, value } = event.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Очищаем ошибку для изменившегося поля
    if (errors[name as keyof FormErrors]) {
      setErrors(prev => ({
        ...prev,
        [name]: undefined
      }));
    }
  }, [errors]);

  const handleSwitchChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const { checked } = event.target;
    setFormData(prev => ({
      ...prev,
      status: checked ? 'active' : 'inactive'
    }));
  }, []);

  // Генерация пароля
  const generatePassword = useCallback(() => {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let password = '';
    
    // Добавляем хотя бы одну букву и одну цифру
    password += charset.charAt(Math.floor(Math.random() * 26)); // строчная буква
    password += charset.charAt(Math.floor(Math.random() * 26) + 26); // заглавная буква
    password += charset.charAt(Math.floor(Math.random() * 10) + 52); // цифра
    
    // Добавляем остальные символы
    for (let i = password.length; i < 12; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    
    // Перемешиваем пароль
    password = password.split('').sort(() => Math.random() - 0.5).join('');
    
    setFormData(prev => ({
      ...prev,
      password
    }));

    // Очищаем ошибку пароля
    if (errors.password) {
      setErrors(prev => ({
        ...prev,
        password: undefined
      }));
    }
  }, [errors.password]);

  // Отправка формы
  const handleSubmit = useCallback(async (event: React.FormEvent) => {
    event.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      if (isEditing && user) {
        // Обновление пользователя
        const updateData: UpdateUserData = {
          email: formData.email,
          role: formData.role,
          firstName: formData.firstName || undefined,
          lastName: formData.lastName || undefined,
          phone: formData.phone || undefined,
          bitrix_id: formData.bitrix_id || undefined,
          status: formData.status
        };

        // Добавляем пароль только если он указан
        if (formData.password) {
          updateData.password = formData.password;
        }

        const response = await apiService.put(`/users/${user._id}`, updateData);
        
        if (response.data.success) {
          onSave(response.data.data);
          onClose();
        } else {
          setErrors({ email: response.data.message || 'Ошибка обновления пользователя' });
        }
      } else {
        // Создание нового пользователя
        const createData: CreateUserData = {
          email: formData.email,
          password: formData.password,
          role: formData.role,
          firstName: formData.firstName || undefined,
          lastName: formData.lastName || undefined,
          phone: formData.phone || undefined,
          bitrix_id: formData.bitrix_id || undefined
        };

        const response = await apiService.post('/users', createData);
        
        if (response.data.success) {
          onSave(response.data.data);
          onClose();
        } else {
          setErrors({ email: response.data.message || 'Ошибка создания пользователя' });
        }
      }
    } catch (error: any) {
      console.error('Ошибка сохранения пользователя:', error);
      setErrors({ 
        email: error.response?.data?.message || 'Ошибка сохранения пользователя' 
      });
    } finally {
      setLoading(false);
    }
  }, [formData, validateForm, isEditing, user, onSave, onClose]);

  // Проверка валидности формы
  const isValid = Boolean(formData.email) && 
    (!isEditing ? Boolean(formData.password) : true) &&
    Object.keys(errors).length === 0;

  return {
    formData,
    errors,
    loading,
    isValid,
    handleInputChange,
    handleSelectChange,
    handleSwitchChange,
    handleSubmit,
    generatePassword
  };
}; 