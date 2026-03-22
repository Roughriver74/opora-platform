import { BaseService } from './base/BaseService'
import { Settings, SettingCategory } from '../database/entities/Settings.entity'
import { SettingsRepository } from '../database/repositories/SettingsRepository'
import { AppDataSource } from '../database/config/database.config'
import { Repository } from 'typeorm'
import { encrypt, decrypt, isEncrypted as isEncryptedText } from '../utils/encryption'

export interface CreateSettingDTO {
	key: string
	value: any
	category?: SettingCategory
	description?: string
	isPublic?: boolean
	isEncrypted?: boolean
	validation?: any
}

export interface UpdateSettingDTO {
	value?: any
	description?: string
	category?: SettingCategory
	isPublic?: boolean
	validation?: any
}

export class SettingsService extends BaseService<Settings, SettingsRepository> {
	constructor() {
		const repo = new SettingsRepository('settings')
		super(repo)
	}

	async findByKey(key: string, organizationId?: string): Promise<Settings | null> {
		if (organizationId) {
			// Ищем настройку для организации, если не найдена — глобальную (orgId = null)
			const orgSetting = await this.repository.findOne({
				where: { key, organizationId } as any,
			})
			if (orgSetting) return orgSetting
			// Fallback: глобальная настройка
		}
		return this.repository.findByKey(key)
	}

	async findByCategory(category: SettingCategory, organizationId?: string): Promise<Settings[]> {
		if (organizationId) {
			return this.repository.findAll({
				where: { category, organizationId } as any,
			})
		}
		return this.repository.findByCategory(category)
	}

	async getSettingValue<T = any>(key: string, defaultValue?: T, organizationId?: string): Promise<T | undefined> {
		const setting = await this.findByKey(key, organizationId)
		return setting ? setting.getValue<T>() : defaultValue
	}

	/**
	 * Получить значение настройки с автоматическим дешифрованием
	 * @param key - Ключ настройки
	 * @param defaultValue - Значение по умолчанию
	 * @returns Расшифрованное значение или defaultValue
	 */
	async getSettingValueDecrypted<T = any>(key: string, defaultValue?: T): Promise<T | undefined> {
		const setting = await this.findByKey(key)
		if (!setting) {
			return defaultValue
		}

		const value = setting.getValue<any>()

		// Если настройка зашифрована и значение - строка, дешифруем
		if (setting.isEncrypted && typeof value === 'string' && value) {
			try {
				return decrypt(value) as T
			} catch (error: any) {
				console.error(`[SettingsService] Ошибка дешифрования настройки ${key}:`, error.message)
				return defaultValue
			}
		}

		return value as T
	}

	async createSetting(data: CreateSettingDTO & { organizationId?: string }): Promise<Settings> {
		const existingSetting = await this.findByKey(data.key, data.organizationId)
		if (existingSetting) {
			this.throwValidationError(`Настройка с ключом ${data.key} уже существует`)
		}

		// Автошифрование значения, если isEncrypted = true
		let processedValue = data.value
		if (data.isEncrypted && typeof data.value === 'string' && data.value) {
			processedValue = encrypt(data.value)
		}

		const setting = await this.repository.create({
			key: data.key,
			value: processedValue,
			category: data.category || SettingCategory.SYSTEM,
			description: data.description,
			isPublic: data.isPublic || false,
			isEncrypted: data.isEncrypted || false,
			validation: data.validation,
			organizationId: data.organizationId,
		} as any)

		return setting
	}

	async updateSetting(key: string, data: UpdateSettingDTO, organizationId?: string): Promise<Settings | null> {
		const setting = await this.findByKey(key, organizationId)
		if (!setting) {
			this.throwNotFound('Настройка', key)
		}

		// Автошифрование значения, если настройка помечена как зашифрованная
		if (data.value !== undefined && setting.isEncrypted && typeof data.value === 'string' && data.value) {
			data.value = encrypt(data.value)
		}

		Object.assign(setting!, data)
		const updated = await this.repository.update(setting!.id, data)
		return updated
	}

