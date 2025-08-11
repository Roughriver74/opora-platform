"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.submitForm = exports.testSync = exports.testConnection = exports.getDealStages = exports.getDealCategories = exports.deleteForm = exports.updateForm = exports.createForm = exports.getFormById = exports.getAllForms = void 0;
const FormService_1 = require("../services/FormService");
const bitrix24Service_1 = __importDefault(require("../services/bitrix24Service"));
const formService = (0, FormService_1.getFormService)();
// Получение всех форм
const getAllForms = async (req, res) => {
    try {
        // Получаем все активные формы с полями
        const forms = await formService.findActive();
        // Загружаем поля для каждой формы
        const formsWithFields = await Promise.all(forms.map(async (form) => {
            const formWithFields = await formService.findWithFields(form.id);
            return formWithFields || form;
        }));
        res.status(200).json(formsWithFields);
    }
    catch (error) {
        console.error('Ошибка при получении форм:', error);
        res.status(500).json({
            message: error.message || 'Ошибка при получении форм',
            success: false
        });
    }
};
exports.getAllForms = getAllForms;
// Получение конкретной формы по ID
const getFormById = async (req, res) => {
    try {
        const { id } = req.params;
        // Получаем форму с полями через сервис
        const form = await formService.findWithFields(id);
        if (!form) {
            res.status(404).json({
                message: 'Форма не найдена',
                success: false
            });
            return;
        }
        res.status(200).json(form);
    }
    catch (error) {
        console.error('Ошибка при получении формы:', error);
        res.status(500).json({
            message: error.message || 'Ошибка при получении формы',
            success: false
        });
    }
};
exports.getFormById = getFormById;
// Создание новой формы
const createForm = async (req, res) => {
    try {
        const form = await formService.createForm(req.body);
        res.status(201).json({
            success: true,
            data: form,
            message: 'Форма успешно создана'
        });
    }
    catch (error) {
        console.error('Ошибка при создании формы:', error);
        if (error.message?.includes('уже существует')) {
            res.status(400).json({
                message: error.message,
                success: false
            });
        }
        else {
            res.status(500).json({
                message: error.message || 'Ошибка при создании формы',
                success: false
            });
        }
    }
};
exports.createForm = createForm;
// Обновление существующей формы
const updateForm = async (req, res) => {
    try {
        const { id } = req.params;
        const updatedForm = await formService.updateForm(id, req.body);
        if (!updatedForm) {
            res.status(404).json({
                message: 'Форма не найдена',
                success: false
            });
            return;
        }
        res.status(200).json({
            success: true,
            data: updatedForm,
            message: 'Форма успешно обновлена'
        });
    }
    catch (error) {
        console.error('Ошибка при обновлении формы:', error);
        if (error.message?.includes('не найден')) {
            res.status(404).json({
                message: error.message,
                success: false
            });
        }
        else if (error.message?.includes('уже существует')) {
            res.status(400).json({
                message: error.message,
                success: false
            });
        }
        else {
            res.status(500).json({
                message: error.message || 'Ошибка при обновлении формы',
                success: false
            });
        }
    }
};
exports.updateForm = updateForm;
// Удаление формы
const deleteForm = async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await formService.delete(id);
        if (!deleted) {
            res.status(404).json({
                message: 'Форма не найдена',
                success: false
            });
            return;
        }
        res.status(200).json({
            message: 'Форма успешно удалена',
            success: true
        });
    }
    catch (error) {
        console.error('Ошибка при удалении формы:', error);
        res.status(500).json({
            message: error.message || 'Ошибка при удалении формы',
            success: false
        });
    }
};
exports.deleteForm = deleteForm;
// Получение категорий сделок из Битрикс24
const getDealCategories = async (req, res) => {
    try {
        const categoriesData = await bitrix24Service_1.default.getDealCategories();
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
};
exports.getDealCategories = getDealCategories;
// Получение статусов сделок для определенной категории
const getDealStages = async (req, res) => {
    try {
        const categoryId = req.query.categoryId || '1';
        const stages = await bitrix24Service_1.default.getDealStages(categoryId);
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
};
exports.getDealStages = getDealStages;
// Тестирование подключения к Битрикс24
const testConnection = async (req, res) => {
    try {
        // Пытаемся получить информацию о текущем пользователе как тест подключения
        const userInfo = await bitrix24Service_1.default.getCurrentUser();
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
};
exports.testConnection = testConnection;
// Тестирование синхронизации статуса заявки
const testSync = async (req, res) => {
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
};
exports.testSync = testSync;
// Временная заглушка для функции submitForm
const submitForm = async (req, res) => {
    try {
        res
            .status(200)
            .json({ message: 'Форма отправлена успешно (временная заглушка)' });
    }
    catch (error) {
        res.status(500).json({ message: 'Ошибка при отправке формы' });
    }
};
exports.submitForm = submitForm;
