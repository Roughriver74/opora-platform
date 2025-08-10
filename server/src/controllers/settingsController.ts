import { Request, Response } from 'express'
import { getSettingsService } from '../services/SettingsService'
import { SettingCategory } from '../database/entities/Settings.entity'

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

// Инициализация настроек по умолчанию
export const initializeDefaultSettings = async () => {
	try {
		await settingsService.initializeDefaultSettings()
	} catch (error) {
		console.error('❌ Ошибка инициализации настроек:', error)
	}
}