/**
 * SyncManager - Координатор синхронизации с внешними системами
 * Управляет провайдерами, запускает синхронизацию, отслеживает статус
 */

import {
	ISyncManager,
	ISyncProvider,
	ProviderConfig,
	SyncEntityType,
	SyncDirection,
	SyncOptions,
	SyncResult,
	SyncMetadata,
	SyncEventType,
	SyncEventHandler,
	SyncEvent,
	SyncStatus,
} from './interfaces'
import { logger } from '../../utils/logger'

interface RegisteredProvider {
	provider: ISyncProvider
	config: ProviderConfig
}

class SyncManager implements ISyncManager {
	private providers: Map<string, RegisteredProvider> = new Map()
	private eventHandlers: Map<SyncEventType, Set<SyncEventHandler>> = new Map()
	private syncMetadata: Map<string, SyncMetadata> = new Map()
	private activeSyncs: Set<string> = new Set()

	constructor() {
		logger.info('[SyncManager] Инициализация SyncManager')
	}

	/**
	 * Регистрация провайдера синхронизации
	 */
	registerProvider(provider: ISyncProvider, config: ProviderConfig): void {
		if (this.providers.has(config.id)) {
			logger.warn(
				`[SyncManager] Провайдер ${config.id} уже зарегистрирован, перезаписываем`
			)
		}

		this.providers.set(config.id, { provider, config })
		logger.info(
			`[SyncManager] ✅ Провайдер "${config.name}" (${config.id}) зарегистрирован`
		)
		logger.info(
			`[SyncManager]    Поддерживаемые сущности: ${provider.supportedEntities.join(', ')}`
		)
		logger.info(
			`[SyncManager]    Направления: ${provider.supportedDirections.join(', ')}`
		)
	}

	/**
	 * Удаление провайдера
	 */
	unregisterProvider(providerId: string): void {
		const registered = this.providers.get(providerId)
		if (registered) {
			registered.provider.dispose().catch(err => {
				logger.error(
					`[SyncManager] Ошибка при отключении провайдера ${providerId}:`,
					err
				)
			})
			this.providers.delete(providerId)
			logger.info(`[SyncManager] Провайдер ${providerId} удален`)
		}
	}

	/**
	 * Получение списка зарегистрированных провайдеров
	 */
	getProviders(): ProviderConfig[] {
		return Array.from(this.providers.values()).map(r => r.config)
	}

	/**
	 * Получение провайдера по ID
	 */
	getProvider(providerId: string): ISyncProvider | null {
		const registered = this.providers.get(providerId)
		return registered?.provider || null
	}

