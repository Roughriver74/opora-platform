import { Request, Response } from 'express'
import { getSettingsService } from '../services/SettingsService'
import { SettingCategory } from '../database/entities/Settings.entity'
import { getConfigService } from '../services/ConfigService'
import { reinitializeSyncSystem } from '../services/sync'
import bitrix24Service from '../services/bitrix24Service'
import { maskSensitiveData } from '../utils/encryption'

const settingsService = getSettingsService()

// Получение всех настроек
export const getAllSettings = async (
	req: Request,
	res: Response
): Promise<void> => {
	try {
		// Get all settings - use getPublicSettings to avoid exposing sensitive settings
		const publicSettings = await settingsService.getPublicSettings()
		const allSettings = await settingsService.findByCategory(SettingCategory.SYSTEM)
			.then(system => [...publicSettings, ...system.filter(s => !s.isPublic)])
		res.json({
			success: true,
			data: allSettings,
		})
	} catch (error: any) {
		console.error('Ошибка получения настроек:', error)
		res.status(500).json({
			success: false,
			message: 'Ошибка получения настроек',
		})
	}
}

// Получение настроек по категории
export const getSettingsByCategory = async (
	req: Request,
	res: Response
): Promise<void> => {
	try {
		const { category } = req.params
		const settings = await settingsService.findByCategory(category as SettingCategory)
		res.json({
			success: true,
			data: settings,
		})
	} catch (error: any) {
		console.error('Ошибка получения настроек по категории:', error)
		res.status(500).json({
			success: false,
			message: 'Ошибка получения настроек',
		})
	}
}

// Получение конкретной настройки
export const getSetting = async (
	req: Request,
	res: Response
): Promise<void> => {
	try {
		const { key } = req.params
		const setting = await settingsService.findByKey(key)

		if (!setting) {
			res.status(404).json({
				success: false,
				message: 'Настройка не найдена',
			})
			return
		}

		res.json({
			success: true,
			data: setting,
		})
	} catch (error: any) {
		console.error('Ошибка получения настройки:', error)
		res.status(500).json({
			success: false,
			message: 'Ошибка получения настройки',
		})
	}
}

// Создание или обновление настройки
export const updateSetting = async (
	req: Request,
	res: Response
): Promise<void> => {
	try {
		const { key } = req.params
		const { value, description, category, type } = req.body

		const setting = await settingsService.upsertSetting(key, value, {
			description,
			category,
			validation: type ? { type } : undefined,
		})

		res.json({
			success: true,
			data: setting,
			message: 'Настройка обновлена',
		})
	} catch (error: any) {
		console.error('Ошибка обновления настройки:', error)
		res.status(500).json({
			success: false,
			message: 'Ошибка обновления настройки',
		})
	}
}

// Удаление настройки
export const deleteSetting = async (
	req: Request,
	res: Response
): Promise<void> => {
	try {
		const { key } = req.params
		const deleted = await settingsService.deleteSetting(key)

		if (!deleted) {
			res.status(404).json({
				success: false,
				message: 'Настройка не найдена',
			})
			return
		}

		res.json({
			success: true,
			message: 'Настройка удалена',
		})
	} catch (error: any) {
		console.error('Ошибка удаления настройки:', error)
		res.status(500).json({
			success: false,
			message: 'Ошибка удаления настройки',
		})
	}
}

/**
 * Получить конфигурацию Bitrix24 (без раскрытия webhook URL)
 * GET /api/settings/bitrix24/config
 */
export const getBitrix24Config = async (
	req: Request,
	res: Response
): Promise<void> => {
	try {
		const configService = getConfigService()
		const config = await configService.getBitrix24Config()

		res.json({
			success: true,
			data: {
				enabled: config.enabled,
				hasWebhookUrl: !!config.webhookUrl,
				webhookUrl: config.webhookUrl ? maskSensitiveData(config.webhookUrl) : null,
			},
		})
	} catch (error: any) {
		console.error('[SettingsController] Ошибка получения Bitrix24 конфигурации:', error)
		res.status(500).json({
			success: false,
			message: 'Ошибка получения конфигурации Bitrix24',
		})
	}
}

/**
 * Тестирование подключения к Bitrix24
 * POST /api/settings/bitrix24/test-connection
 */
export const testBitrix24Connection = async (
	req: Request,
	res: Response
): Promise<void> => {
	try {
		const configService = getConfigService()
		const config = await configService.getBitrix24Config()

		if (!config.enabled) {
			res.status(400).json({
				success: false,
				message: 'Интеграция с Bitrix24 отключена',
			})
			return
		}

		if (!config.webhookUrl) {
			res.status(400).json({
				success: false,
				message: 'Webhook URL не установлен',
			})
			return
		}

		// Пробуем получить поля сделок как тест подключения
		const result = await bitrix24Service.getDealFields()

		if (result && result.result) {
			res.json({
				success: true,
				message: 'Подключение к Bitrix24 успешно',
				data: {
					fieldsCount: Object.keys(result.result).length,
				},
			})
		} else {
			res.status(500).json({
				success: false,
				message: 'Не удалось получить данные из Bitrix24',
			})
		}
	} catch (error: any) {
		console.error('[SettingsController] Ошибка тестирования Bitrix24:', error)
		res.status(500).json({
			success: false,
			message: `Ошибка подключения к Bitrix24: ${error.message}`,
		})
	}
}

/**
 * Горячая перезагрузка интеграции Bitrix24
 * POST /api/settings/bitrix24/reload
 * Только для администраторов
 */
export const reloadBitrix24Integration = async (
	req: Request,
	res: Response
): Promise<void> => {
	try {
		await reinitializeSyncSystem()

		res.json({
			success: true,
			message: 'Интеграция Bitrix24 успешно перезагружена',
		})
	} catch (error: any) {
		console.error('[SettingsController] Ошибка перезагрузки Bitrix24:', error)
		res.status(500).json({
			success: false,
			message: `Ошибка перезагрузки интеграции: ${error.message}`,
		})
	}
}

// Инициализация настроек по умолчанию
export const initializeDefaultSettings = async () => {
	try {
		await settingsService.initializeDefaultSettings()
	} catch (error) {
		console.error('❌ Ошибка инициализации настроек:', error)
	}
}