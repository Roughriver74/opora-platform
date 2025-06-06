import api from './api';
import { FormField } from '../types';

// Сервис для работы с полями формы
export const FormFieldService = {
  // Получение всех полей
  getAllFields: async () => {
    const response = await api.get('/form-fields');
    return response.data;
  },

  // Получение поля по ID
  getFieldById: async (id: string) => {
    const response = await api.get(`/form-fields/${id}`);
    return response.data;
  },

  // Создание нового поля
  createField: async (fieldData: Omit<FormField, '_id'>) => {
    try {
      console.log('Отправка данных на сервер:', JSON.stringify(fieldData, null, 2));
      const response = await api.post('/form-fields', fieldData);
      console.log('Успешный ответ сервера:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('Ошибка при создании поля:', error);
      if (error.response) {
        // Сервер ответил с ошибкой
        console.error('Данные ответа:', error.response.data);
        console.error('Статус ответа:', error.response.status);
        console.error('Заголовки ответа:', error.response.headers);
      }
      throw error;
    }
  },

  // Обновление существующего поля
  updateField: async (id: string, fieldData: Partial<FormField>) => {
    const response = await api.put(`/form-fields/${id}`, fieldData);
    return response.data;
  },

  // Удаление поля
  deleteField: async (id: string) => {
    const response = await api.delete(`/form-fields/${id}`);
    return response.data;
  },

  // Получение полей из Битрикс24
  getBitrixFields: async () => {
    const response = await api.get('/form-fields/bitrix/fields');
    return response.data;
  },

  // Получение продуктов из каталога Битрикс24
  getProducts: async (query: string = '') => {
    const response = await api.get('/form-fields/bitrix/products', {
      params: { query }
    });
    return response.data;
  }
};
