"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFormFieldService = exports.FormFieldService = void 0;
const BaseService_1 = require("./base/BaseService");
const repositories_1 = require("../database/repositories");
class FormFieldService extends BaseService_1.BaseService {
    constructor() {
        super((0, repositories_1.getFormFieldRepository)());
    }
    async createField(data) {
        // Валидация уникальности имени в рамках формы
        const existingField = await this.repository.findByFormAndName(data.formId, data.name);
        if (existingField) {
            this.throwDuplicateError('Поле с таким именем', data.name);
        }
        // Создание поля
        return this.repository.create(data);
    }
    async updateField(id, data) {
        const field = await this.repository.findById(id);
        if (!field) {
            this.throwNotFound('Поле формы', id);
        }
        // Обновление поля
        return this.repository.update(id, data);
    }
    async findByFormId(formId) {
        return this.repository.findByFormId(formId);
    }
    async updateFieldsOrder(updates) {
        const updatePromises = updates.map(update => this.repository.update(update.id, { order: update.order }));
        const results = await Promise.all(updatePromises);
        const updatedCount = results.filter(result => result !== null).length;
        // Получаем formId из первого обновленного поля для инвалидации кеша формы
        if (results.length > 0 && results[0]) {
            const formId = results[0].formId;
            // Инвалидируем кеш всей формы, так как порядок полей изменился
            // Используем метод репозитория, который имеет доступ к protected методу
            await this.repository.invalidateCachePattern(`formfield:form:${formId}*`);
        }
        return {
            success: true,
            updatedCount
        };
    }
    async deleteField(id) {
        const field = await this.repository.findById(id);
        if (!field) {
            this.throwNotFound('Поле формы', id);
        }
        return this.repository.delete(id);
    }
    async duplicateFields(sourceFormId, targetFormId) {
        const sourceFields = await this.repository.findByFormId(sourceFormId);
        const duplicatePromises = sourceFields.map(field => {
            const { id, createdAt, updatedAt, ...fieldData } = field;
            return this.repository.create({
                ...fieldData,
                formId: targetFormId
            });
        });
        return Promise.all(duplicatePromises);
    }
}
exports.FormFieldService = FormFieldService;
// Синглтон для сервиса
let formFieldService = null;
const getFormFieldService = () => {
    if (!formFieldService) {
        formFieldService = new FormFieldService();
    }
    return formFieldService;
};
exports.getFormFieldService = getFormFieldService;
