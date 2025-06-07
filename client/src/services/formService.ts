import api from './api';
import { Form } from '../types';

// Сервис для работы с формами
export const FormService = {
  // Получение всех форм
  getAllForms: async () => {
    const response = await api.get('/forms');
    return response.data;
  },

  // Получение формы по ID
  getFormById: async (id: string) => {
    const response = await api.get(`/forms/${id}`);
    return response.data;
  },

  // Создание новой формы
  createForm: async (formData: Omit<Form, '_id'>) => {
    const response = await api.post('/forms', formData);
    return response.data;
  },

  // Обновление существующей формы
  updateForm: async (id: string, formData: Partial<Form>) => {
    const response = await api.put(`/forms/${id}`, formData);
    return response.data;
  },

  // Удаление формы
  deleteForm: async (id: string) => {
    const response = await api.delete(`/forms/${id}`);
    return response.data;
  },

  // Получение категорий сделок из Битрикс24
  getDealCategories: async () => {
    const response = await api.get('/api/forms/bitrix/deal-categories');
    console.log('Fetching deal categories from API');
    return response.data;
  }
};
