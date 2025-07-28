import api from './api'

export interface Setting {
	_id: string
	key: string
	value: any
	description?: string
	category: string
	type: 'boolean' | 'string' | 'number' | 'object'
	updatedAt: string
	updatedBy?: string
}

export interface SettingUpdate {
	value: any
	description?: string
	category: string
	type: 'boolean' | 'string' | 'number' | 'object'
}

class SettingsService {
	private baseUrl = '/api/settings'

	// Получить все настройки
	async getAllSettings(): Promise<Setting[]> {
		const response = await api.get(this.baseUrl)
		return response.data.data
	}

	// Получить настройки по категории
	async getSettingsByCategory(category: string): Promise<Setting[]> {
		const response = await api.get(
			`${this.baseUrl}/category/${category}`
		)
		return response.data.data
	}

	// Получить конкретную настройку
	async getSetting(key: string): Promise<Setting> {
		const response = await api.get(`${this.baseUrl}/${key}`)
		return response.data.data
	}

	// Обновить настройку
	async updateSetting(key: string, data: SettingUpdate): Promise<Setting> {
		const response = await api.put(`${this.baseUrl}/${key}`, data)
		return response.data.data
	}

	// Удалить настройку
	async deleteSetting(key: string): Promise<void> {
		await api.delete(`${this.baseUrl}/${key}`)
	}

	// Получить значение настройки (упрощенный метод)
	async getSettingValue<T = any>(key: string, defaultValue?: T): Promise<T> {
		try {
			const setting = await this.getSetting(key)
			return setting.value as T
		} catch (error) {
			if (defaultValue !== undefined) {
				return defaultValue
			}
			throw error
		}
	}

	// Обновить только значение настройки (упрощенный метод)
	async updateSettingValue(key: string, value: any): Promise<Setting> {
		// Сначала получаем текущую настройку для сохранения других полей
		try {
			const currentSetting = await this.getSetting(key)
			return await this.updateSetting(key, {
				value,
				description: currentSetting.description,
				category: currentSetting.category,
				type: currentSetting.type,
			})
		} catch (error) {
			// Если настройка не найдена, создаем новую с базовыми параметрами
			return await this.updateSetting(key, {
				value,
				category: 'general',
				type:
					typeof value === 'boolean'
						? 'boolean'
						: typeof value === 'number'
						? 'number'
						: typeof value === 'object'
						? 'object'
						: 'string',
			})
		}
	}
}

export const settingsService = new SettingsService()

// Хук для получения настроек
export const useSettings = () => {
	return {
		settingsService,
	}
}
