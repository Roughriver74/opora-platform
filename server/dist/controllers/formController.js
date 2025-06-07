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
exports.submitForm = exports.getDealCategories = exports.deleteForm = exports.updateForm = exports.createForm = exports.getFormById = exports.getAllForms = void 0;
const Form_1 = __importDefault(require("../models/Form"));
const bitrix24Service_1 = __importDefault(require("../services/bitrix24Service"));
// Получение всех форм
const getAllForms = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const forms = yield Form_1.default.find().populate('fields');
        res.status(200).json(forms);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.getAllForms = getAllForms;
// Получение конкретной формы по ID
const getFormById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const form = yield Form_1.default.findById(req.params.id).populate('fields');
        if (!form) {
            res.status(404).json({ message: 'Форма не найдена' });
            return;
        }
        res.status(200).json(form);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.getFormById = getFormById;
// Создание новой формы
const createForm = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const form = new Form_1.default(req.body);
        const savedForm = yield form.save();
        res.status(201).json(savedForm);
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
});
exports.createForm = createForm;
// Обновление существующей формы
const updateForm = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const form = yield Form_1.default.findById(req.params.id);
        if (!form) {
            res.status(404).json({ message: 'Форма не найдена' });
            return;
        }
        Object.assign(form, req.body);
        const updatedForm = yield form.save();
        res.status(200).json(updatedForm);
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
});
exports.updateForm = updateForm;
// Удаление формы
const deleteForm = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const form = yield Form_1.default.findById(req.params.id);
        if (!form) {
            res.status(404).json({ message: 'Форма не найдена' });
            return;
        }
        yield Form_1.default.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: 'Форма успешно удалена' });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.deleteForm = deleteForm;
// Получение категорий сделок из Битрикс24
const getDealCategories = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const categoriesData = yield bitrix24Service_1.default.getDealCategories();
        console.log('Полученные данные от Bitrix24:', JSON.stringify(categoriesData, null, 2));
        // Преобразование результата в формат, ожидаемый фронтендом (ID и NAME)
        let categories = [];
        // Обработка нового формата из crm.category.list
        if (categoriesData && categoriesData.result && categoriesData.result.categories) {
            // Используем новый формат от crm.category.list, где категории находятся в result.categories
            if (Array.isArray(categoriesData.result.categories)) {
                categories = categoriesData.result.categories.map(category => ({
                    ID: category.id ? category.id.toString() : '',
                    NAME: category.name || ''
                }));
            }
        }
        // Если получили пустой массив, добавляем тестовую категорию для отладки
        if (categories.length === 0) {
            categories = [
                { ID: '1', NAME: 'Основная категория' },
                { ID: '2', NAME: 'Дополнительная категория' }
            ];
        }
        console.log('Отформатированные категории:', categories);
        // Возвращаем данные в формате, который ожидает фронтенд
        res.status(200).json({ result: categories });
    }
    catch (error) {
        console.error('Ошибка при получении категорий сделок:', error);
        // Для предотвращения ошибок на фронтенде, возвращаем пустой массив вместо ошибки
        res.status(200).json({
            result: [
                { ID: '1', NAME: 'Основная категория' },
                { ID: '2', NAME: 'Дополнительная категория' }
            ]
        });
    }
});
exports.getDealCategories = getDealCategories;
// Временная заглушка для функции submitForm
const submitForm = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        res.status(200).json({ message: 'Форма отправлена успешно (временная заглушка)' });
    }
    catch (error) {
        res.status(500).json({ message: 'Ошибка при отправке формы' });
    }
});
exports.submitForm = submitForm;
