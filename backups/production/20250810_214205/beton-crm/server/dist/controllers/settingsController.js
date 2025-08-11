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
exports.initializeDefaultSettings = exports.deleteSetting = exports.updateSetting = exports.getSetting = exports.getSettingsByCategory = exports.getAllSettings = void 0;
const Settings_1 = __importDefault(require("../models/Settings"));
// Получение всех настроек
const getAllSettings = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const settings = yield Settings_1.default.find().sort({ category: 1, key: 1 });
        res.json({
            success: true,
            data: settings,
        });
    }
    catch (error) {
        console.error('Ошибка получения настроек:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка получения настроек',
        });
    }
});
exports.getAllSettings = getAllSettings;
// Получение настроек по категории
const getSettingsByCategory = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { category } = req.params;
        const settings = yield Settings_1.default.find({ category }).sort({ key: 1 });
        res.json({
            success: true,
            data: settings,
        });
    }
    catch (error) {
        console.error('Ошибка получения настроек по категории:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка получения настроек',
        });
    }
});
exports.getSettingsByCategory = getSettingsByCategory;
// Получение конкретной настройки
const getSetting = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { key } = req.params;
        const setting = yield Settings_1.default.findOne({ key });
        if (!setting) {
            res.status(404).json({
                success: false,
                message: 'Настройка не найдена',
            });
            return;
        }
        res.json({
            success: true,
            data: setting,
        });
    }
    catch (error) {
        console.error('Ошибка получения настройки:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка получения настройки',
        });
    }
});
exports.getSetting = getSetting;
// Создание или обновление настройки
const updateSetting = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { key } = req.params;
        const { value, description, category, type } = req.body;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        const setting = yield Settings_1.default.findOneAndUpdate({ key }, {
            key,
            value,
            description,
            category,
            type,
            updatedBy: userId,
        }, {
            new: true,
            upsert: true,
            runValidators: true,
        });
        res.json({
            success: true,
            data: setting,
            message: 'Настройка обновлена',
        });
    }
    catch (error) {
        console.error('Ошибка обновления настройки:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка обновления настройки',
        });
    }
});
exports.updateSetting = updateSetting;
// Удаление настройки
const deleteSetting = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { key } = req.params;
        const setting = yield Settings_1.default.findOneAndDelete({ key });
        if (!setting) {
            res.status(404).json({
                success: false,
                message: 'Настройка не найдена',
            });
            return;
        }
        res.json({
            success: true,
            message: 'Настройка удалена',
        });
    }
    catch (error) {
        console.error('Ошибка удаления настройки:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка удаления настройки',
        });
    }
});
exports.deleteSetting = deleteSetting;
// Инициализация настроек по умолчанию
const initializeDefaultSettings = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const defaultSettings = [
            {
                key: 'submissions.enable_copying',
                value: true,
                description: 'Разрешить копирование заявок пользователями',
                category: 'submissions',
                type: 'boolean',
            },
            {
                key: 'submissions.copy_button_text',
                value: 'Копировать заявку',
                description: 'Текст кнопки копирования заявки',
                category: 'submissions',
                type: 'string',
            },
            {
                key: 'submissions.allow_user_status_change',
                value: true,
                description: 'Разрешить пользователям изменять статус своих заявок',
                category: 'submissions',
                type: 'boolean',
            },
            {
                key: 'submissions.allow_user_edit',
                value: true,
                description: 'Разрешить пользователям редактировать свои заявки',
                category: 'submissions',
                type: 'boolean',
            },
            {
                key: 'forms.auto_save_interval',
                value: 30000,
                description: 'Интервал автосохранения форм в миллисекундах',
                category: 'forms',
                type: 'number',
            },
            {
                key: 'ui.theme_mode',
                value: 'light',
                description: 'Режим темы интерфейса (light/dark/auto)',
                category: 'ui',
                type: 'string',
            },
            {
                key: 'system.debug_mode',
                value: false,
                description: 'Режим отладки для разработчиков',
                category: 'system',
                type: 'boolean',
            },
        ];
        for (const settingData of defaultSettings) {
            yield Settings_1.default.findOneAndUpdate({ key: settingData.key }, settingData, {
                upsert: true,
                new: true,
            });
        }
        console.log('✅ Настройки по умолчанию инициализированы');
    }
    catch (error) {
        console.error('❌ Ошибка инициализации настроек:', error);
    }
});
exports.initializeDefaultSettings = initializeDefaultSettings;
