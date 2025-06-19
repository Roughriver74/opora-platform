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
exports.submitForm = exports.testSync = exports.testConnection = exports.getDealStages = exports.getDealCategories = exports.deleteForm = exports.updateForm = exports.createForm = exports.getFormById = exports.getAllForms = void 0;
const Form_1 = __importDefault(require("../models/Form"));
const FormField_1 = __importDefault(require("../models/FormField"));
const bitrix24Service_1 = __importDefault(require("../services/bitrix24Service"));
// Получение всех форм
const getAllForms = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const forms = yield Form_1.default.find();
        // Ручное заполнение полей для каждой формы
        const formsWithFields = yield Promise.all(forms.map((form) => __awaiter(void 0, void 0, void 0, function* () {
            // Получаем все поля для этой формы по formId
            const fields = yield FormField_1.default.find({
                formId: form._id,
            }).sort({ order: 1 });
            return Object.assign(Object.assign({}, form.toObject()), { fields: fields });
        })));
        res.status(200).json(formsWithFields);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.getAllForms = getAllForms;
// Получение конкретной формы по ID
const getFormById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const form = yield Form_1.default.findById(req.params.id);
        if (!form) {
            res.status(404).json({ message: 'Форма не найдена' });
            return;
        }
        // Ручное заполнение полей
        const fields = yield FormField_1.default.find({
            formId: form._id,
        }).sort({ order: 1 });
        const formWithFields = Object.assign(Object.assign({}, form.toObject()), { fields: fields });
        res.status(200).json(formWithFields);
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
        console.log('updateForm вызван с ID:', req.params.id);
        console.log('updateForm данные:', JSON.stringify(req.body, null, 2));
        // Проверяем валидность ObjectId
        if (!req.params.id || !req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
            res.status(400).json({ message: 'Некорректный ID формы' });
            return;
        }
        const form = yield Form_1.default.findById(req.params.id);
        if (!form) {
            console.log('Форма не найдена с ID:', req.params.id);
            res.status(404).json({ message: 'Форма не найдена' });
            return;
        }
        console.log('Текущая форма:', JSON.stringify(form, null, 2));
        // Проверяем уникальность имени, если оно изменяется
        if (req.body.name && req.body.name !== form.name) {
            const existingForm = yield Form_1.default.findOne({
                name: req.body.name,
                _id: { $ne: req.params.id },
            });
            if (existingForm) {
                console.log('Попытка использовать существующее имя:', req.body.name);
                res.status(400).json({ message: 'Форма с таким именем уже существует' });
                return;
            }
        }
        // Безопасное обновление только разрешенных полей
        const allowedFields = [
            'name',
            'title',
            'description',
            'isActive',
            'fields',
            'bitrixDealCategory',
            'successMessage',
        ];
        const updateData = {};
        for (const field of allowedFields) {
            if (req.body[field] !== undefined) {
                updateData[field] = req.body[field];
            }
        }
        // Обновляем форму с использованием findByIdAndUpdate для лучшей обработки версионности
        const updatedForm = yield Form_1.default.findByIdAndUpdate(req.params.id, updateData, {
            new: true,
            runValidators: true,
            lean: false,
        });
        if (!updatedForm) {
            res.status(404).json({ message: 'Форма не найдена после обновления' });
            return;
        }
        console.log('Форма успешно сохранена:', updatedForm._id);
        res.status(200).json(updatedForm);
    }
    catch (error) {
        console.error('Ошибка в updateForm:', error);
        console.error('Stack trace:', error.stack);
        // Более детальная обработка ошибок
        if (error.name === 'ValidationError') {
            res.status(400).json({
                message: 'Ошибка валидации данных',
                details: error.errors,
            });
        }
        else if (error.name === 'MongoError' ||
            error.name === 'MongoServerError') {
            res.status(500).json({
                message: 'Ошибка базы данных',
                details: error.code === 11000 ? 'Дублирование данных' : error.message,
            });
        }
        else {
            res.status(400).json({
                message: error.message || 'Неизвестная ошибка при обновлении формы',
            });
        }
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
        if (categoriesData &&
            categoriesData.result &&
            categoriesData.result.categories) {
            // Используем новый формат от crm.category.list, где категории находятся в result.categories
            if (Array.isArray(categoriesData.result.categories)) {
                categories = categoriesData.result.categories.map(category => ({
                    id: category.id ? category.id.toString() : '',
                    name: category.name || '',
                    sort: parseInt(category.sort) || 0,
                    isDefault: category.isDefault || false,
                }));
            }
        }
        // Если получили пустой массив, добавляем тестовую категорию для отладки
        if (categories.length === 0) {
            categories = [
                { id: '1', name: 'Основная категория', sort: 100, isDefault: true },
                {
                    id: '2',
                    name: 'Дополнительная категория',
                    sort: 200,
                    isDefault: false,
                },
            ];
        }
        console.log('Отформатированные категории:', categories);
        // Возвращаем данные в формате, который ожидает фронтенд
        res.status(200).json({
            success: true,
            data: categories,
        });
    }
    catch (error) {
        console.error('Ошибка при получении категорий сделок:', error);
        // Для предотвращения ошибок на фронтенде, возвращаем пустой массив вместо ошибки
        res.status(200).json({
            success: false,
            message: error.message || 'Ошибка загрузки категорий',
            data: [
                { id: '1', name: 'Основная категория', sort: 100, isDefault: true },
                {
                    id: '2',
                    name: 'Дополнительная категория',
                    sort: 200,
                    isDefault: false,
                },
            ],
        });
    }
});
exports.getDealCategories = getDealCategories;
// Получение статусов сделок для определенной категории
const getDealStages = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const categoryId = req.query.categoryId || '1';
        const stages = yield bitrix24Service_1.default.getDealStages(categoryId);
        res.status(200).json({
            success: true,
            data: stages,
        });
    }
    catch (error) {
        console.error('Ошибка при получении статусов сделок:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Ошибка загрузки статусов',
        });
    }
});
exports.getDealStages = getDealStages;
// Тестирование подключения к Битрикс24
const testConnection = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Пытаемся получить информацию о текущем пользователе как тест подключения
        const userInfo = yield bitrix24Service_1.default.getCurrentUser();
        res.status(200).json({
            success: true,
            message: 'Подключение к Битрикс24 работает успешно',
            data: userInfo,
        });
    }
    catch (error) {
        console.error('Ошибка тестирования подключения:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Ошибка подключения к Битрикс24',
        });
    }
});
exports.testConnection = testConnection;
// Тестирование синхронизации статуса заявки
const testSync = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { submissionId, newStatus } = req.body;
        if (!submissionId || !newStatus) {
            res.status(400).json({
                success: false,
                message: 'Не указан ID заявки или новый статус',
            });
            return;
        }
        // Здесь должна быть логика обновления статуса в Битрикс24
        // Пока что возвращаем успешный результат для тестирования
        res.status(200).json({
            success: true,
            message: 'Тестирование синхронизации выполнено успешно',
            data: {
                submissionId,
                newStatus,
                bitrixDealId: 'test_deal_123', // тестовое значение
            },
        });
    }
    catch (error) {
        console.error('Ошибка тестирования синхронизации:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Ошибка тестирования синхронизации',
        });
    }
});
exports.testSync = testSync;
// Временная заглушка для функции submitForm
const submitForm = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        res
            .status(200)
            .json({ message: 'Форма отправлена успешно (временная заглушка)' });
    }
    catch (error) {
        res.status(500).json({ message: 'Ошибка при отправке формы' });
    }
});
exports.submitForm = submitForm;
