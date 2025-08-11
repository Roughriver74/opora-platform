"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateFieldsOrder = exports.searchContacts = exports.searchCompanies = exports.searchProducts = exports.debugFieldStructure = exports.getAllEnumFieldsWithValues = exports.getEnumFieldValues = exports.getUserFields = exports.getContactsList = exports.getCompaniesList = exports.getProductsList = exports.getBitrixFields = exports.deleteField = exports.updateField = exports.createField = exports.getFieldById = exports.getAllFields = void 0;
const FormFieldService_1 = require("../services/FormFieldService");
const FormService_1 = require("../services/FormService");
const bitrix24Service_1 = __importDefault(require("../services/bitrix24Service"));
const formFieldService = (0, FormFieldService_1.getFormFieldService)();
const formService = (0, FormService_1.getFormService)();
// Получение всех полей формы
const getAllFields = async (req, res) => {
    try {
        const { formId } = req.query;
        if (formId) {
            const fields = await formFieldService.findByFormId(formId);
            res.status(200).json(fields);
        }
        else {
            // Если formId не указан, возвращаем пустой массив
            res.status(200).json([]);
        }
    }
    catch (error) {
        console.error('❌ Ошибка при получении полей:', error);
        res.status(500).json({ message: error.message });
    }
};
exports.getAllFields = getAllFields;
// Получение конкретного поля формы по ID
const getFieldById = async (req, res) => {
    try {
        const field = await formFieldService.findById(req.params.id);
        if (!field) {
            res.status(404).json({ message: 'Поле не найдено' });
            return;
        }
        res.status(200).json(field);
    }
    catch (error) {
        console.error('❌ Ошибка при получении поля:', error);
        res.status(500).json({ message: error.message });
    }
};
exports.getFieldById = getFieldById;
// Создание нового поля формы
const createField = async (req, res) => {
    try {
        const fieldData = req.body;
        console.log('Creating field with data:', {
            name: fieldData.name,
            type: fieldData.type,
            formId: fieldData.formId,
        });
        if (!fieldData.formId) {
            res.status(400).json({ message: 'formId обязателен для создания поля' });
            return;
        }
        // Проверяем существование формы
        const form = await formService.findById(fieldData.formId);
        if (!form) {
            res.status(404).json({ message: `Форма с ID ${fieldData.formId} не найдена` });
            return;
        }
        const savedField = await formFieldService.createField(fieldData);
        res.status(201).json(savedField);
    }
    catch (error) {
        console.error('❌ Ошибка при создании поля:', error);
        res.status(400).json({ message: error.message });
    }
};
exports.createField = createField;
// Обновление существующего поля формы
const updateField = async (req, res) => {
    try {
        const updatedField = await formFieldService.updateField(req.params.id, req.body);
        if (!updatedField) {
            res.status(404).json({ message: 'Поле не найдено' });
            return;
        }
        console.log('Field updated successfully:', {
            id: updatedField.id,
            name: updatedField.name,
            label: updatedField.label,
            type: updatedField.type,
            order: updatedField.order,
        });
        res.status(200).json(updatedField);
    }
    catch (error) {
        console.error('❌ Ошибка при обновлении поля:', error);
        res.status(400).json({ message: error.message });
    }
};
exports.updateField = updateField;
// Удаление поля формы
const deleteField = async (req, res) => {
    try {
        const deleted = await formFieldService.deleteField(req.params.id);
        if (!deleted) {
            res.status(404).json({ message: 'Поле не найдено' });
            return;
        }
        res.status(200).json({ message: 'Поле успешно удалено' });
    }
    catch (error) {
        console.error('❌ Ошибка при удалении поля:', error);
        res.status(500).json({ message: error.message });
    }
};
exports.deleteField = deleteField;
// Получение доступных полей из Битрикс24
const getBitrixFields = async (req, res) => {
    try {
        const fieldsResponse = await bitrix24Service_1.default.getDealFields();
        if (!fieldsResponse || !fieldsResponse.result) {
            res.status(404).json({ message: 'Не удалось получить поля из Битрикс24' });
            return;
        }
        const formattedFields = Object.entries(fieldsResponse.result).reduce((acc, [fieldCode, fieldData]) => {
            const fieldName = fieldData.formLabel ||
                fieldData.listLabel ||
                fieldData.title ||
                fieldCode;
            acc[fieldCode] = {
                code: fieldCode,
                name: fieldName,
                type: fieldData.type,
                isRequired: fieldData.isRequired,
                isMultiple: fieldData.isMultiple,
                items: fieldData.items, // Для полей типа enumeration
                originalData: fieldData, // Сохраняем исходные данные для полной совместимости
            };
            return acc;
        }, {});
        res.status(200).json({
            result: formattedFields,
            time: fieldsResponse.time,
        });
    }
    catch (error) {
        console.error('Ошибка при получении полей из Битрикс24:', error);
        res.status(500).json({ message: error.message });
    }
};
exports.getBitrixFields = getBitrixFields;
// Получение номенклатуры из Битрикс24 для динамических полей
const getProductsList = async (req, res) => {
    try {
        const { query } = req.query;
        const products = await bitrix24Service_1.default.getProducts(query);
        res.status(200).json(products);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getProductsList = getProductsList;
// Получение списка компаний из Битрикс24
const getCompaniesList = async (req, res) => {
    try {
        const { query } = req.query;
        const user = req.user; // Получаем пользователя из middleware
        // Определяем параметры фильтрации
        let assignedFilter = null;
        // @ts-ignore - bitrix_id добавлен в AuthUser
        if (user && user.settings?.onlyMyCompanies && user.bitrix_id) {
            // @ts-ignore
            assignedFilter = user.bitrix_id;
        }
        console.log('Search params:', {
            query: query,
            userId: user?.id,
            // @ts-ignore
            bitrixId: user?.bitrix_id,
            onlyMyCompanies: user?.settings?.onlyMyCompanies,
            assignedFilter,
        });
        const companies = await bitrix24Service_1.default.getCompanies(query, 50, assignedFilter);
        res.status(200).json(companies);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getCompaniesList = getCompaniesList;
// Получение списка контактов из Битрикс24
const getContactsList = async (req, res) => {
    try {
        const { query } = req.query;
        const contacts = await bitrix24Service_1.default.getContacts(query);
        res.status(200).json(contacts);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getContactsList = getContactsList;
// Получение пользовательских полей из Битрикс24
const getUserFields = async (req, res) => {
    try {
        const userFields = await bitrix24Service_1.default.getUserFields();
        res.status(200).json(userFields);
    }
    catch (error) {
        console.error('Ошибка при получении пользовательских полей:', error);
        res.status(500).json({ message: error.message });
    }
};
exports.getUserFields = getUserFields;
// Получение значений для конкретного поля типа enumeration
const getEnumFieldValues = async (req, res) => {
    try {
        const { fieldId } = req.params;
        const enumValues = await bitrix24Service_1.default.getEnumFieldValues(fieldId);
        res.status(200).json(enumValues);
    }
    catch (error) {
        console.error(`Ошибка при получении значений для поля ${req.params.fieldId}:`, error);
        res.status(500).json({ message: error.message });
    }
};
exports.getEnumFieldValues = getEnumFieldValues;
// Получение всех полей типа enumeration с их значениями
const getAllEnumFieldsWithValues = async (req, res) => {
    try {
        const enumFieldsWithValues = await bitrix24Service_1.default.getAllEnumFieldsWithValues();
        res.status(200).json(enumFieldsWithValues);
    }
    catch (error) {
        console.error('Ошибка при получении полей с их значениями:', error);
        res.status(500).json({ message: error.message });
    }
};
exports.getAllEnumFieldsWithValues = getAllEnumFieldsWithValues;
// Отладочный метод для исследования структуры полей
const debugFieldStructure = async (req, res) => {
    try {
        const debugInfo = await bitrix24Service_1.default.debugFieldStructure();
        res.status(200).json(debugInfo);
    }
    catch (error) {
        console.error('Ошибка при отладке структуры полей:', error);
        res.status(500).json({ message: error.message });
    }
};
exports.debugFieldStructure = debugFieldStructure;
// POST методы для поиска битрикс данных (новые)
// Поиск продуктов (POST)
const searchProducts = async (req, res) => {
    try {
        const { query } = req.body;
        const products = await bitrix24Service_1.default.getProducts(query);
        res.status(200).json(products);
    }
    catch (error) {
        console.error('Ошибка при поиске продуктов:', error);
        res.status(500).json({ message: error.message });
    }
};
exports.searchProducts = searchProducts;
// Поиск компаний (POST)
const searchCompanies = async (req, res) => {
    try {
        const { query } = req.body;
        const user = req.user; // Получаем пользователя из middleware
        // Определяем параметры фильтрации
        let assignedFilter = null;
        // @ts-ignore - bitrix_id добавлен в AuthUser
        if (user && user.settings?.onlyMyCompanies && user.bitrix_id) {
            // @ts-ignore
            assignedFilter = user.bitrix_id;
        }
        console.log('Search params:', {
            query: query,
            userId: user?.id,
            // @ts-ignore
            bitrixId: user?.bitrix_id,
            onlyMyCompanies: user?.settings?.onlyMyCompanies,
            assignedFilter,
        });
        const companies = await bitrix24Service_1.default.getCompanies(query, 50, assignedFilter);
        res.status(200).json(companies);
    }
    catch (error) {
        console.error('Ошибка при поиске компаний:', error);
        res.status(500).json({ message: error.message });
    }
};
exports.searchCompanies = searchCompanies;
// Поиск контактов (POST)
const searchContacts = async (req, res) => {
    try {
        const { query } = req.body;
        const contacts = await bitrix24Service_1.default.getContacts(query);
        res.status(200).json(contacts);
    }
    catch (error) {
        console.error('Ошибка при поиске контактов:', error);
        res.status(500).json({ message: error.message });
    }
};
exports.searchContacts = searchContacts;
// Обновление порядка полей
const updateFieldsOrder = async (req, res) => {
    try {
        const { updates } = req.body;
        if (!updates || !Array.isArray(updates)) {
            res.status(400).json({
                success: false,
                message: 'Требуется массив обновлений'
            });
            return;
        }
        const result = await formFieldService.updateFieldsOrder(updates);
        res.status(200).json({
            success: result.success,
            message: 'Порядок полей обновлен',
            updatedCount: result.updatedCount,
            failedCount: updates.length - result.updatedCount
        });
    }
    catch (error) {
        console.error('Ошибка при обновлении порядка полей:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
exports.updateFieldsOrder = updateFieldsOrder;
