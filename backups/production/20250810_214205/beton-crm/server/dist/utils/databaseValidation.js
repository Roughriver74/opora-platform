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
exports.validateFormFieldsIntegrity = validateFormFieldsIntegrity;
exports.autoFixDatabaseIssues = autoFixDatabaseIssues;
exports.validateAndFixDatabase = validateAndFixDatabase;
const Form_1 = __importDefault(require("../models/Form"));
const FormField_1 = __importDefault(require("../models/FormField"));
/**
 * Проверяет целостность связей между формами и полями
 */
function validateFormFieldsIntegrity() {
    return __awaiter(this, void 0, void 0, function* () {
        const issues = [];
        try {
            // Получаем статистику
            const totalForms = yield Form_1.default.countDocuments();
            const totalFields = yield FormField_1.default.countDocuments();
            const fieldsWithForm = yield FormField_1.default.countDocuments({
                formId: { $exists: true },
            });
            const fieldsWithoutForm = yield FormField_1.default.countDocuments({
                formId: { $exists: false },
            });
            console.log('📊 Статистика базы данных:');
            console.log(`  Форм: ${totalForms}`);
            console.log(`  Полей: ${totalFields}`);
            console.log(`  Полей с formId: ${fieldsWithForm}`);
            console.log(`  Полей без formId: ${fieldsWithoutForm}`);
            // Проверка 1: Все поля должны иметь formId
            if (fieldsWithoutForm > 0) {
                issues.push(`❌ Найдено ${fieldsWithoutForm} полей без связи с формой`);
            }
            // Проверка 2: Все formId должны ссылаться на существующие формы
            const forms = yield Form_1.default.find({}, { _id: 1 });
            const formIds = forms.map(form => form._id.toString());
            for (const formId of formIds) {
                const fieldsCount = yield FormField_1.default.countDocuments({ formId });
                console.log(`  Форма ${formId}: ${fieldsCount} полей`);
                if (fieldsCount === 0) {
                    issues.push(`⚠️ Форма ${formId} не имеет полей`);
                }
            }
            // Проверка 3: Поиск полей с недействительными formId
            const fieldsWithInvalidFormId = yield FormField_1.default.find({
                formId: { $exists: true, $nin: formIds },
            });
            if (fieldsWithInvalidFormId.length > 0) {
                issues.push(`❌ Найдено ${fieldsWithInvalidFormId.length} полей с недействительными formId`);
            }
            // Проверка 4: Типы данных
            const sampleField = yield FormField_1.default.findOne({ formId: { $exists: true } });
            if (sampleField) {
                const formIdType = typeof sampleField.formId;
                console.log(`  Тип formId в базе: ${formIdType}`);
                if (formIdType !== 'string') {
                    issues.push(`❌ formId хранится как ${formIdType}, ожидается string`);
                }
            }
            const statistics = {
                totalForms,
                totalFields,
                fieldsWithForm,
                fieldsWithoutForm,
            };
            return {
                isValid: issues.length === 0,
                issues,
                statistics,
            };
        }
        catch (error) {
            issues.push(`❌ Ошибка валидации: ${error}`);
            return {
                isValid: false,
                issues,
                statistics: {
                    totalForms: 0,
                    totalFields: 0,
                    fieldsWithForm: 0,
                    fieldsWithoutForm: 0,
                },
            };
        }
    });
}
/**
 * Автоматически исправляет найденные проблемы
 */
function autoFixDatabaseIssues() {
    return __awaiter(this, void 0, void 0, function* () {
        const fixed = [];
        const errors = [];
        try {
            // Исправление 1: Привязка полей без formId к первой форме
            const fieldsWithoutForm = yield FormField_1.default.find({
                formId: { $exists: false },
            });
            if (fieldsWithoutForm.length > 0) {
                const firstForm = yield Form_1.default.findOne();
                if (firstForm) {
                    yield FormField_1.default.updateMany({ formId: { $exists: false } }, { formId: firstForm._id.toString() });
                    fixed.push(`✅ Привязано ${fieldsWithoutForm.length} полей к форме ${firstForm._id}`);
                }
            }
            // Исправление 2: Удаление полей с недействительными formId
            const forms = yield Form_1.default.find({}, { _id: 1 });
            const validFormIds = forms.map(form => form._id.toString());
            const orphanFields = yield FormField_1.default.find({
                formId: { $exists: true, $nin: validFormIds },
            });
            if (orphanFields.length > 0) {
                yield FormField_1.default.deleteMany({
                    formId: { $exists: true, $nin: validFormIds },
                });
                fixed.push(`✅ Удалено ${orphanFields.length} полей с недействительными formId`);
            }
        }
        catch (error) {
            errors.push(`❌ Ошибка автоисправления: ${error}`);
        }
        return { fixed, errors };
    });
}
/**
 * Запускает полную проверку и исправление при необходимости
 */
function validateAndFixDatabase() {
    return __awaiter(this, arguments, void 0, function* (autoFix = false) {
        console.log('🔍 Запуск валидации базы данных...');
        const validation = yield validateFormFieldsIntegrity();
        if (validation.isValid) {
            console.log('✅ База данных прошла все проверки');
            return;
        }
        console.log('⚠️ Обнаружены проблемы:');
        validation.issues.forEach(issue => console.log(`  ${issue}`));
        if (autoFix) {
            console.log('🔧 Запуск автоисправления...');
            const fixResult = yield autoFixDatabaseIssues();
            fixResult.fixed.forEach(fix => console.log(`  ${fix}`));
            fixResult.errors.forEach(error => console.log(`  ${error}`));
            if (fixResult.fixed.length > 0) {
                console.log('✅ Повторная проверка после исправлений...');
                yield validateFormFieldsIntegrity();
            }
        }
        else {
            console.log('💡 Для автоисправления запустите с параметром autoFix: true');
        }
    });
}
