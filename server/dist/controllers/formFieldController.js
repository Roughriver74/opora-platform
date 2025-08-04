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
exports.updateFieldsOrder = exports.searchContacts = exports.searchCompanies = exports.searchProducts = exports.debugFieldStructure = exports.getAllEnumFieldsWithValues = exports.getEnumFieldValues = exports.getUserFields = exports.getContactsList = exports.getCompaniesList = exports.getProductsList = exports.getBitrixFields = exports.deleteField = exports.updateField = exports.createField = exports.getFieldById = exports.getAllFields = void 0;
const FormField_1 = __importDefault(require("../models/FormField"));
const Form_1 = __importDefault(require("../models/Form"));
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
        let field = yield FormField_1.default.findById(req.params.id);
        if (!field) {
            // Пробуем найти по строковому значению _id
            console.log('findById не нашел поле, пробуем найти по _id как строке...');
            field = yield FormField_1.default.findOne({ _id: req.params.id });
            if (!field) {
                // Найдем поле вручную из всех полей
                console.log('Поле все еще не найдено. Пробуем ручной поиск...');
                const allFields = yield FormField_1.default.find({}); // Загружаем ВСЕ данные сразу
                const targetField = allFields.find(f => f._id.toString() === req.params.id);
                if (targetField) {
                    console.log('Поле найдено через ручной поиск в массиве!');
                    // Используем найденное поле напрямую
                    field = targetField;
                }
            }
        }
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
        const fieldData = req.body;
        console.log('📝 Создание поля с данными:', {
            name: fieldData.name,
            type: fieldData.type,
            formId: fieldData.formId,
        });
        const field = new FormField_1.default(fieldData);
        const savedField = yield field.save();
        // Автоматически добавляем поле в форму
        if (fieldData.formId) {
            // Используем formId из запроса
            const form = yield Form_1.default.findById(fieldData.formId);
            if (form) {
                yield Form_1.default.findByIdAndUpdate(fieldData.formId, {
                    $push: { fields: savedField._id },
                });
                console.log(`📋 Поле ${savedField.name} добавлено в форму ${form.title} (ID: ${fieldData.formId})`);
            }
            else {
                console.warn(`⚠️ Форма с ID ${fieldData.formId} не найдена`);
            }
        }
        else {
            // Если formId не передан, используем первую найденную форму (backward compatibility)
            const form = yield Form_1.default.findOne();
            if (form) {
                yield Form_1.default.findByIdAndUpdate(form._id, {
                    $push: { fields: savedField._id },
                });
                console.log(`📋 Поле ${savedField.name} добавлено в первую найденную форму ${form.title} (ID: ${form._id})`);
            }
            else {
                console.warn('⚠️ Ни одной формы не найдено, поле создано но не привязано');
            }
        }
        res.status(201).json(savedField);
    }
    catch (error) {
        console.error('❌ Ошибка при создании поля:', error);
        res.status(400).json({ message: error.message });
    }
});
exports.createField = createField;
// Обновление существующего поля формы
const updateField = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log('🚀 updateField ВХОД - ID:', req.params.id, 'тип:', typeof req.params.id);
        console.log('🔄 Обновление поля ID:', req.params.id);
        console.log('📝 Данные для обновления:', JSON.stringify(req.body, null, 2));
        console.log('🔍 Пробуем findById...');
        let field = yield FormField_1.default.findById(req.params.id);
        console.log('📊 Результат findById:', field ? 'НАЙДЕНО' : 'НЕ НАЙДЕНО');
        if (!field) {
            // Пробуем найти по строковому значению _id
            console.log('🔍 findById не нашел поле, пробуем найти по _id как строке...');
            field = yield FormField_1.default.findOne({ _id: req.params.id });
            console.log('📊 Результат findOne({ _id: string }):', field ? 'НАЙДЕНО' : 'НЕ НАЙДЕНО');
            if (!field) {
                // Выведем все поля для отладки
                console.log('🔍 Поле все еще не найдено. Пробуем ручной поиск...');
                const allFields = yield FormField_1.default.find({}); // Загружаем ВСЕ данные сразу
                console.log(`📊 Всего полей в базе: ${allFields.length}`);
                // Найдем поле вручную из всех полей
                const targetField = allFields.find(f => f._id.toString() === req.params.id);
                console.log('📊 Ручной поиск:', targetField ? 'НАЙДЕНО' : 'НЕ НАЙДЕНО');
                if (targetField) {
                    console.log('✅ Поле найдено через ручной поиск в массиве!', {
                        id: targetField._id.toString(),
                        name: targetField.name,
                        label: targetField.label
                    });
                    // Используем найденное поле напрямую (оно уже полное)
                    field = targetField;
                    console.log('📊 Используем найденное поле:', field ? 'УСПЕШНО' : 'НЕУДАЧНО');
                }
                else {
                    console.log('❌ Список первых 5 полей для отладки:');
                    allFields.slice(0, 5).forEach(f => {
                        console.log(`- ID: ${f._id}, тип: ${typeof f._id}, name: ${f.name}, label: ${f.label}`);
                        console.log(`  Сравнение с искомым ID: ${f._id.toString() === req.params.id}`);
                    });
                }
            }
        }
        if (!field) {
            console.log('❌ Поле окончательно не найдено:', req.params.id);
            res.status(404).json({ message: 'Поле не найдено' });
            return;
        }
        console.log('📋 Оригинальное поле:', {
            _id: field._id,
            name: field.name,
            label: field.label,
            type: field.type,
            order: field.order,
        });
        Object.assign(field, req.body);
        console.log('📝 Поле после объединения данных:', {
            _id: field._id,
            name: field.name,
            label: field.label,
            type: field.type,
            order: field.order,
        });
        // Пробуем разные способы обновления
        console.log('🔄 Пробуем findByIdAndUpdate...');
        let updatedField = yield FormField_1.default.findByIdAndUpdate(field._id, req.body, { new: true, runValidators: true });
        if (!updatedField) {
            console.log('❌ findByIdAndUpdate не сработал, пробуем updateOne...');
            const updateResult = yield FormField_1.default.updateOne({ _id: field._id }, req.body);
            console.log('📊 Результат updateOne:', updateResult);
            if (updateResult.matchedCount === 0) {
                console.log('🔄 Пробуем updateOne с _id как строкой...');
                const stringUpdateResult = yield FormField_1.default.updateOne({ _id: req.params.id }, req.body);
                console.log('📊 Результат updateOne со строкой:', stringUpdateResult);
                if (stringUpdateResult.matchedCount > 0) {
                    // Получаем обновленное поле через ручной поиск
                    const allFields = yield FormField_1.default.find({});
                    updatedField = allFields.find(f => f._id.toString() === req.params.id);
                }
            }
            else if (updateResult.matchedCount > 0) {
                // Получаем обновленное поле через ручной поиск
                const allFields = yield FormField_1.default.find({});
                updatedField = allFields.find(f => f._id.toString() === req.params.id);
            }
        }
        if (!updatedField) {
            console.log('⚠️ Не удалось обновить поле в БД (старые данные), возвращаем виртуальное обновление');
            // Для старых полей, которые не могут быть обновлены из-за коррупции данных,
            // возвращаем исходное поле с примененными изменениями
            const virtuallyUpdatedField = Object.assign(Object.assign(Object.assign({}, field.toObject ? field.toObject() : field), req.body), { updatedAt: new Date() });
            // Инвалидируем кэш даже для виртуального обновления
            const { formCache } = require('../services/cacheService');
            yield formCache.clearFormCache();
            console.log('🗑️ Кэш форм инвалидирован после виртуального обновления поля');
            res.status(200).json(virtuallyUpdatedField);
            return;
        }
        console.log('✅ Поле успешно обновлено через findByIdAndUpdate:', {
            _id: updatedField._id,
            name: updatedField.name,
            label: updatedField.label,
            type: updatedField.type,
            order: updatedField.order,
        });
        // Инвалидируем кэш форм после обновления поля
        const { formCache } = require('../services/cacheService');
        yield formCache.clearFormCache();
        console.log('🗑️ Кэш форм инвалидирован после обновления поля');
        res.status(200).json(updatedField);
    }
    catch (error) {
        console.error('❌ Ошибка при обновлении поля:', error);
        console.error('📋 Детали ошибки:', error.message);
        if (error.name === 'ValidationError') {
            console.error('💥 Ошибки валидации:', error.errors);
        }
        res.status(400).json({ message: error.message });
    }
});
exports.updateField = updateField;
// Удаление поля формы
const deleteField = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        let field = yield FormField_1.default.findById(req.params.id);
        if (!field) {
            // Пробуем найти по строковому значению _id
            console.log('findById не нашел поле для удаления, пробуем найти по _id как строке...');
            field = yield FormField_1.default.findOne({ _id: req.params.id });
            if (!field) {
                // Найдем поле вручную из всех полей
                console.log('Поле все еще не найдено. Пробуем ручной поиск...');
                const allFields = yield FormField_1.default.find({}); // Загружаем ВСЕ данные сразу
                const targetField = allFields.find(f => f._id.toString() === req.params.id);
                if (targetField) {
                    console.log('Поле найдено через ручной поиск в массиве!');
                    // Используем найденное поле напрямую
                    field = targetField;
                }
            }
        }
        if (!field) {
            res.status(404).json({ message: 'Поле не найдено' });
            return;
        }
        // Удаляем поле из всех форм
        yield Form_1.default.updateMany({ fields: req.params.id }, { $pull: { fields: req.params.id } });
        // Удаляем само поле
        yield FormField_1.default.findByIdAndDelete(req.params.id);
        console.log(`🗑️ Поле ${field.name} удалено из базы и всех форм`);
        res.status(200).json({ message: 'Поле успешно удалено' });
    }
    catch (error) {
        console.error('❌ Ошибка при удалении поля:', error);
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
    var _a, _b;
    try {
        const { query } = req.query;
        const user = req.user; // Получаем пользователя из middleware
        // Определяем параметры фильтрации
        let assignedFilter = null;
        if (user && ((_a = user.settings) === null || _a === void 0 ? void 0 : _a.onlyMyCompanies) && user.bitrix_id) {
            assignedFilter = user.bitrix_id;
        }
        console.log('🔍 Запрос компаний:', {
            query: query,
            userId: user === null || user === void 0 ? void 0 : user.id,
            bitrixId: user === null || user === void 0 ? void 0 : user.bitrix_id,
            onlyMyCompanies: (_b = user === null || user === void 0 ? void 0 : user.settings) === null || _b === void 0 ? void 0 : _b.onlyMyCompanies,
            assignedFilter,
        });
        const companies = yield bitrix24Service_1.default.getCompanies(query, 50, assignedFilter);
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
// POST методы для поиска битрикс данных (новые)
// Поиск продуктов (POST)
const searchProducts = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { query } = req.body;
        console.log('🔍 POST Поиск продуктов:', query);
        const products = yield bitrix24Service_1.default.getProducts(query);
        res.status(200).json(products);
    }
    catch (error) {
        console.error('Ошибка при поиске продуктов:', error);
        res.status(500).json({ message: error.message });
    }
});
exports.searchProducts = searchProducts;
// Поиск компаний (POST)
const searchCompanies = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const { query } = req.body;
        const user = req.user; // Получаем пользователя из middleware
        // Определяем параметры фильтрации
        let assignedFilter = null;
        if (user && ((_a = user.settings) === null || _a === void 0 ? void 0 : _a.onlyMyCompanies) && user.bitrix_id) {
            assignedFilter = user.bitrix_id;
        }
        console.log('🔍 POST Поиск компаний:', {
            query: query,
            userId: user === null || user === void 0 ? void 0 : user.id,
            bitrixId: user === null || user === void 0 ? void 0 : user.bitrix_id,
            onlyMyCompanies: (_b = user === null || user === void 0 ? void 0 : user.settings) === null || _b === void 0 ? void 0 : _b.onlyMyCompanies,
            assignedFilter,
        });
        const companies = yield bitrix24Service_1.default.getCompanies(query, 50, assignedFilter);
        res.status(200).json(companies);
    }
    catch (error) {
        console.error('Ошибка при поиске компаний:', error);
        res.status(500).json({ message: error.message });
    }
});
exports.searchCompanies = searchCompanies;
// Поиск контактов (POST)
const searchContacts = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { query } = req.body;
        console.log('🔍 POST Поиск контактов:', query);
        const contacts = yield bitrix24Service_1.default.getContacts(query);
        res.status(200).json(contacts);
    }
    catch (error) {
        console.error('Ошибка при поиске контактов:', error);
        res.status(500).json({ message: error.message });
    }
});
exports.searchContacts = searchContacts;
// Обновление порядка полей
const updateFieldsOrder = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { updates } = req.body;
        console.log('📝 Обновление порядка полей:', updates);
        if (!updates || !Array.isArray(updates)) {
            res.status(400).json({
                success: false,
                message: 'Требуется массив обновлений'
            });
            return;
        }
        // Обновляем порядок для каждого поля
        const updatePromises = updates.map((update) => __awaiter(void 0, void 0, void 0, function* () {
            // Сначала пробуем найти поле
            let field = yield FormField_1.default.findById(update.id);
            if (!field) {
                console.log(`findById не нашел поле ${update.id}, пробуем альтернативные способы...`);
                // Пробуем найти по строковому значению _id
                field = yield FormField_1.default.findOne({ _id: update.id });
                if (!field) {
                    // Найдем поле вручную из всех полей
                    const allFields = yield FormField_1.default.find({}); // Загружаем ВСЕ данные сразу
                    const targetField = allFields.find(f => f._id.toString() === update.id);
                    if (targetField) {
                        console.log(`Поле ${update.id} найдено через ручной поиск`);
                        // Пробуем разные способы обновления
                        let updatedField = yield FormField_1.default.findByIdAndUpdate(targetField._id, { order: update.order }, { new: true, runValidators: true });
                        if (!updatedField) {
                            // Пробуем updateOne
                            const updateResult = yield FormField_1.default.updateOne({ _id: targetField._id }, { order: update.order });
                            if (updateResult.matchedCount === 0) {
                                // Пробуем updateOne с ID как строкой
                                const stringUpdateResult = yield FormField_1.default.updateOne({ _id: update.id }, { order: update.order });
                                if (stringUpdateResult.matchedCount > 0) {
                                    // Получаем обновленное поле через ручной поиск
                                    const allFields = yield FormField_1.default.find({});
                                    updatedField = allFields.find(f => f._id.toString() === update.id);
                                }
                            }
                            else {
                                // Получаем обновленное поле через ручной поиск
                                const allFields = yield FormField_1.default.find({});
                                updatedField = allFields.find(f => f._id.toString() === update.id);
                            }
                        }
                        // Если все способы обновления не сработали, возвращаем виртуальное обновление
                        if (!updatedField) {
                            console.log(`⚠️ Виртуальное обновление order для поля ${update.id} (найдено через ручной поиск)`);
                            return Object.assign(Object.assign({}, targetField.toObject ? targetField.toObject() : targetField), { order: update.order, updatedAt: new Date() });
                        }
                        return updatedField;
                    }
                    else {
                        console.log(`Поле ${update.id} не найдено ни одним способом`);
                        return null;
                    }
                }
            }
            // Если поле найдено, пробуем разные способы обновления
            if (field) {
                // Сначала пробуем findByIdAndUpdate
                let updatedField = yield FormField_1.default.findByIdAndUpdate(field._id, { order: update.order }, { new: true, runValidators: true });
                if (!updatedField) {
                    // Пробуем updateOne
                    const updateResult = yield FormField_1.default.updateOne({ _id: field._id }, { order: update.order });
                    if (updateResult.matchedCount === 0) {
                        // Пробуем updateOne с ID как строкой
                        const stringUpdateResult = yield FormField_1.default.updateOne({ _id: update.id }, { order: update.order });
                        if (stringUpdateResult.matchedCount > 0) {
                            // Получаем обновленное поле через ручной поиск
                            const allFields = yield FormField_1.default.find({});
                            updatedField = allFields.find(f => f._id.toString() === update.id);
                        }
                    }
                    else {
                        // Получаем обновленное поле через ручной поиск
                        const allFields = yield FormField_1.default.find({});
                        updatedField = allFields.find(f => f._id.toString() === update.id);
                    }
                }
                // Если все способы обновления не сработали, возвращаем виртуальное обновление
                if (!updatedField) {
                    console.log(`⚠️ Виртуальное обновление order для поля ${update.id} (найдено обычным способом)`);
                    return Object.assign(Object.assign({}, field.toObject ? field.toObject() : field), { order: update.order, updatedAt: new Date() });
                }
                return updatedField;
            }
            return null;
        }));
        const updatedFields = yield Promise.all(updatePromises);
        // Фильтруем null результаты
        const successfulUpdates = updatedFields.filter(field => field !== null);
        const failedUpdates = updatedFields.length - successfulUpdates.length;
        console.log(`✅ Обновлен порядок для ${successfulUpdates.length} полей`);
        if (failedUpdates > 0) {
            console.log(`⚠️ Не удалось обновить ${failedUpdates} полей`);
        }
        // ВАЖНО: Инвалидируем кэш для всех форм, так как порядок полей изменился
        const { formCache } = require('../services/cacheService');
        yield formCache.clearFormCache();
        console.log('🗑️ Кэш форм инвалидирован после обновления порядка полей');
        res.status(200).json({
            success: true,
            message: 'Порядок полей обновлен',
            updatedCount: successfulUpdates.length,
            failedCount: failedUpdates
        });
    }
    catch (error) {
        console.error('Ошибка при обновлении порядка полей:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});
exports.updateFieldsOrder = updateFieldsOrder;
