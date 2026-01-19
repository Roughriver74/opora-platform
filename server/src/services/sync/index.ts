/**
 * Модуль синхронизации - экспорт всех компонентов
 */

// Интерфейсы
export * from './interfaces'

// SyncManager (lazy export)
export { syncManager } from './SyncManager'

import { logger } from '../../utils/logger'
import config from '../../config/config'

/**
 * Инициализация системы синхронизации с провайдерами по умолчанию
 * Использует динамические импорты для избежания циклических зависимостей
 */
export async function initializeSyncSystem(): Promise<void> {
	logger.info('[SyncSystem] 🚀 Инициализация системы синхронизации...')

	try {
		// Проверка, включена ли интеграция с Bitrix24
		if (!config.bitrix24Enabled) {
			logger.info('[SyncSystem] 🔌 Bitrix24 отключен - режим "только локально"')
			return
		}

		if (!config.bitrix24WebhookUrl) {
			logger.error('[SyncSystem] ❌ BITRIX24_ENABLED=true требует BITRIX24_WEBHOOK_URL')
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
