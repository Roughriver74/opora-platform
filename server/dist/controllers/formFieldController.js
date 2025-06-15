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
exports.debugFieldStructure = exports.getAllEnumFieldsWithValues = exports.getEnumFieldValues = exports.getUserFields = exports.getContactsList = exports.getCompaniesList = exports.getProductsList = exports.getBitrixFields = exports.deleteField = exports.updateField = exports.createField = exports.getFieldById = exports.getAllFields = void 0;
const FormField_1 = __importDefault(require("../models/FormField"));
const bitrix24Service_1 = __importDefault(require("../services/bitrix24Service"));
// Получение всех полей формы
const getAllFields = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const fields = yield FormField_1.default.find().sort({ order: 1 });
        res.status(200).json(fields);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.getAllFields = getAllFields;
// Получение конкретного поля формы по ID
const getFieldById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const field = yield FormField_1.default.findById(req.params.id);
        if (!field) {
            res.status(404).json({ message: 'Поле не найдено' });
            return;
        }
        res.status(200).json(field);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.getFieldById = getFieldById;
// Создание нового поля формы
const createField = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const field = new FormField_1.default(req.body);
        const savedField = yield field.save();
        res.status(201).json(savedField);
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
});
exports.createField = createField;
// Обновление существующего поля формы
const updateField = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const field = yield FormField_1.default.findById(req.params.id);
        if (!field) {
            res.status(404).json({ message: 'Поле не найдено' });
            return;
        }
        Object.assign(field, req.body);
        const updatedField = yield field.save();
        res.status(200).json(updatedField);
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
});
exports.updateField = updateField;
// Удаление поля формы
const deleteField = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const field = yield FormField_1.default.findById(req.params.id);
        if (!field) {
            res.status(404).json({ message: 'Поле не найдено' });
            return;
        }
        yield FormField_1.default.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: 'Поле успешно удалено' });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.deleteField = deleteField;
// Получение доступных полей из Битрикс24
const getBitrixFields = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const fieldsResponse = yield bitrix24Service_1.default.getDealFields();
        if (!fieldsResponse || !fieldsResponse.result) {
            res.status(404).json({ message: 'Не удалось получить поля из Битрикс24' });
            return;
        }
        const formattedFields = Object.entries(fieldsResponse.result).reduce((acc, [fieldCode, fieldData]) => {
            const fieldName = fieldData.formLabel || fieldData.listLabel || fieldData.title || fieldCode;
            acc[fieldCode] = {
                code: fieldCode,
                name: fieldName,
                type: fieldData.type,
                isRequired: fieldData.isRequired,
                isMultiple: fieldData.isMultiple,
                items: fieldData.items, // Для полей типа enumeration
                originalData: fieldData // Сохраняем исходные данные для полной совместимости
            };
            return acc;
        }, {});
        res.status(200).json({
            result: formattedFields,
            time: fieldsResponse.time
        });
    }
    catch (error) {
        console.error('Ошибка при получении полей из Битрикс24:', error);
        res.status(500).json({ message: error.message });
    }
});
exports.getBitrixFields = getBitrixFields;
// Получение номенклатуры из Битрикс24 для динамических полей
const getProductsList = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { query } = req.query;
        const products = yield bitrix24Service_1.default.getProducts(query);
        res.status(200).json(products);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.getProductsList = getProductsList;
// Получение списка компаний из Битрикс24
const getCompaniesList = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { query } = req.query;
        const companies = yield bitrix24Service_1.default.getCompanies(query);
        res.status(200).json(companies);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.getCompaniesList = getCompaniesList;
// Получение списка контактов из Битрикс24
const getContactsList = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { query } = req.query;
        const contacts = yield bitrix24Service_1.default.getContacts(query);
        res.status(200).json(contacts);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.getContactsList = getContactsList;
// Получение пользовательских полей из Битрикс24
const getUserFields = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userFields = yield bitrix24Service_1.default.getUserFields();
        res.status(200).json(userFields);
    }
    catch (error) {
        console.error('Ошибка при получении пользовательских полей:', error);
        res.status(500).json({ message: error.message });
    }
});
exports.getUserFields = getUserFields;
// Получение значений для конкретного поля типа enumeration
const getEnumFieldValues = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { fieldId } = req.params;
        const enumValues = yield bitrix24Service_1.default.getEnumFieldValues(fieldId);
        res.status(200).json(enumValues);
    }
    catch (error) {
        console.error(`Ошибка при получении значений для поля ${req.params.fieldId}:`, error);
        res.status(500).json({ message: error.message });
    }
});
exports.getEnumFieldValues = getEnumFieldValues;
// Получение всех полей типа enumeration с их значениями
const getAllEnumFieldsWithValues = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const enumFieldsWithValues = yield bitrix24Service_1.default.getAllEnumFieldsWithValues();
        res.status(200).json(enumFieldsWithValues);
    }
    catch (error) {
        console.error('Ошибка при получении полей с их значениями:', error);
        res.status(500).json({ message: error.message });
    }
});
exports.getAllEnumFieldsWithValues = getAllEnumFieldsWithValues;
// Отладочный метод для исследования структуры полей
const debugFieldStructure = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const debugInfo = yield bitrix24Service_1.default.debugFieldStructure();
        res.status(200).json(debugInfo);
    }
    catch (error) {
        console.error('Ошибка при отладке структуры полей:', error);
        res.status(500).json({ message: error.message });
    }
});
exports.debugFieldStructure = debugFieldStructure;
