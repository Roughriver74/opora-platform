"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeDefaultSettings = exports.deleteSetting = exports.updateSetting = exports.getSetting = exports.getSettingsByCategory = exports.getAllSettings = void 0;
const SettingsService_1 = require("../services/SettingsService");
const Settings_entity_1 = require("../database/entities/Settings.entity");
const settingsService = (0, SettingsService_1.getSettingsService)();
// Получение всех настроек
const getAllSettings = async (req, res) => {
    try {
        // Get all settings - use getPublicSettings to avoid exposing sensitive settings
        const publicSettings = await settingsService.getPublicSettings();
        const allSettings = await settingsService.findByCategory(Settings_entity_1.SettingCategory.SYSTEM)
            .then(system => [...publicSettings, ...system.filter(s => !s.isPublic)]);
        res.json({
            success: true,
            data: allSettings,
        });
    }
    catch (error) {
        console.error('Ошибка получения настроек:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка получения настроек',
        });
    }
};
exports.getAllSettings = getAllSettings;
// Получение настроек по категории
const getSettingsByCategory = async (req, res) => {
    try {
        const { category } = req.params;
        const settings = await settingsService.findByCategory(category);
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
};
exports.getSettingsByCategory = getSettingsByCategory;
// Получение конкретной настройки
const getSetting = async (req, res) => {
    try {
        const { key } = req.params;
        const setting = await settingsService.findByKey(key);
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
};
exports.getSetting = getSetting;
// Создание или обновление настройки
const updateSetting = async (req, res) => {
    try {
        const { key } = req.params;
        const { value, description, category, type } = req.body;
        const setting = await settingsService.upsertSetting(key, value, {
            description,
            category,
            validation: type ? { type } : undefined,
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
};
exports.updateSetting = updateSetting;
// Удаление настройки
const deleteSetting = async (req, res) => {
    try {
        const { key } = req.params;
        const deleted = await settingsService.deleteSetting(key);
        if (!deleted) {
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
};
exports.deleteSetting = deleteSetting;
// Инициализация настроек по умолчанию
const initializeDefaultSettings = async () => {
    try {
        await settingsService.initializeDefaultSettings();
        console.log('✅ Настройки по умолчанию инициализированы');
    }
    catch (error) {
        console.error('❌ Ошибка инициализации настроек:', error);
    }
};
exports.initializeDefaultSettings = initializeDefaultSettings;
