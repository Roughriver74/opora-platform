/**
 * Модуль синхронизации - экспорт всех компонентов
 */

// Интерфейсы
export * from './interfaces'

// SyncManager (lazy export)
export { syncManager } from './SyncManager'

import { logger } from '../../utils/logger'
import { getConfigService } from '../ConfigService'

/**
 * Инициализация системы синхронизации с провайдерами по умолчанию
 * Использует динамические импорты для избежания циклических зависимостей
 */
export async function initializeSyncSystem(): Promise<void> {
	logger.info('[SyncSystem] 🚀 Инициализация системы синхронизации...')

	try {
		// Чтение конфигурации из БД с fallback на .env
		const configService = getConfigService()
		const bitrix24Config = await configService.getBitrix24Config()

		// Проверка, включена ли интеграция с Bitrix24
		if (!bitrix24Config.enabled) {
			logger.info('[SyncSystem] 🔌 Bitrix24 отключен - режим "только локально"')
			return
		}

		if (!bitrix24Config.webhookUrl) {
			logger.error('[SyncSystem] ❌ Bitrix24 включен, но WEBHOOK_URL не установлен')
			logger.warn('[SyncSystem] ⚠️ Переключение в режим "только локально"')
			return
		}

		// Динамический импорт для избежания циклических зависимостей с entities
		const { syncManager } = await import('./SyncManager')
		const { bitrix24SyncProvider } = await import('./providers/Bitrix24SyncProvider')

		// Регистрируем Bitrix24 провайдер
		syncManager.registerProvider(bitrix24SyncProvider, {
			id: 'bitrix24',
			name: 'Bitrix24 CRM',
			enabled: true,
			priority: 1,
			connection: {
				webhookUrl: process.env.BITRIX24_WEBHOOK_URL,
			},
		})

		// Инициализируем провайдер
		await bitrix24SyncProvider.initialize({
			id: 'bitrix24',
			name: 'Bitrix24 CRM',
			enabled: true,
			priority: 1,
			connection: {},
		})

		logger.info('[SyncSystem] ✅ Система синхронизации инициализирована')
	} catch (error: any) {
		logger.error(`[SyncSystem] ❌ Ошибка: ${error.message}`)
		logger.warn('[SyncSystem] ⚠️ Переключение в режим "только локально"')
		// Не бросаем ошибку - сервер продолжит работу в локальном режиме
	}
}

/**
 * Горячая перезагрузка системы синхронизации
 * Используется при изменении настроек Bitrix24 через UI
 */
export async function reinitializeSyncSystem(): Promise<void> {
	logger.info('[SyncSystem] 🔄 Перезагрузка системы синхронизации...')

	try {
		// Инвалидируем кеш конфигурации
		const configService = getConfigService()
		configService.invalidateCache('bitrix24.config')

		// Переинициализируем систему синхронизации
		await initializeSyncSystem()

		logger.info('[SyncSystem] ✅ Система синхронизации перезагружена')
	} catch (error: any) {
		logger.error(`[SyncSystem] ❌ Ошибка перезагрузки: ${error.message}`)
		throw error
	}
}
