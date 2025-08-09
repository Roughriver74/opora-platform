"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFormService = exports.FormService = void 0;
const BaseService_1 = require("./base/BaseService");
const repositories_1 = require("../database/repositories");
class FormService extends BaseService_1.BaseService {
    constructor() {
        super((0, repositories_1.getFormRepository)());
    }
    async createForm(data) {
        // Валидация уникальности имени
        const nameExists = await this.repository.findByName(data.name);
        if (nameExists) {
            this.throwDuplicateError('Название формы', data.name);
        }
        // Подготовка данных формы
        const formData = {
            name: data.name,
            title: data.title,
            description: data.description,
            bitrixDealCategory: data.bitrixDealCategory,
            successMessage: data.successMessage || 'Спасибо! Ваша заявка успешно отправлена.',
            isActive: true,
        };
        // Создание формы с полями
        return this.repository.createWithFields(formData, data.fields || []);
    }
    async updateForm(id, data) {
        const form = await this.repository.findById(id);
        if (!form) {
            this.throwNotFound('Форма', id);
        }
        // Обновление формы с полями
        const { fields, ...formData } = data;
        return this.repository.updateWithFields(id, formData, fields);
    }
    async findByName(name) {
        return this.repository.findByName(name);
    }
    async findActive() {
        return this.repository.findActive();
    }
    async findWithFields(formId) {
        return this.repository.findWithFields(formId);
    }
    async toggleActive(formId) {
        const form = await this.repository.findById(formId);
        if (!form) {
            this.throwNotFound('Форма', formId);
        }
        return this.repository.toggleActive(formId);
    }
    async duplicateForm(formId, newName) {
        // Проверка существования оригинальной формы
        const originalForm = await this.repository.findById(formId);
        if (!originalForm) {
            this.throwNotFound('Форма', formId);
        }
        // Проверка уникальности нового имени
        const nameExists = await this.repository.findByName(newName);
        if (nameExists) {
            this.throwDuplicateError('Название формы', newName);
        }
        return this.repository.duplicateForm(formId, newName);
    }
    async getFormStatistics(formId) {
        const form = await this.repository.findById(formId);
        if (!form) {
            this.throwNotFound('Форма', formId);
        }
        return this.repository.getFormStatistics(formId);
    }
    async getFieldsGroupedBySections(formId) {
        const form = await this.repository.findById(formId);
        if (!form) {
            this.throwNotFound('Форма', formId);
        }
        return this.repository.getFieldsGroupedBySections(formId);
    }
    async updateFieldOrder(formId, fieldOrders) {
        const form = await this.repository.findWithFields(formId);
        if (!form) {
            this.throwNotFound('Форма', formId);
        }
        // Обновление порядка полей
        const updatedFields = form.fields.map(field => {
            const orderInfo = fieldOrders.find(o => o.fieldId === field.id);
            if (orderInfo) {
                return { ...field, order: orderInfo.order };
            }
            return field;
        });
        return this.repository.updateWithFields(formId, {}, updatedFields);
    }
    async validateFormData(formId, formData) {
        const form = await this.repository.findWithFields(formId);
        if (!form) {
            this.throwNotFound('Форма', formId);
        }
        const errors = {};
        // Валидация обязательных полей
        for (const field of form.fields) {
            if (field.required && !formData[field.name]) {
                errors[field.name] = `Поле "${field.label}" обязательно для заполнения`;
            }
            // Валидация типов
            if (formData[field.name]) {
                switch (field.type) {
                    case 'email':
                        if (!this.isValidEmail(formData[field.name])) {
                            errors[field.name] = `Поле "${field.label}" должно содержать корректный email`;
                        }
                        break;
                    case 'phone':
                        if (!this.isValidPhone(formData[field.name])) {
                            errors[field.name] = `Поле "${field.label}" должно содержать корректный телефон`;
                        }
                        break;
                    case 'number':
                        if (isNaN(Number(formData[field.name]))) {
                            errors[field.name] = `Поле "${field.label}" должно быть числом`;
                        }
                        break;
                }
            }
        }
        return {
            isValid: Object.keys(errors).length === 0,
            errors
        };
    }
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    isValidPhone(phone) {
        const phoneRegex = /^[\d\s\-\+\(\)]+$/;
        return phoneRegex.test(phone) && phone.replace(/\D/g, '').length >= 10;
    }
    async getFormForBitrixMapping(formId) {
        const form = await this.repository.findWithFields(formId);
        if (!form) {
            return null;
        }
        // Создание маппинга полей для Bitrix24
        const fieldMapping = {};
        for (const field of form.fields) {
            if (field.bitrixFieldId) {
                fieldMapping[field.name] = field.bitrixFieldId;
            }
        }
        return { form, fieldMapping };
    }
}
exports.FormService = FormService;
// Синглтон для сервиса
let formService = null;
const getFormService = () => {
    if (!formService) {
        formService = new FormService();
    }
    return formService;
};
exports.getFormService = getFormService;