	/**
	 * Запуск синхронизации
	 */
	async sync(
		providerId: string,
		entityType: SyncEntityType,
		direction: SyncDirection,
		options: SyncOptions = {}
	): Promise<SyncResult> {
		const syncKey = `${providerId}:${entityType}:${direction}`

		// Проверка на дублирующуюся синхронизацию
		if (this.activeSyncs.has(syncKey)) {
			const error = `Синхронизация ${syncKey} уже выполняется`
			logger.warn(`[SyncManager] ${error}`)
			return this.createFailedResult(
				entityType,
				direction,
				providerId,
				error
			)
		}

		const registered = this.providers.get(providerId)
		if (!registered) {
			const error = `Провайдер ${providerId} не найден`
			logger.error(`[SyncManager] ${error}`)
			return this.createFailedResult(
				entityType,
				direction,
				providerId,
				error
			)
		}

		const { provider, config } = registered

		// Проверка поддержки
		if (!provider.supportedEntities.includes(entityType)) {
			const error = `Провайдер ${providerId} не поддерживает сущность ${entityType}`
			logger.error(`[SyncManager] ${error}`)
			return this.createFailedResult(
				entityType,
				direction,
				providerId,
				error
			)
		}

		if (!provider.supportedDirections.includes(direction)) {
			const error = `Провайдер ${providerId} не поддерживает направление ${direction}`
			logger.error(`[SyncManager] ${error}`)
			return this.createFailedResult(
				entityType,
				direction,
				providerId,
				error
			)
		}

		if (!config.enabled) {
			const error = `Провайдер ${providerId} отключен`
			logger.warn(`[SyncManager] ${error}`)
			return this.createFailedResult(
				entityType,
				direction,
				providerId,
				error
			)
		}

		// Начинаем синхронизацию
		this.activeSyncs.add(syncKey)
		const startedAt = new Date()

		this.emitEvent({
			type: 'sync:started',
			providerId,
			entityType,
			direction,
			timestamp: startedAt,
		})

		this.updateMetadata(providerId, entityType, direction, {
			status: 'in_progress',
			lastSyncAt: startedAt,
		})

		logger.info(
			`[SyncManager] 🚀 Запуск синхронизации: ${config.name} / ${entityType} / ${direction}`
		)

		let result: SyncResult

		try {
			if (direction === 'import') {
				result = await provider.importData(entityType, options)
			} else if (direction === 'export') {
				result = await provider.exportData(entityType, options)
			} else {
				// bidirectional - сначала импорт, потом экспорт
				const importResult = await provider.importData(entityType, options)
				const exportResult = await provider.exportData(entityType, options)

				result = this.mergeResults(importResult, exportResult)
			}

			// Обновляем метаданные
			this.updateMetadata(providerId, entityType, direction, {
				status: result.failed > 0 ? 'partial' : 'completed',
				lastSuccessAt: new Date(),
				totalSynced:
					(this.getMetadata(providerId, entityType, direction)?.totalSynced ||
						0) + result.totalProcessed,
			})

			this.emitEvent({
				type: 'sync:completed',
				providerId,
				entityType,
				direction,
				timestamp: new Date(),
				data: { result },
			})

			logger.info(
				`[SyncManager] ✅ Синхронизация завершена: ${result.totalProcessed} обработано, ${result.created} создано, ${result.updated} обновлено, ${result.failed} ошибок`
			)
		} catch (error: any) {
			result = this.createFailedResult(
				entityType,
				direction,
				providerId,
				error.message
			)

			this.updateMetadata(providerId, entityType, direction, {
				status: 'failed',
				lastErrorAt: new Date(),
				lastError: error.message,
				totalFailed:
					(this.getMetadata(providerId, entityType, direction)?.totalFailed ||
						0) + 1,
			})

			this.emitEvent({
				type: 'sync:failed',
				providerId,
				entityType,
				direction,
				timestamp: new Date(),
				data: { error: error.message },
			})

			logger.error(
				`[SyncManager] ❌ Ошибка синхронизации ${syncKey}:`,
				error
			)
		} finally {
			this.activeSyncs.delete(syncKey)
		}

		return result
	}

	/**
	 * Запуск полной синхронизации всех провайдеров
	 */
	async syncAll(options: SyncOptions = {}): Promise<SyncResult[]> {
		const results: SyncResult[] = []

		// Сортируем провайдеров по приоритету
		const sortedProviders = Array.from(this.providers.entries())
			.filter(([_, r]) => r.config.enabled)
			.sort((a, b) => a[1].config.priority - b[1].config.priority)

		logger.info(
			`[SyncManager] 🔄 Запуск полной синхронизации для ${sortedProviders.length} провайдеров`
		)

		for (const [providerId, { provider, config }] of sortedProviders) {
			logger.info(
				`[SyncManager] Синхронизация провайдера: ${config.name}`
			)

			for (const entityType of provider.supportedEntities) {
				// По умолчанию импортируем данные из внешних систем
				const direction: SyncDirection = 'import'

				if (provider.supportedDirections.includes(direction)) {
					const result = await this.sync(
						providerId,
						entityType,
						direction,
						options
					)
					results.push(result)
				}
			}
		}

		const totalProcessed = results.reduce((sum, r) => sum + r.totalProcessed, 0)
		const totalFailed = results.reduce((sum, r) => sum + r.failed, 0)

		logger.info(
			`[SyncManager] ✅ Полная синхронизация завершена: ${totalProcessed} записей, ${totalFailed} ошибок`
		)

		return results
	}

	/**
	 * Получение статуса синхронизации
	 */
	async getStatus(providerId?: string): Promise<SyncMetadata[]> {
		const metadata = Array.from(this.syncMetadata.values())

		if (providerId) {
			return metadata.filter(m => m.providerId === providerId)
		}

		return metadata
	}

	/**
	 * Тест подключения провайдера
	 */
	async testConnection(
		providerId: string
	): Promise<{ success: boolean; message: string }> {
		const registered = this.providers.get(providerId)
		if (!registered) {
			return { success: false, message: `Провайдер ${providerId} не найден` }
		}

		try {
			return await registered.provider.testConnection()
		} catch (error: any) {
			return { success: false, message: error.message }
		}
	}

