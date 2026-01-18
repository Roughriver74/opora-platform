/**
 * Модуль синхронизации - экспорт всех компонентов
 */

// Интерфейсы
export * from './interfaces'

// SyncManager
export { syncManager } from './SyncManager'

// Провайдеры
export { Bitrix24SyncProvider, bitrix24SyncProvider } from './providers/Bitrix24SyncProvider'

// Инициализация провайдеров по умолчанию
import { syncManager } from './SyncManager'
import { bitrix24SyncProvider } from './providers/Bitrix24SyncProvider'
import { logger } from '../../utils/logger'

/**
 * Инициализация системы синхронизации с провайдерами по умолчанию
 */
export async function initializeSyncSystem(): Promise<void> {
	logger.info('[SyncSystem] Инициализация системы синхронизации...')

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
}
