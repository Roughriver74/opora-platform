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
      const response = await axios.post(`${this.webhookUrl}crm.dealcategory.list`);
      return response.data;
    } catch (error) {
      console.error('Ошибка при получении категорий сделок из Битрикс24:', error);
      throw error;
    }
  }
}

export default new Bitrix24Service();
