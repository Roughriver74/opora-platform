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
   * Получение списка пользовательских полей для сделок
   */
  async getUserFields() {
    try {
      console.log('Запрос пользовательских полей для сделок из Битрикс24');
      const response = await axios.post(`${this.webhookUrl}crm.deal.userfield.list`);
      
      console.log('Получены пользовательские поля:', response.data);
      return response.data;
    } catch (error) {
      console.error('Ошибка при получении пользовательских полей из Битрикс24:', error);
      throw error;
    }
  }

  /**
   * Получение значений для пользовательского поля типа enumeration (выпадающий список)
   */
  async getEnumFieldValues(fieldIdentifier: string) {
    try {
      console.log(`Запрос значений для поля ${fieldIdentifier} из Битрикс24`);
      
      // Получаем все пользовательские поля
      const userFieldsResponse = await this.getUserFields();
      
      if (!userFieldsResponse?.result) {
        throw new Error('Не удалось получить пользовательские поля');
      }
      
      // Ищем поле по FIELD_NAME или ID
      const targetField = userFieldsResponse.result.find((field: any) => 
        field.FIELD_NAME === fieldIdentifier || field.ID === fieldIdentifier
      );
      
      if (!targetField) {
        throw new Error(`Поле ${fieldIdentifier} не найдено`);
      }
      
      console.log(`Найдено поле:`, targetField);
      
      // Проверяем, что это поле типа enumeration
      if (targetField.USER_TYPE_ID !== 'enumeration') {
        throw new Error(`Поле ${fieldIdentifier} не является полем типа enumeration (тип: ${targetField.USER_TYPE_ID})`);
      }
      
      // Извлекаем значения из свойства LIST (не SETTINGS.LIST!)
      const enumValues = [];
      if (targetField.LIST && Array.isArray(targetField.LIST)) {
        targetField.LIST.forEach((item: any) => {
          enumValues.push({
            ID: item.ID,
            VALUE: item.VALUE,
            SORT: item.SORT || '100'
          });
        });
      }
      
      console.log(`Извлечено ${enumValues.length} значений для поля ${fieldIdentifier}:`, enumValues);
      
      // Возвращаем в том же формате, что ожидает фронтенд
      return {
        result: enumValues,
        total: enumValues.length
      };
      
    } catch (error) {
      console.error(`Ошибка при получении значений поля ${fieldIdentifier} из Битрикс24:`, error);
      throw error;
    }
  }

  /**
   * Отладочный метод для исследования структуры полей и доступных методов
   */
  async debugFieldStructure() {
    try {
      console.log('=== ОТЛАДКА: Исследование структуры полей ===');
      
      // Получаем пользовательские поля
      const userFieldsResponse = await this.getUserFields();
      
      if (userFieldsResponse?.result) {
        console.log(`Найдено ${userFieldsResponse.result.length} пользовательских полей`);
        
        // Группируем поля по типам
        const fieldsByType = userFieldsResponse.result.reduce((acc: any, field: any) => {
          const type = field.USER_TYPE_ID;
          if (!acc[type]) acc[type] = [];
          acc[type].push(field);
          return acc;
        }, {});
        
        console.log('Поля по типам:', Object.keys(fieldsByType).map(type => 
          `${type}: ${fieldsByType[type].length} полей`
        ));
        
        // Ищем поля, которые могут содержать варианты выбора
        const potentialEnumFields = userFieldsResponse.result.filter((field: any) => 
          field.SETTINGS && (
            field.SETTINGS.LIST || 
            field.SETTINGS.VALUES || 
            field.SETTINGS.ITEMS ||
            field.USER_TYPE_ID === 'enumeration' ||
            field.USER_TYPE_ID === 'list'
          )
        );
        
        console.log(`Найдено ${potentialEnumFields.length} потенциальных enum полей:`, 
          potentialEnumFields.map((f: any) => ({
            ID: f.ID,
            FIELD_NAME: f.FIELD_NAME,
            USER_TYPE_ID: f.USER_TYPE_ID,
            SETTINGS: f.SETTINGS
          }))
        );
        
        return {
          result: {
            totalFields: userFieldsResponse.result.length,
            fieldsByType,
            potentialEnumFields
          }
        };
      }
      
      return { result: { error: 'Не удалось получить поля' } };
    } catch (error) {
      console.error('Ошибка при отладке структуры полей:', error);
      throw error;
    }
  }

  /**
   * Получение всех значений для всех пользовательских полей типа enumeration
   */
  async getAllEnumFieldsWithValues() {
    try {
      console.log('Получение всех пользовательских полей и их значений');
      
      // Сначала получаем все пользовательские поля
      const userFieldsResponse = await this.getUserFields();
      
      if (!userFieldsResponse.result) {
        return { result: [] };
      }

      // Фильтруем только поля типа enumeration
      const enumFields = userFieldsResponse.result.filter(
        (field: any) => field.USER_TYPE_ID === 'enumeration'
      );

      console.log(`Найдено ${enumFields.length} полей типа enumeration`);

      // Извлекаем значения для каждого поля типа enumeration напрямую из LIST
      const fieldsWithValues = enumFields.map((field: any) => {
        const enumValues = [];
        
        // Извлекаем значения из свойства LIST (не SETTINGS.LIST!)
        if (field.LIST && Array.isArray(field.LIST)) {
          field.LIST.forEach((item: any) => {
            enumValues.push({
              ID: item.ID,
              VALUE: item.VALUE,
              SORT: item.SORT || '100'
            });
          });
        }
        
        return {
          field: field,
          values: enumValues
        };
      });

      console.log(`Обработано ${fieldsWithValues.length} полей с их значениями`);

      return {
        result: fieldsWithValues
      };
    } catch (error) {
      console.error('Ошибка при получении полей с их значениями:', error);
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

  /**
   * Получение списка компаний из Битрикс24
   */
  async getCompanies(query = '', limit = 50) {
    try {
      console.log(`Поиск компаний в Битрикс24 по запросу: '${query}'`);
      
      // Формирование фильтра для поиска по названию компании
      // Для Bitrix24 мы попробуем несколько вариантов фильтрации
      let filter = {};
      
      if (query) {
        // Используем оператор полнотекстового поиска, который лучше работает в Bitrix24
        filter = {
          '?TITLE': query
        };
      }
      
      console.log('Данные запроса компаний:', {
        filter,
        select: ['ID', 'TITLE', 'COMPANY_TYPE', 'INDUSTRY', 'REVENUE', 'PHONE', 'EMAIL'],
        start: 0,
        order: { TITLE: 'ASC' },
      });
      
      // Если поиск по оператору ? не даст результатов, попробуем получить все компании и фильтровать их на стороне сервера
      const response = await axios.post(`${this.webhookUrl}crm.company.list`, {
        filter,
        select: ['ID', 'TITLE', 'COMPANY_TYPE', 'INDUSTRY', 'REVENUE', 'PHONE', 'EMAIL'],
        start: 0,
        limit: parseInt(limit.toString()),
        order: { TITLE: 'ASC' },
      });
      
      let results = response.data;
      
      // Если полученный результат пуст и есть поисковый запрос, попробуем альтернативный метод получения всех компаний
      if (query && results.result && results.result.length === 0) {
        console.log('Не найдено результатов, пробуем получить все компании и фильтровать локально');
        
        // Запрашиваем все компании
        const allCompaniesResponse = await axios.post(`${this.webhookUrl}crm.company.list`, {
          filter: {},
          select: ['ID', 'TITLE', 'COMPANY_TYPE', 'INDUSTRY', 'REVENUE', 'PHONE', 'EMAIL'],
          start: 0,
          limit: 50, // Ограничиваем результаты для производительности
          order: { TITLE: 'ASC' },
        });
        
        // Фильтруем компании локально
        if (allCompaniesResponse.data && allCompaniesResponse.data.result) {
          const filteredCompanies = allCompaniesResponse.data.result.filter(company => 
            company.TITLE.toLowerCase().includes(query.toLowerCase())
          );
          
          // Заменяем результаты
          results = {
            ...allCompaniesResponse.data,
            result: filteredCompanies,
            total: filteredCompanies.length
          };
        }
      }
      
      console.log('Ответ от Bitrix24 (компании):', results);
      return results;
    } catch (error) {
      console.error('Ошибка при получении компаний из Битрикс24:', error);
      if (error.response) {
        console.error('Ответ сервера:', error.response.data);
      }
      throw error;
    }
  }

  /**
   * Получение списка контактов из Битрикс24
   */
  async getContacts(query = '', limit = 50) {
    try {
      console.log(`Поиск контактов в Битрикс24 по запросу: '${query}'`);
      
      // Формирование фильтра для поиска по имени или фамилии контакта, если указан query
      const filter = query ? {
        'LOGIC': 'OR',
        'NAME': `%${query}%`,
        'LAST_NAME': `%${query}%`
      } : {};
      
      console.log('Данные запроса контактов:', {
        filter,
        select: ['ID', 'NAME', 'LAST_NAME', 'SECOND_NAME', 'PHONE', 'EMAIL', 'COMPANY_ID', 'POST'],
        start: 0,
        order: { LAST_NAME: 'ASC' },
      });
      
      const response = await axios.post(`${this.webhookUrl}crm.contact.list`, {
        filter,
        select: ['ID', 'NAME', 'LAST_NAME', 'SECOND_NAME', 'PHONE', 'EMAIL', 'COMPANY_ID', 'POST'],
        start: 0,
        limit: parseInt(limit.toString()),
        order: { LAST_NAME: 'ASC' },
      });
      
      console.log('Ответ от Bitrix24 (контакты):', response.data);
      return response.data;
    } catch (error) {
      console.error('Ошибка при получении контактов из Битрикс24:', error);
      if (error.response) {
        console.error('Ответ сервера:', error.response.data);
      }
      throw error;
    }
  }
}

export default new Bitrix24Service();
