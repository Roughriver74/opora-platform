import { Request, Response } from 'express'
import Settings from '../models/Settings'

// Получение всех настроек
export const getAllSettings = async (req: Request, res: Response) => {
	try {
		const settings = await Settings.find().sort({ category: 1, key: 1 })
		res.json({
			success: true,
			data: settings,
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
export const getSettingsByCategory = async (req: Request, res: Response) => {
	try {
		const { category } = req.params
		const settings = await Settings.find({ category }).sort({ key: 1 })
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
export const getSetting = async (req: Request, res: Response) => {
	try {
		const { key } = req.params
		const setting = await Settings.findOne({ key })

		if (!setting) {
			return res.status(404).json({
				success: false,
				message: 'Настройка не найдена',
			})
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
export const updateSetting = async (req: Request, res: Response) => {
	try {
		const { key } = req.params
		const { value, description, category, type } = req.body
		const userId = req.user?.id

		const setting = await Settings.findOneAndUpdate(
			{ key },
			{
				key,
				value,
				description,
				category,
				type,
				updatedBy: userId,
			},
			{
				new: true,
				upsert: true,
				runValidators: true,
			}
		)

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
export const deleteSetting = async (req: Request, res: Response) => {
	try {
		const { key } = req.params
		const setting = await Settings.findOneAndDelete({ key })

		if (!setting) {
			return res.status(404).json({
				success: false,
				message: 'Настройка не найдена',
			})
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
		]

		for (const settingData of defaultSettings) {
			await Settings.findOneAndUpdate({ key: settingData.key }, settingData, {
				upsert: true,
				new: true,
			})
		}

		console.log('✅ Настройки по умолчанию инициализированы')
	} catch (error) {
		console.error('❌ Ошибка инициализации настроек:', error)
	}
}
