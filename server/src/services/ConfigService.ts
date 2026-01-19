import { getSettingsService } from './SettingsService'
import config from '../config/config'

/**
 * Интерфейс конфигурации Bitrix24
 */
export interface Bitrix24Config {
	enabled: boolean
	webhookUrl: string | null
}

/**
 * Элемент кеша с TTL
 */
interface CacheEntry<T> {
	value: T
	expiresAt: number
}

/**
 * ConfigService - сервис для управления конфигурацией системы
 * Приоритет: База данных > Environment переменные
 * Кеширование: In-memory с TTL 60 секунд
 */
export class ConfigService {
	private cache: Map<string, CacheEntry<any>> = new Map()
	private readonly CACHE_TTL = 60 * 1000 // 60 секунд

	/**
	 * Получить конфигурацию Bitrix24 с приоритетом БД > .env
	 * @returns Конфигурация Bitrix24
	 */
	async getBitrix24Config(): Promise<Bitrix24Config> {
		const cacheKey = 'bitrix24.config'

		// Проверяем кеш
		const cached = this.getFromCache<Bitrix24Config>(cacheKey)
		if (cached) {
			return cached
		}

		const settingsService = getSettingsService()

		// 1. Проверяем БД на наличие настройки enabled
		const dbEnabled = await settingsService.getSettingValue<boolean>('bitrix24.enabled')
		const dbWebhookUrl = await settingsService.getSettingValueDecrypted<string>('bitrix24.webhook_url')

		// 2. Определяем источник конфигурации
		let enabled: boolean
		let webhookUrl: string | null

		if (dbEnabled !== undefined) {
			// БД имеет приоритет (даже если значение = false)
			enabled = dbEnabled
			webhookUrl = dbWebhookUrl || null
			console.log('[ConfigService] Bitrix24 конфигурация загружена из БД')
		} else {
			// Fallback на .env
			enabled = config.bitrix24Enabled
			webhookUrl = config.bitrix24WebhookUrl || null
			console.log('[ConfigService] Bitrix24 конфигурация загружена из .env (fallback)')
		}

		const result: Bitrix24Config = {
			enabled,
			webhookUrl,
		}

		// Кешируем результат
		this.setToCache(cacheKey, result)

		return result
	}

	/**
	 * Инвалидация кеша (вызывается при изменении настроек через UI)
	 * @param key - Опциональный ключ для инвалидации конкретного значения
	 */
	invalidateCache(key?: string): void {
		if (key) {
			this.cache.delete(key)
			console.log(`[ConfigService] Кеш инвалидирован для: ${key}`)
		} else {
			this.cache.clear()
			console.log('[ConfigService] Весь кеш очищен')
		}
	}

	/**
	 * Получить значение из кеша
	 */
	private getFromCache<T>(key: string): T | null {
		const entry = this.cache.get(key)
		if (!entry) {
			return null
		}

		// Проверяем истёк ли TTL
		if (Date.now() > entry.expiresAt) {
			this.cache.delete(key)
			return null
		}

		return entry.value as T
	}

	/**
	 * Сохранить значение в кеш
	 */
	private setToCache<T>(key: string, value: T): void {
		this.cache.set(key, {
			value,
			expiresAt: Date.now() + this.CACHE_TTL,
		})
	}
}

// Singleton instance
let configService: ConfigService | null = null

export const getConfigService = (): ConfigService => {
	if (!configService) {
		configService = new ConfigService()
	}
	return configService
}
