"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const config_1 = __importDefault(require("../config/config"));
const cacheService_1 = require("./cacheService");
class Bitrix24Service {
    constructor() {
        this.webhookUrl = config_1.default.bitrix24WebhookUrl;
    }
    /**
     * Получение всех полей для сделок
     */
    async getDealFields() {
        try {
            const response = await axios_1.default.post(`${this.webhookUrl}crm.deal.fields`);
            return response.data;
        }
        catch (error) {
            console.error('Ошибка при получении полей сделки из Битрикс24:', error);
            throw error;
        }
    }
    /**
     * Получение номенклатуры из каталога товаров с кэшированием
     */
    async getProducts(query = '', limit = 50) {
        try {
            // Создаем ключ кэша на основе параметров запроса
            const filterStr = query || 'all';
            const cached = await cacheService_1.bitrixCache.getDynamicOptions('products', filterStr);
            if (cached) {
                console.log(`📦 Использован кэш для товаров: ${filterStr}`);
                return { result: cached, total: cached.length };
            }
            console.log(`🔄 Загрузка товаров из Битрикс24 по запросу: '${query}'`);
            let filter = {};
            if (query) {
                // Проверяем, является ли запрос числом (ID)
                const isNumericId = /^\d+$/.test(query.trim());
                if (isNumericId) {
                    // Если запрос - это число, ищем по ID
                    filter = { ID: query.trim() };
                    console.log(`Поиск по ID продукта: ${query}`);
                }
                else {
                    // Иначе ищем по имени
                    filter = { NAME: `%${query}%` };
                    console.log(`Поиск по имени продукта: ${query}`);
                }
            }
            const response = await axios_1.default.post(`${this.webhookUrl}crm.product.list`, {
                filter,
                select: ['ID', 'NAME', 'PRICE', 'CURRENCY_ID', 'DESCRIPTION'],
                start: 0,
                limit: parseInt(limit.toString()),
                order: { NAME: 'ASC' },
            });
            // Кэшируем результат
            if (response.data?.result) {
                await cacheService_1.bitrixCache.setDynamicOptions('products', response.data.result, filterStr);
            }
            console.log(`✅ Получено ${response.data?.result?.length || 0} товаров`);
            return response.data;
        }
        catch (error) {
            console.error('Ошибка при получении товаров из Битрикс24:', error.message);
            if (error.response) {
                console.error('Ответ сервера:', error.response.data);
            }
            throw error;
        }
    }
    /**
     * Получение конкретного товара по ID
     */
    async getProduct(productId) {
        try {
            console.log(`Получение товара ${productId} из Битрикс24`);
            const response = await axios_1.default.post(`${this.webhookUrl}crm.product.get`, {
                id: productId,
            });
            console.log(`Ответ от Bitrix24 для товара ${productId}:`, response.data);
            return response.data;
        }
        catch (error) {
            console.error(`Ошибка при получении товара ${productId} из Битрикс24:`, error.message);
            if (error.response) {
                console.error('Ответ сервера:', error.response.data);
            }
            throw error;
        }
    }
    /**
     * Получение конкретной компании по ID
     */
    async getCompany(companyId) {
        try {
            console.log(`Получение компании ${companyId} из Битрикс24`);
            const response = await axios_1.default.post(`${this.webhookUrl}crm.company.get`, {
                id: companyId,
            });
            console.log(`Ответ от Bitrix24 для компании ${companyId}:`, response.data);
            return response.data;
        }
        catch (error) {
            console.error(`Ошибка при получении компании ${companyId} из Битрикс24:`, error.message);
            if (error.response) {
                console.error('Ответ сервера:', error.response.data);
            }
            throw error;
        }
    }
    /**
     * Создание сделки в Битрикс24
     */
    async createDeal(dealData) {
        try {
            const response = await axios_1.default.post(`${this.webhookUrl}crm.deal.add`, {
                fields: dealData,
                params: { REGISTER_SONET_EVENT: 'Y' },
            });
            return response.data;
        }
        catch (error) {
            console.error('Ошибка при создании сделки в Битрикс24:', error);
            throw error;
        }
    }
    /**
     * Получение справочников (для выпадающих списков)
     */
    async getStatusList(entityId) {
        try {
            const response = await axios_1.default.post(`${this.webhookUrl}crm.status.list`, {
                filter: { ENTITY_ID: entityId },
            });
            return response.data;
        }
        catch (error) {
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
            const response = await axios_1.default.post(`${this.webhookUrl}crm.deal.userfield.list`);
            console.log('Получены пользовательские поля:', response.data);
            return response.data;
        }
        catch (error) {
            console.error('Ошибка при получении пользовательских полей из Битрикс24:', error);
            throw error;
        }
    }
    /**
     * Получение значений для пользовательского поля типа enumeration (выпадающий список)
     */
    async getEnumFieldValues(fieldIdentifier) {
        try {
            console.log(`Запрос значений для поля ${fieldIdentifier} из Битрикс24`);
            // Получаем все пользовательские поля
            const userFieldsResponse = await this.getUserFields();
            if (!userFieldsResponse?.result) {
                throw new Error('Не удалось получить пользовательские поля');
            }
            // Ищем поле по FIELD_NAME или ID
            const targetField = userFieldsResponse.result.find((field) => field.FIELD_NAME === fieldIdentifier || field.ID === fieldIdentifier);
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
                targetField.LIST.forEach((item) => {
                    enumValues.push({
                        ID: item.ID,
                        VALUE: item.VALUE,
                        SORT: item.SORT || '100',
                    });
                });
            }
            console.log(`Извлечено ${enumValues.length} значений для поля ${fieldIdentifier}:`, enumValues);
            // Возвращаем в том же формате, что ожидает фронтенд
            return {
                result: enumValues,
                total: enumValues.length,
            };
        }
        catch (error) {
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
                const fieldsByType = userFieldsResponse.result.reduce((acc, field) => {
                    const type = field.USER_TYPE_ID;
                    if (!acc[type])
                        acc[type] = [];
                    acc[type].push(field);
                    return acc;
                }, {});
                console.log('Поля по типам:', Object.keys(fieldsByType).map(type => `${type}: ${fieldsByType[type].length} полей`));
                // Ищем поля, которые могут содержать варианты выбора
                const potentialEnumFields = userFieldsResponse.result.filter((field) => field.SETTINGS &&
                    (field.SETTINGS.LIST ||
                        field.SETTINGS.VALUES ||
                        field.SETTINGS.ITEMS ||
                        field.USER_TYPE_ID === 'enumeration' ||
                        field.USER_TYPE_ID === 'list'));
                console.log(`Найдено ${potentialEnumFields.length} потенциальных enum полей:`, potentialEnumFields.map((f) => ({
                    ID: f.ID,
                    FIELD_NAME: f.FIELD_NAME,
                    USER_TYPE_ID: f.USER_TYPE_ID,
                    SETTINGS: f.SETTINGS,
                })));
                return {
                    result: {
                        totalFields: userFieldsResponse.result.length,
                        fieldsByType,
                        potentialEnumFields,
                    },
                };
            }
            return { result: { error: 'Не удалось получить поля' } };
        }
        catch (error) {
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
            const enumFields = userFieldsResponse.result.filter((field) => field.USER_TYPE_ID === 'enumeration');
            console.log(`Найдено ${enumFields.length} полей типа enumeration`);
            // Извлекаем значения для каждого поля типа enumeration напрямую из LIST
            const fieldsWithValues = enumFields.map((field) => {
                const enumValues = [];
                // Извлекаем значения из свойства LIST (не SETTINGS.LIST!)
                if (field.LIST && Array.isArray(field.LIST)) {
                    field.LIST.forEach((item) => {
                        enumValues.push({
                            ID: item.ID,
                            VALUE: item.VALUE,
                            SORT: item.SORT || '100',
                        });
                    });
                }
                return {
                    field: field,
                    values: enumValues,
                };
            });
            console.log(`Обработано ${fieldsWithValues.length} полей с их значениями`);
            return {
                result: fieldsWithValues,
            };
        }
        catch (error) {
            console.error('Ошибка при получении полей с их значениями:', error);
            throw error;
        }
    }
    /**
     * Получение доступных категорий сделок с кэшированием
     */
    async getDealCategories() {
        try {
            // Проверяем кэш сначала
            const cached = await cacheService_1.bitrixCache.getDealCategories();
            if (cached) {
                console.log('📦 Использован кэш для категорий сделок');
                return { result: cached, total: cached.length };
            }
            console.log('🔄 Загрузка категорий сделок из Битрикс24');
            // Исправленный метод для получения категорий сделок
            const response = await axios_1.default.post(`${this.webhookUrl}crm.category.list`, {
                entityTypeId: 2, // 2 - тип сущности для сделок в Bitrix24
            });
            // Кэшируем результат
            if (response.data?.result) {
                await cacheService_1.bitrixCache.setDealCategories(response.data.result);
            }
            console.log(`✅ Получено ${response.data?.result?.length || 0} категорий сделок`);
            return response.data;
        }
        catch (error) {
            console.error('Ошибка при получении категорий сделок из Битрикс24:', error);
            // Пробуем альтернативный метод, если первый не сработал
            try {
                console.log('Пробуем альтернативный метод:', `${this.webhookUrl}crm.dealcategory.list`);
                const fallbackResponse = await axios_1.default.post(`${this.webhookUrl}crm.dealcategory.list`);
                console.log('Получен ответ от альтернативного метода:', fallbackResponse.data);
                return fallbackResponse.data;
            }
            catch (fallbackError) {
                console.error('Ошибка при использовании альтернативного метода:', fallbackError);
                // Если оба метода не сработали, возвращаем пустые категории
                return { result: [] };
            }
        }
    }
    /**
     * Получение списка компаний из Битрикс24 с кэшированием
     */
    async getCompanies(query = '', limit = 50, assignedToUserId = null) {
        try {
            // Создаем ключ кэша на основе параметров запроса
            const filterKey = `${query || 'all'}_${assignedToUserId || 'nouser'}_${limit}`;
            const cached = await cacheService_1.bitrixCache.getDynamicOptions('companies', filterKey);
            if (cached) {
                console.log(`📦 Использован кэш для компаний: ${filterKey}`);
                return { result: cached, total: cached.length };
            }
            console.log(`🔄 Загрузка компаний из Битрикс24 по запросу: '${query}'`);
            console.log(`Фильтр по ответственному: ${assignedToUserId}`);
            let filter = {};
            // Добавляем фильтр по ответственному если указан
            if (assignedToUserId) {
                filter.ASSIGNED_BY_ID = assignedToUserId;
                console.log(`Фильтрация по ответственному: ${assignedToUserId}`);
            }
            if (query) {
                // Проверяем, является ли запрос числом (ID)
                const isNumericId = /^\d+$/.test(query.trim());
                if (isNumericId) {
                    // Если запрос - это число, ищем по ID
                    filter.ID = query.trim();
                    console.log(`Поиск по ID компании: ${query}`);
                }
                else {
                    // Иначе ищем по названию
                    filter['?TITLE'] = query;
                    console.log(`Поиск по названию компании: ${query}`);
                }
            }
            console.log('Данные запроса компаний:', {
                filter,
                select: [
                    'ID',
                    'TITLE',
                    'COMPANY_TYPE',
                    'INDUSTRY',
                    'REVENUE',
                    'PHONE',
                    'EMAIL',
                ],
                start: 0,
                order: { TITLE: 'ASC' },
            });
            const response = await axios_1.default.post(`${this.webhookUrl}crm.company.list`, {
                filter,
                select: [
                    'ID',
                    'TITLE',
                    'COMPANY_TYPE',
                    'INDUSTRY',
                    'REVENUE',
                    'PHONE',
                    'EMAIL',
                ],
                start: 0,
                limit: parseInt(limit.toString()),
                order: { TITLE: 'ASC' },
            });
            let results = response.data;
            // Если полученный результат пуст и есть поисковый запрос по тексту, попробуем альтернативный метод
            if (query &&
                results.result &&
                results.result.length === 0 &&
                !/^\d+$/.test(query.trim())) {
                console.log('Не найдено результатов, пробуем получить все компании и фильтровать локально');
                // Запрашиваем все компании
                const allCompaniesResponse = await axios_1.default.post(`${this.webhookUrl}crm.company.list`, {
                    filter: {},
                    select: [
                        'ID',
                        'TITLE',
                        'COMPANY_TYPE',
                        'INDUSTRY',
                        'REVENUE',
                        'PHONE',
                        'EMAIL',
                    ],
                    start: 0,
                    limit: 50,
                    order: { TITLE: 'ASC' },
                });
                // Фильтруем компании локально
                if (allCompaniesResponse.data && allCompaniesResponse.data.result) {
                    const filteredCompanies = allCompaniesResponse.data.result.filter(company => company.TITLE &&
                        company.TITLE.toLowerCase().includes(query.toLowerCase()));
                    results = {
                        ...allCompaniesResponse.data,
                        result: filteredCompanies,
                        total: filteredCompanies.length,
                    };
                }
            }
            // Кэшируем результат
            if (results?.result) {
                await cacheService_1.bitrixCache.setDynamicOptions('companies', results.result, filterKey);
            }
            console.log(`✅ Получено ${results?.result?.length || 0} компаний`);
            return results;
        }
        catch (error) {
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
            let filter = {};
            if (query) {
                // Проверяем, является ли запрос числом (ID)
                const isNumericId = /^\d+$/.test(query.trim());
                if (isNumericId) {
                    // Если запрос - это число, ищем по ID
                    filter = { ID: query.trim() };
                    console.log(`Поиск по ID контакта: ${query}`);
                }
                else {
                    // Иначе ищем по имени или фамилии
                    filter = {
                        LOGIC: 'OR',
                        NAME: `%${query}%`,
                        LAST_NAME: `%${query}%`,
                    };
                    console.log(`Поиск по имени/фамилии контакта: ${query}`);
                }
            }
            console.log('Данные запроса контактов:', {
                filter,
                select: [
                    'ID',
                    'NAME',
                    'LAST_NAME',
                    'SECOND_NAME',
                    'PHONE',
                    'EMAIL',
                    'COMPANY_ID',
                    'POST',
                ],
                start: 0,
                order: { LAST_NAME: 'ASC' },
            });
            const response = await axios_1.default.post(`${this.webhookUrl}crm.contact.list`, {
                filter,
                select: [
                    'ID',
                    'NAME',
                    'LAST_NAME',
                    'SECOND_NAME',
                    'PHONE',
                    'EMAIL',
                    'COMPANY_ID',
                    'POST',
                ],
                start: 0,
                limit: parseInt(limit.toString()),
                order: { LAST_NAME: 'ASC' },
            });
            console.log('Ответ от Bitrix24 (контакты):', response.data);
            return response.data;
        }
        catch (error) {
            console.error('Ошибка при получении контактов из Битрикс24:', error);
            if (error.response) {
                console.error('Ответ сервера:', error.response.data);
            }
            throw error;
        }
    }
    /**
     * Получение списка пользователей из Битрикс24
     */
    async getUsers(start = 0, limit = 50) {
        try {
            console.log(`Запрос пользователей из Битрикс24, start: ${start}, limit: ${limit}`);
            const response = await axios_1.default.post(`${this.webhookUrl}user.get`, {
                start: start,
                limit: limit,
                sort: 'NAME',
                order: 'ASC',
            });
            console.log('Ответ от Bitrix24 (пользователи):', response.data);
            return response.data;
        }
        catch (error) {
            console.error('Ошибка при получении пользователей из Битрикс24:', error);
            if (error.response) {
                console.error('Ответ сервера:', error.response.data);
            }
            throw error;
        }
    }
    /**
     * Получение статусов сделок для определенной категории с кэшированием
     */
    async getDealStages(categoryId = '0') {
        try {
            // Проверяем кэш сначала
            const cached = await cacheService_1.bitrixCache.getDealStages(categoryId);
            if (cached) {
                console.log(`📦 Использован кэш для статусов категории ${categoryId}`);
                return cached;
            }
            console.log(`🔄 Загрузка статусов сделок для категории ${categoryId} из Битрикс24`);
            const response = await axios_1.default.post(`${this.webhookUrl}crm.status.list`, {
                filter: {
                    ENTITY_ID: 'DEAL_STAGE',
                    ENTITY_TYPE: categoryId,
                },
                order: { SORT: 'ASC' },
            });
            // Преобразуем результат в нужный формат
            const stages = response.data?.result?.map((stage) => ({
                id: stage.STATUS_ID,
                name: stage.NAME,
                sort: parseInt(stage.SORT) || 0,
                color: stage.COLOR,
                semantic: stage.SYSTEM === 'Y' ? stage.SYSTEM : 'P', // P - процесс, S - успех, F - провал
            })) || [];
            // Кэшируем результат
            if (stages.length > 0) {
                await cacheService_1.bitrixCache.setDealStages(categoryId, stages);
            }
            console.log(`✅ Получено ${stages.length} статусов для категории ${categoryId}`);
            return stages;
        }
        catch (error) {
            console.error('Ошибка при получении статусов сделок из Битрикс24:', error);
            if (error.response) {
                console.error('Ответ сервера:', error.response.data);
            }
            throw error;
        }
    }
    /**
     * Получение информации о текущем пользователе (для тестирования подключения)
     */
    async getCurrentUser() {
        try {
            console.log('Запрос информации о текущем пользователе из Битрикс24');
            const response = await axios_1.default.post(`${this.webhookUrl}user.current`);
            console.log('Ответ от Bitrix24 (текущий пользователь):', response.data);
            return response.data;
        }
        catch (error) {
            console.error('Ошибка при получении информации о пользователе из Битрикс24:', error);
            if (error.response) {
                console.error('Ответ сервера:', error.response.data);
            }
            throw error;
        }
    }
    /**
     * Обновление статуса сделки в Битрикс24
     */
    async updateDealStatus(dealId, newStatus, categoryId) {
        try {
            console.log(`Обновление статуса сделки ${dealId} на ${newStatus}`);
            // Используем статус как есть, без дополнительных префиксов
            // Статусы уже приходят в правильном формате (NEW, C1:UC_GJLIZP, C1:WON)
            let stageId = newStatus;
            const updateData = {
                STAGE_ID: stageId,
            };
            console.log('Данные для обновления сделки:', updateData);
            const response = await axios_1.default.post(`${this.webhookUrl}crm.deal.update`, {
                id: dealId,
                fields: updateData,
            });
            console.log('Ответ от Bitrix24 (обновление сделки):', response.data);
            return response.data;
        }
        catch (error) {
            console.error('Ошибка при обновлении статуса сделки в Битрикс24:', error);
            if (error.response) {
                console.error('Ответ сервера:', error.response.data);
            }
            throw error;
        }
    }
    /**
     * Получение данных сделки из Битрикс24
     */
    async getDeal(dealId) {
        try {
            console.log(`Получение данных сделки ${dealId} из Битрикс24`);
            const response = await axios_1.default.post(`${this.webhookUrl}crm.deal.get`, {
                id: dealId,
            });
            console.log('Ответ от Bitrix24 (получение сделки):', response.data);
            return response.data;
        }
        catch (error) {
            console.error('Ошибка при получении данных сделки из Битрикс24:', error);
            if (error.response) {
                console.error('Ответ сервера:', error.response.data);
            }
            throw error;
        }
    }
    /**
     * Обновление сделки в Битрикс24
     */
    async updateDeal(dealId, dealData) {
        try {
            console.log(`Обновление сделки ${dealId}`, dealData);
            const response = await axios_1.default.post(`${this.webhookUrl}crm.deal.update`, {
                id: dealId,
                fields: dealData,
            });
            console.log('Ответ от Bitrix24 (обновление сделки):', response.data);
            return response.data;
        }
        catch (error) {
            console.error('Ошибка при обновлении сделки в Битрикс24:', error);
            if (error.response) {
                console.error('Ответ сервера:', error.response.data);
            }
            throw error;
        }
    }
}
exports.default = new Bitrix24Service();
