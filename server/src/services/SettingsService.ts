import { BaseService } from './base/BaseService'
import { Settings, SettingCategory } from '../database/entities/Settings.entity'
import { SettingsRepository } from '../database/repositories/SettingsRepository'
import { AppDataSource } from '../database/config/database.config'
import { Repository } from 'typeorm'

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

	async findByKey(key: string): Promise<Settings | null> {
		return this.repository.findByKey(key)
	}

	async findByCategory(category: SettingCategory): Promise<Settings[]> {
		return this.repository.findByCategory(category)
	}

	async getSettingValue<T = any>(key: string, defaultValue?: T): Promise<T | undefined> {
		const setting = await this.findByKey(key)
		return setting ? setting.getValue<T>() : defaultValue
	}

	async createSetting(data: CreateSettingDTO): Promise<Settings> {
		const existingSetting = await this.findByKey(data.key)
		if (existingSetting) {
			this.throwValidationError(`Настройка с ключом ${data.key} уже существует`)
		}

		const setting = await this.repository.create({
			key: data.key,
			value: data.value,
			category: data.category || SettingCategory.SYSTEM,
			description: data.description,
			isPublic: data.isPublic || false,
			isEncrypted: data.isEncrypted || false,
			validation: data.validation,
		})

		return setting
	}

	async updateSetting(key: string, data: UpdateSettingDTO): Promise<Settings | null> {
		const setting = await this.findByKey(key)
		if (!setting) {
			this.throwNotFound('Настройка', key)
		}

		Object.assign(setting!, data)
		const updated = await this.repository.update(setting!.id, data)
		return updated
	}

	async upsertSetting(key: string, value: any, options?: Partial<CreateSettingDTO>): Promise<Settings> {
		const existingSetting = await this.findByKey(key)
		
		if (existingSetting) {
			existingSetting.value = value
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
				value: {
					// Поля для бетона (высший приоритет)
					concrete: {
						priority: 1,
						label: 'Бетон',
						fields: [
							'field_1750264442280',
							'field_1750265427938',
							'field_1750365587259',
						],
						volumeFields: [
							'field_1750266620544',
							'field_1750365852471',
							'field_1750365626978',
						],
					},
					// Поля для раствора (средний приоритет)
					mortar: {
						priority: 2,
						label: 'Раствор',
						fields: [
							'field_1750366025933',
							'field_1750365704478',
						],
						volumeFields: [
							'field_1750365827152',
						],
					},
					// Поля для ЦПС (низший приоритет)
					cps: {
						priority: 3,
						label: 'ЦПС',
						fields: [],
						volumeFields: [],
					},
				},
				description: 'Конфигурация полей материалов для отображения в карточках заявок',
				category: SettingCategory.SYSTEM,
				isPublic: true,
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