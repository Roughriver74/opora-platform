"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const config_1 = __importDefault(require("../config/config"));
const cacheService_1 = require("./cacheService");
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;
const retryRequest = async (requestFn, maxRetries = MAX_RETRIES, delay = RETRY_DELAY) => {
    let lastError;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await requestFn();
        }
        catch (error) {
            lastError = error;
            const transient = error.code?.includes?.('ECONNABORTED') ||
                error.code?.includes?.('ENOTFOUND') ||
                error.code?.includes?.('ECONNRESET') ||
                [500, 502, 503, 504].includes(error.response?.status);
            if (attempt === maxRetries || !transient)
                throw error;
            await new Promise(resolve => setTimeout(resolve, delay * attempt));
        }
    }
    throw lastError;
};
class Bitrix24Service {
    constructor() {
        this.webhookUrl = config_1.default.bitrix24WebhookUrl;
        this.validateConfiguration();
    }
    validateConfiguration() {
        if (!this.webhookUrl) {
            throw new Error('BITRIX24_WEBHOOK_URL не настроен в переменных окружения');
        }
        try {
            const url = new URL(this.webhookUrl);
            if (!url.protocol.startsWith('http')) {
                throw new Error('Bitrix24 webhook URL должен начинаться с http:// или https://');
            }
        }
        catch (error) {
            throw new Error(`Неверный формат Bitrix24 webhook URL: ${error.message}`);
        }
    }
    // Deals: fields and creation
    async getDealFields() {
        const response = await retryRequest(() => axios_1.default.post(`${this.webhookUrl}crm.deal.fields`, {}, { timeout: 15000 }));
        return response.data;
    }
    async createDeal(dealData) {
        const response = await axios_1.default.post(`${this.webhookUrl}crm.deal.add`, {
            fields: dealData,
            params: { REGISTER_SONET_EVENT: 'Y' },
        });
        return response.data;
    }
    async updateDeal(dealId, dealData) {
        const response = await axios_1.default.post(`${this.webhookUrl}crm.deal.update`, {
            id: dealId,
            fields: dealData,
        });
        return response.data;
    }
    async updateDealStatus(dealId, newStatus, _categoryId) {
        const response = await axios_1.default.post(`${this.webhookUrl}crm.deal.update`, {
            id: dealId,
            fields: { STAGE_ID: newStatus },
        });
        return response.data;
    }
    async getDeal(dealId) {
        const response = await axios_1.default.post(`${this.webhookUrl}crm.deal.get`, {
            id: dealId,
        });
        return response.data;
    }
    // Catalog: products, companies, contacts
    async getProducts(query = '', limit = 50) {
        const filterStr = query || 'all';
        const cached = await cacheService_1.bitrixCache.getDynamicOptions('products', filterStr);
        if (cached)
            return { result: cached, total: cached.length };
        let filter = {};
        if (query) {
            const isNumericId = /^\d+$/.test(query.trim());
            filter = isNumericId ? { ID: query.trim() } : { NAME: `%${query}%` };
        }
        const response = await axios_1.default.post(`${this.webhookUrl}crm.product.list`, {
            filter,
            select: ['ID', 'NAME', 'PRICE', 'CURRENCY_ID', 'DESCRIPTION'],
            start: 0,
            limit: parseInt(limit.toString()),
            order: { NAME: 'ASC' },
        });
        if (response.data?.result) {
            await cacheService_1.bitrixCache.setDynamicOptions('products', response.data.result, filterStr);
        }
        return response.data;
    }
    async getProduct(productId) {
        const response = await axios_1.default.post(`${this.webhookUrl}crm.product.get`, {
            id: productId,
        });
        return response.data;
    }
    async getCompanies(query = '', limit = 50, assignedToUserId = null) {
        const filterKey = `${query || 'all'}_${assignedToUserId || 'nouser'}_${limit}`;
        const cached = await cacheService_1.bitrixCache.getDynamicOptions('companies', filterKey);
        if (cached)
            return { result: cached, total: cached.length };
        const filter = {};
        if (assignedToUserId)
            filter.ASSIGNED_BY_ID = assignedToUserId;
        if (query) {
            const isNumericId = /^\d+$/.test(query.trim());
            if (isNumericId)
                filter.ID = query.trim();
            else
                filter['?TITLE'] = query;
        }
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
        if (query &&
            results.result &&
            results.result.length === 0 &&
            !/^\d+$/.test(query.trim())) {
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
            if (allCompaniesResponse.data?.result) {
                const filteredCompanies = allCompaniesResponse.data.result.filter((company) => company.TITLE &&
                    company.TITLE.toLowerCase().includes(query.toLowerCase()));
                results = {
                    ...allCompaniesResponse.data,
                    result: filteredCompanies,
                    total: filteredCompanies.length,
                };
            }
        }
        if (results?.result) {
            await cacheService_1.bitrixCache.setDynamicOptions('companies', results.result, filterKey);
        }
        return results;
    }
    async getCompany(companyId) {
        const response = await axios_1.default.post(`${this.webhookUrl}crm.company.get`, {
            id: companyId,
        });
        return response.data;
    }
    async getContacts(query = '', limit = 50) {
        let filter = {};
        if (query) {
            const isNumericId = /^\d+$/.test(query.trim());
            filter = isNumericId
                ? { ID: query.trim() }
                : { LOGIC: 'OR', NAME: `%${query}%`, LAST_NAME: `%${query}%` };
        }
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
        return response.data;
    }
    // Misc reference data
    async getStatusList(entityId) {
        const response = await axios_1.default.post(`${this.webhookUrl}crm.status.list`, {
            filter: { ENTITY_ID: entityId },
        });
        return response.data;
    }
    async getUserFields() {
        const response = await axios_1.default.post(`${this.webhookUrl}crm.deal.userfield.list`);
        return response.data;
    }
    async getEnumFieldValues(fieldIdentifier) {
        const userFieldsResponse = await this.getUserFields();
        if (!userFieldsResponse?.result)
            throw new Error('Не удалось получить пользовательские поля');
        const targetField = userFieldsResponse.result.find((field) => field.FIELD_NAME === fieldIdentifier || field.ID === fieldIdentifier);
        if (!targetField)
            throw new Error(`Поле ${fieldIdentifier} не найдено`);
        if (targetField.USER_TYPE_ID !== 'enumeration') {
            throw new Error(`Поле ${fieldIdentifier} не является полем типа enumeration (тип: ${targetField.USER_TYPE_ID})`);
        }
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
        return { result: enumValues, total: enumValues.length };
    }
    async debugFieldStructure() {
        const userFieldsResponse = await this.getUserFields();
        if (!userFieldsResponse?.result)
            return { result: { error: 'Не удалось получить поля' } };
        const fieldsByType = userFieldsResponse.result.reduce((acc, field) => {
            const type = field.USER_TYPE_ID;
            if (!acc[type])
                acc[type] = [];
            acc[type].push(field);
            return acc;
        }, {});
        const potentialEnumFields = userFieldsResponse.result.filter((field) => field.SETTINGS &&
            (field.SETTINGS.LIST ||
                field.SETTINGS.VALUES ||
                field.SETTINGS.ITEMS ||
                field.USER_TYPE_ID === 'enumeration' ||
                field.USER_TYPE_ID === 'list'));
        return {
            result: {
                totalFields: userFieldsResponse.result.length,
                fieldsByType,
                potentialEnumFields,
            },
        };
    }
    async getAllEnumFieldsWithValues() {
        const userFieldsResponse = await this.getUserFields();
        if (!userFieldsResponse.result)
            return { result: [] };
        const enumFields = userFieldsResponse.result.filter((field) => field.USER_TYPE_ID === 'enumeration');
        const fieldsWithValues = enumFields.map((field) => {
            const enumValues = [];
            if (field.LIST && Array.isArray(field.LIST)) {
                field.LIST.forEach((item) => {
                    enumValues.push({
                        ID: item.ID,
                        VALUE: item.VALUE,
                        SORT: item.SORT || '100',
                    });
                });
            }
            return { field, values: enumValues };
        });
        return { result: fieldsWithValues };
    }
    // Deal categories and stages
    async getDealCategories() {
        const cached = await cacheService_1.bitrixCache.getDealCategories();
        if (cached)
            return { result: cached, total: cached.length };
        try {
            const response = await axios_1.default.post(`${this.webhookUrl}crm.category.list`, {
                entityTypeId: 2,
            });
            if (response.data?.result)
                await cacheService_1.bitrixCache.setDealCategories(response.data.result);
            return response.data;
        }
        catch {
            try {
                const fallbackResponse = await axios_1.default.post(`${this.webhookUrl}crm.dealcategory.list`);
                return fallbackResponse.data;
            }
            catch {
                return { result: [] };
            }
        }
    }
    async getDealStages(categoryId = '0') {
        const cached = await cacheService_1.bitrixCache.getDealStages(categoryId);
        if (cached)
            return cached;
        const response = await axios_1.default.post(`${this.webhookUrl}crm.status.list`, {
            filter: { ENTITY_ID: 'DEAL_STAGE', ENTITY_TYPE: categoryId },
            order: { SORT: 'ASC' },
        });
        const stages = response.data?.result?.map((stage) => ({
            id: stage.STATUS_ID,
            name: stage.NAME,
            sort: parseInt(stage.SORT) || 0,
            color: stage.COLOR,
            semantic: stage.SYSTEM === 'Y' ? stage.SYSTEM : 'P',
        })) || [];
        if (stages.length > 0)
            await cacheService_1.bitrixCache.setDealStages(categoryId, stages);
        return stages;
    }
    // Users
    async getUsers(start = 0, limit = 50) {
        const response = await retryRequest(() => axios_1.default.post(`${this.webhookUrl}user.get`, { start, limit, sort: 'NAME', order: 'ASC' }, { timeout: 30000 }));
        return response.data;
    }
    async getCurrentUser() {
        const response = await retryRequest(() => axios_1.default.post(`${this.webhookUrl}user.current`, {}, { timeout: 15000 }));
        return response.data;
    }
}
exports.default = new Bitrix24Service();
