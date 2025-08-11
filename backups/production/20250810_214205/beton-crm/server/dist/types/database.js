"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DB_VALIDATION_RULES = exports.DatabaseIdUtils = void 0;
const mongoose_1 = require("mongoose");
// Утилиты для работы с ID
class DatabaseIdUtils {
    /**
     * Приводит MongoDB ObjectId к строке
     */
    static toString(id) {
        return id.toString();
    }
    /**
     * Проверяет валидность ObjectId
     */
    static isValidObjectId(id) {
        return mongoose_1.Types.ObjectId.isValid(id);
    }
    /**
     * Создает строгую связь между формой и полем
     */
    static createRelation(formId, fieldId) {
        return {
            formId: this.toString(formId),
            fieldId: this.toString(fieldId),
        };
    }
}
exports.DatabaseIdUtils = DatabaseIdUtils;
// Константы для валидации
exports.DB_VALIDATION_RULES = {
    // Все formId должны быть строками
    FORM_ID_TYPE: 'string',
    // Максимальное количество полей без formId (должно быть 0)
    MAX_ORPHAN_FIELDS: 0,
    // Минимальное количество полей на форму
    MIN_FIELDS_PER_FORM: 1,
};
