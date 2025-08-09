"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSettingsService = exports.SettingsService = void 0;
const BaseService_1 = require("./base/BaseService");
const Settings_entity_1 = require("../database/entities/Settings.entity");
const SettingsRepository_1 = require("../database/repositories/SettingsRepository");
class SettingsService extends BaseService_1.BaseService {
    constructor() {
        const repo = new SettingsRepository_1.SettingsRepository('settings');
        super(repo);
    }
    async findByKey(key) {
        return this.repository.findByKey(key);
    }
    async findByCategory(category) {
        return this.repository.findByCategory(category);
    }
    async getSettingValue(key, defaultValue) {
        const setting = await this.findByKey(key);
        return setting ? setting.getValue() : defaultValue;
    }
    async createSetting(data) {
        const existingSetting = await this.findByKey(data.key);
        if (existingSetting) {
            this.throwValidationError(`Настройка с ключом ${data.key} уже существует`);
        }
        const setting = await this.repository.create({
            key: data.key,
            value: data.value,
            category: data.category || Settings_entity_1.SettingCategory.SYSTEM,
            description: data.description,
            isPublic: data.isPublic || false,
            isEncrypted: data.isEncrypted || false,
            validation: data.validation,
        });
        return setting;
    }
    async updateSetting(key, data) {
        const setting = await this.findByKey(key);
        if (!setting) {
            this.throwNotFound('Настройка', key);
        }
        Object.assign(setting, data);
        const updated = await this.repository.update(setting.id, data);
        return updated;
    }
    async upsertSetting(key, value, options) {
        const existingSetting = await this.findByKey(key);
        if (existingSetting) {
            existingSetting.value = value;
            if (options?.description)
                existingSetting.description = options.description;
            if (options?.category)
                existingSetting.category = options.category;
            const updated = await this.repository.update(existingSetting.id, existingSetting);
            return updated || existingSetting;
        }
        else {
            return this.createSetting({ key, value, ...options });
        }
    }
    async deleteSetting(key) {
        return this.repository.deleteSetting(key);
    }
    async getPublicSettings() {
        return this.repository.getPublicSettings();
    }
    async initializeDefaultSettings() {
        const defaultSettings = [
            {
                key: 'submissions.enable_copying',
                value: true,
                description: 'Разрешить копирование заявок пользователями',
                category: Settings_entity_1.SettingCategory.SYSTEM,
                isPublic: true,
            },
            {
                key: 'submissions.copy_button_text',
                value: 'Копировать заявку',
                description: 'Текст кнопки копирования заявки',
                category: Settings_entity_1.SettingCategory.UI,
                isPublic: true,
            },
            {
                key: 'submissions.allow_user_status_change',
                value: true,
                description: 'Разрешить пользователям изменять статус своих заявок',
                category: Settings_entity_1.SettingCategory.SYSTEM,
                isPublic: true,
            },
            {
                key: 'submissions.allow_user_edit',
                value: true,
                description: 'Разрешить пользователям редактировать свои заявки',
                category: Settings_entity_1.SettingCategory.SYSTEM,
                isPublic: true,
            },
            {
                key: 'forms.auto_save_interval',
                value: 30000,
                description: 'Интервал автосохранения форм в миллисекундах',
                category: Settings_entity_1.SettingCategory.SYSTEM,
                validation: { type: 'number', min: 5000, max: 300000 },
            },
            {
                key: 'ui.theme_mode',
                value: 'light',
                description: 'Режим темы интерфейса (light/dark/auto)',
                category: Settings_entity_1.SettingCategory.UI,
                validation: { type: 'string', enum: ['light', 'dark', 'auto'] },
                isPublic: true,
            },
            {
                key: 'system.debug_mode',
                value: false,
                description: 'Режим отладки для разработчиков',
                category: Settings_entity_1.SettingCategory.SYSTEM,
                validation: { type: 'boolean' },
            },
        ];
        for (const settingData of defaultSettings) {
            try {
                await this.upsertSetting(settingData.key, settingData.value, settingData);
            }
            catch (error) {
                console.error(`Ошибка инициализации настройки ${settingData.key}:`, error);
            }
        }
    }
}
exports.SettingsService = SettingsService;
// Singleton instance
let settingsService = null;
const getSettingsService = () => {
    if (!settingsService) {
        settingsService = new SettingsService();
    }
    return settingsService;
};
exports.getSettingsService = getSettingsService;