	/**
	 * Получение статистики по провайдеру
	 */
	async getProviderStats(providerId: string): Promise<{
		provider: ProviderConfig | null
		metadata: SyncMetadata[]
		isActive: boolean
		externalCounts: Record<SyncEntityType, number>
	}> {
		const registered = this.providers.get(providerId)
		if (!registered) {
			return {
				provider: null,
				metadata: [],
				isActive: false,
				externalCounts: {} as Record<SyncEntityType, number>,
			}
		}

		const metadata = await this.getStatus(providerId)
		const isActive = Array.from(this.activeSyncs).some(key =>
			key.startsWith(providerId)
		)

		const externalCounts: Record<string, number> = {}
		for (const entityType of registered.provider.supportedEntities) {
			try {
				externalCounts[entityType] =
					await registered.provider.getExternalCount(entityType)
			} catch {
				externalCounts[entityType] = -1
			}
		}

		return {
			provider: registered.config,
			metadata,
			isActive,
			externalCounts: externalCounts as Record<SyncEntityType, number>,
		}
	}

	/**
	 * Подписка на события синхронизации
	 */
	on(event: SyncEventType, handler: SyncEventHandler): void {
		if (!this.eventHandlers.has(event)) {
			this.eventHandlers.set(event, new Set())
		}
		this.eventHandlers.get(event)!.add(handler)
	}

	/**
	 * Отписка от событий
	 */
	off(event: SyncEventType, handler: SyncEventHandler): void {
		this.eventHandlers.get(event)?.delete(handler)
	}

	// =====================================================
	// Приватные методы
	// =====================================================

	private emitEvent(event: SyncEvent): void {
		const handlers = this.eventHandlers.get(event.type)
		if (handlers) {
			handlers.forEach(handler => {
				try {
					handler(event)
				} catch (error) {
					logger.error(
						`[SyncManager] Ошибка в обработчике события ${event.type}:`,
						error
					)
				}
			})
		}
	}

	private createFailedResult(
		entityType: SyncEntityType,
		direction: SyncDirection,
		provider: string,
		error: string
	): SyncResult {
		const now = new Date()
		return {
			success: false,
			entityType,
			direction,
			totalProcessed: 0,
			created: 0,
			updated: 0,
			deleted: 0,
			failed: 1,
			errors: [{ message: error }],
			startedAt: now,
			completedAt: now,
			duration: 0,
			provider,
		}
	}

	private mergeResults(result1: SyncResult, result2: SyncResult): SyncResult {
		return {
			success: result1.success && result2.success,
			entityType: result1.entityType,
			direction: 'bidirectional',
			totalProcessed: result1.totalProcessed + result2.totalProcessed,
			created: result1.created + result2.created,
			updated: result1.updated + result2.updated,
			deleted: result1.deleted + result2.deleted,
			failed: result1.failed + result2.failed,
			errors: [...result1.errors, ...result2.errors],
			startedAt: result1.startedAt,
			completedAt: result2.completedAt,
			duration: result1.duration + result2.duration,
			provider: result1.provider,
		}
	}

	private getMetadataKey(
		providerId: string,
		entityType: SyncEntityType,
		direction: SyncDirection
	): string {
		return `${providerId}:${entityType}:${direction}`
	}

	private getMetadata(
		providerId: string,
		entityType: SyncEntityType,
		direction: SyncDirection
	): SyncMetadata | undefined {
		return this.syncMetadata.get(
			this.getMetadataKey(providerId, entityType, direction)
		)
	}

	private updateMetadata(
		providerId: string,
		entityType: SyncEntityType,
		direction: SyncDirection,
		updates: Partial<SyncMetadata>
	): void {
		const key = this.getMetadataKey(providerId, entityType, direction)
		const existing = this.syncMetadata.get(key)
		const now = new Date()

		if (existing) {
			this.syncMetadata.set(key, {
				...existing,
				...updates,
				updatedAt: now,
			})
		} else {
			this.syncMetadata.set(key, {
				id: key,
				providerId,
				entityType,
				direction,
				status: 'pending' as SyncStatus,
				totalSynced: 0,
				totalFailed: 0,
				createdAt: now,
				updatedAt: now,
				...updates,
			})
		}
	}
}

// Singleton экземпляр
export const syncManager = new SyncManager()
