"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FormFieldRepository = void 0;
const BaseRepository_1 = require("./base/BaseRepository");
const FormField_entity_1 = require("../entities/FormField.entity");
class FormFieldRepository extends BaseRepository_1.BaseRepository {
    constructor() {
        super(FormField_entity_1.FormField, 'formfield');
        this.cacheTTL = 3600; // 1 час для полей формы
    }
    async findByFormId(formId) {
        const cacheKey = `${this.cachePrefix}:form:${formId}`;
        const cached = await this.cacheGet(cacheKey);
        if (cached)
            return cached;
        const fields = await this.repository.find({
            where: { formId },
            order: { order: 'ASC' }
        });
        await this.cacheSet(cacheKey, fields);
        return fields;
    }
    async findByFormAndName(formId, name) {
        const cacheKey = `${this.cachePrefix}:form:${formId}:name:${name}`;
        const cached = await this.cacheGet(cacheKey);
        if (cached)
            return cached;
        const field = await this.repository.findOne({
            where: { formId, name }
        });
        if (field) {
            await this.cacheSet(cacheKey, field);
        }
        return field;
    }
    async updateFieldOrder(fieldId, order) {
        const field = await this.findById(fieldId);
        if (!field)
            return null;
        field.order = order;
        const saved = await this.repository.save(field);
        // Инвалидация кэша
        await this.invalidateCache(fieldId);
        await this.invalidateCachePattern(`${this.cachePrefix}:form:${field.formId}*`);
        return saved;
    }
    async deleteByFormId(formId) {
        await this.repository.delete({ formId });
        await this.invalidateCachePattern(`${this.cachePrefix}:form:${formId}*`);
    }
    async getMaxOrder(formId) {
        const result = await this.createQueryBuilder('field')
            .where('field.formId = :formId', { formId })
            .select('MAX(field.order)', 'maxOrder')
            .getRawOne();
        return result?.maxOrder || 0;
    }
    // Переопределяем метод update, чтобы инвалидировать кеш формы при любом обновлении поля
    async update(id, data) {
        const field = await this.findById(id);
        if (!field)
            return null;
        const updated = await super.update(id, data);
        // Инвалидируем кеш формы после обновления любого поля
        if (updated && field.formId) {
            await this.invalidateCachePattern(`${this.cachePrefix}:form:${field.formId}*`);
        }
        return updated;
    }
    async duplicateFields(sourceFormId, targetFormId) {
        const sourceFields = await this.findByFormId(sourceFormId);
        const duplicatedFields = sourceFields.map(field => {
            const { id, createdAt, updatedAt, ...fieldData } = field;
            return this.repository.create({
                ...fieldData,
                formId: targetFormId
            });
        });
        const saved = await this.repository.save(duplicatedFields);
        await this.invalidateCachePattern(`${this.cachePrefix}:form:${targetFormId}*`);
        return saved;
    }
}
exports.FormFieldRepository = FormFieldRepository;