	async upsertSetting(key: string, value: any, options?: Partial<CreateSettingDTO> & { organizationId?: string }): Promise<Settings> {
		const existingSetting = await this.findByKey(key, options?.organizationId)

		if (existingSetting) {
			// Автошифрование при обновлении зашифрованной настройки
			let processedValue = value
			if (existingSetting.isEncrypted && typeof value === 'string' && value) {
				processedValue = encrypt(value)
			}

			existingSetting.value = processedValue
			if (options?.description) existingSetting.description = options.description
			if (options?.category) existingSetting.category = options.category
			const updated = await this.repository.update(existingSetting.id, existingSetting)
			return updated || existingSetting
		} else {
			return this.createSetting({ key, value, ...options })
		}
	}

	async deleteSetting(key: string): Promise<boolean> {
		return this.repository.deleteSetting(key)
	}

	async getPublicSettings(): Promise<Settings[]> {
		return this.repository.getPublicSettings()
	}

	async initializeDefaultSettings(): Promise<void> {
		const defaultSettings: CreateSettingDTO[] = [
			{
				key: 'submissions.enable_copying',
				value: true,
				description: 'Разрешить копирование заявок пользователями',
				category: SettingCategory.SYSTEM,
				isPublic: true,
			},
			{
				key: 'submissions.copy_button_text',
				value: 'Копировать заявку',
				description: 'Текст кнопки копирования заявки',
				category: SettingCategory.UI,
				isPublic: true,
			},
			{
				key: 'submissions.allow_user_status_change',
				value: true,
				description: 'Разрешить пользователям изменять статус своих заявок',
				category: SettingCategory.SYSTEM,
				isPublic: true,
			},
			{
				key: 'submissions.allow_user_edit',
				value: true,
				description: 'Разрешить пользователям редактировать свои заявки',
				category: SettingCategory.SYSTEM,
				isPublic: true,
			},
			{
				key: 'forms.auto_save_interval',
				value: 30000,
				description: 'Интервал автосохранения форм в миллисекундах',
				category: SettingCategory.SYSTEM,
				validation: { type: 'number', min: 5000, max: 300000 },
			},
			{
				key: 'ui.theme_mode',
				value: 'light',
				description: 'Режим темы интерфейса (light/dark/auto)',
				category: SettingCategory.UI,
				validation: { type: 'string', enum: ['light', 'dark', 'auto'] },
				isPublic: true,
			},
			{
				key: 'system.debug_mode',
				value: false,
				description: 'Режим отладки для разработчиков',
				category: SettingCategory.SYSTEM,
				validation: { type: 'boolean' },
			},
			{
				key: 'submissions.material_fields_config',
				value: {},
				description: 'Конфигурация полей материалов для отображения в карточках заявок. Каждая организация настраивает свои материалы через UI.',
				category: SettingCategory.SYSTEM,
				isPublic: true,
			},
			{
				key: 'submissions.special_fields_config',
				value: {
					clientField: '',
					shipmentDateField: '',
					abnTimeField: '',
				},
				description: 'Конфигурация специальных полей формы (поле клиента, даты отгрузки и др.). Каждая организация настраивает свои поля через UI.',
				category: SettingCategory.SYSTEM,
				isPublic: true,
			},
			// Настройки интеграции с Bitrix24
			{
				key: 'bitrix24.enabled',
				value: false,
				description: 'Включить интеграцию с Bitrix24 CRM',
				category: SettingCategory.BITRIX,
				isPublic: false,
				validation: { type: 'boolean', required: true },
			},
			{
				key: 'bitrix24.webhook_url',
				value: '',
				description: 'Webhook URL для Bitrix24 REST API',
				category: SettingCategory.BITRIX,
				isPublic: false,
				isEncrypted: true,
				validation: {
					type: 'string',
					pattern: '^https?://.*bitrix24\\.(ru|com|net|by|kz|ua)/rest/',
				},
			},
		]

		for (const settingData of defaultSettings) {
			try {
				await this.upsertSetting(settingData.key, settingData.value, settingData)
			} catch (error) {
				console.error(`Ошибка инициализации настройки ${settingData.key}:`, error)
			}
		}
	}
}

// Singleton instance
let settingsService: SettingsService | null = null

export const getSettingsService = (): SettingsService => {
	if (!settingsService) {
		settingsService = new SettingsService()
	}
	return settingsService
}
