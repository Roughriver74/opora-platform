"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const config_1 = __importDefault(require("../config/config"));
class Bitrix24Service {
    constructor() {
        this.webhookUrl = config_1.default.bitrix24WebhookUrl;
    }
    /**
     * Получение всех полей для сделок
     */
    getDealFields() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const response = yield axios_1.default.post(`${this.webhookUrl}crm.deal.fields`);
                return response.data;
            }
            catch (error) {
                console.error('Ошибка при получении полей сделки из Битрикс24:', error);
                throw error;
            }
        });
    }
    /**
     * Получение номенклатуры из каталога товаров
     */
    getProducts() {
        return __awaiter(this, arguments, void 0, function* (query = '', limit = 50) {
            try {
                // Формирование фильтра для поиска по имени товара, если указан query
                const filter = query ? { '%NAME': query } : {};
                const response = yield axios_1.default.post(`${this.webhookUrl}crm.product.list`, {
                    filter,
                    select: ['ID', 'NAME', 'PRICE', 'CURRENCY_ID', 'DESCRIPTION'],
                    start: 0,
                    order: { NAME: 'ASC' },
                });
                return response.data;
            }
            catch (error) {
                console.error('Ошибка при получении товаров из Битрикс24:', error);
                throw error;
            }
        });
    }
    /**
     * Создание сделки в Битрикс24
     */
    createDeal(dealData) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const response = yield axios_1.default.post(`${this.webhookUrl}crm.deal.add`, {
                    fields: dealData,
                    params: { REGISTER_SONET_EVENT: 'Y' }
                });
                return response.data;
            }
            catch (error) {
                console.error('Ошибка при создании сделки в Битрикс24:', error);
                throw error;
            }
        });
    }
    /**
     * Получение справочников (для выпадающих списков)
     */
    getStatusList(entityId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const response = yield axios_1.default.post(`${this.webhookUrl}crm.status.list`, {
                    filter: { ENTITY_ID: entityId }
                });
                return response.data;
            }
            catch (error) {
                console.error('Ошибка при получении справочника из Битрикс24:', error);
                throw error;
            }
        });
    }
    /**
     * Получение доступных категорий сделок
     */
    getDealCategories() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const response = yield axios_1.default.post(`${this.webhookUrl}crm.dealcategory.list`);
                return response.data;
            }
            catch (error) {
                console.error('Ошибка при получении категорий сделок из Битрикс24:', error);
                throw error;
            }
        });
    }
}
exports.default = new Bitrix24Service();
