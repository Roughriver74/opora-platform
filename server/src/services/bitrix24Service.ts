import axios from 'axios';
import config from '../config/config';

class Bitrix24Service {
  private webhookUrl: string;

  constructor() {
    this.webhookUrl = config.bitrix24WebhookUrl;
  }

  /**
   * Получение всех полей для сделок
   */
  async getDealFields() {
    try {
      const response = await axios.post(`${this.webhookUrl}crm.deal.fields`);
      return response.data;
    } catch (error) {
      console.error('Ошибка при получении полей сделки из Битрикс24:', error);
      throw error;
    }
  }

  /**
   * Получение номенклатуры из каталога товаров
   */
  async getProducts(query = '', limit = 50) {
    try {
      console.log(`Поиск продуктов в Битрикс24 по запросу: '${query}'`);
      console.log('Вебхук URL:', this.webhookUrl);
      
      // Формирование фильтра для поиска по имени товара, если указан query
      // Исправляем формат фильтра - в Bitrix24 API %NAME означает "содержит"
      const filter = query ? { 'NAME': `%${query}%` } : {};
      
      console.log('Данные запроса:', {
        filter,
        select: ['ID', 'NAME', 'PRICE', 'CURRENCY_ID', 'DESCRIPTION'],
        start: 0,
        order: { NAME: 'ASC' },
      });
      
      const response = await axios.post(`${this.webhookUrl}crm.product.list`, {
        filter,
        select: ['ID', 'NAME', 'PRICE', 'CURRENCY_ID', 'DESCRIPTION'],
        start: 0,
        limit: parseInt(limit.toString()),
        order: { NAME: 'ASC' },
      });
      
      console.log('Ответ от Bitrix24:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('Ошибка при получении товаров из Битрикс24:', error.message);
      if (error.response) {
        console.error('Ответ сервера:', error.response.data);
      }
      throw error;
    }
  }

  /**
   * Создание сделки в Битрикс24
   */
  async createDeal(dealData: any) {
    try {
      const response = await axios.post(`${this.webhookUrl}crm.deal.add`, {
        fields: dealData,
        params: { REGISTER_SONET_EVENT: 'Y' }
      });
      
      return response.data;
    } catch (error) {
      console.error('Ошибка при создании сделки в Битрикс24:', error);
      throw error;
    }
  }

  /**
   * Получение справочников (для выпадающих списков)
   */
  async getStatusList(entityId: string) {
    try {
      const response = await axios.post(`${this.webhookUrl}crm.status.list`, {
        filter: { ENTITY_ID: entityId }
      });
      
      return response.data;
    } catch (error) {
      console.error('Ошибка при получении справочника из Битрикс24:', error);
      throw error;
    }
  }

  /**
   * Получение доступных категорий сделок
   */
  async getDealCategories() {
    try {
      console.log('Запрос категорий сделок из Битрикс24 по адресу:', `${this.webhookUrl}crm.category.list`);
      
      // Исправленный метод для получения категорий сделок
      const response = await axios.post(`${this.webhookUrl}crm.category.list`, {
        entityTypeId: 2 // 2 - тип сущности для сделок в Bitrix24
      });
      
      console.log('Получен ответ от Bitrix24:', response.data);
      return response.data;
    } catch (error) {
      console.error('Ошибка при получении категорий сделок из Битрикс24:', error);
      
      // Пробуем альтернативный метод, если первый не сработал
      try {
        console.log('Пробуем альтернативный метод:', `${this.webhookUrl}crm.dealcategory.list`);
        const fallbackResponse = await axios.post(`${this.webhookUrl}crm.dealcategory.list`);
        console.log('Получен ответ от альтернативного метода:', fallbackResponse.data);
        return fallbackResponse.data;
      } catch (fallbackError) {
        console.error('Ошибка при использовании альтернативного метода:', fallbackError);
        
        // Если оба метода не сработали, возвращаем пустые категории
        return { result: [] };
      }
    }
  }
}

export default new Bitrix24Service();
