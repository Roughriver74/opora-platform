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
exports.getProductsList = exports.getBitrixFields = exports.deleteField = exports.updateField = exports.createField = exports.getFieldById = exports.getAllFields = void 0;
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
            return res.status(404).json({ message: 'Поле не найдено' });
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
            return res.status(404).json({ message: 'Поле не найдено' });
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
            return res.status(404).json({ message: 'Поле не найдено' });
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
        // Проверяем, есть ли поля в ответе
        if (!fieldsResponse || !fieldsResponse.result) {
            return res.status(404).json({ message: 'Поля не найдены в ответе Битрикс24' });
        }
        // Преобразуем поля в формат { fieldCode: { code: fieldCode, name: fieldName, type: fieldType, ... } }
        const formattedFields = Object.entries(fieldsResponse.result).reduce((acc, [fieldCode, fieldData]) => {
            // Используем formLabel или listLabel как человекочитаемое название, или title если их нет
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
