/**
 * Интерфейсы для универсальной системы синхронизации (SyncManager)
 * Позволяет подключать разные внешние системы (Bitrix24, 1C, Excel и т.д.)
 */

// =====================================================
// Типы сущностей для синхронизации
// =====================================================

export type SyncEntityType =
	| 'company'
	| 'contact'
	| 'nomenclature'
	| 'submission'
	| 'user'

export type SyncDirection = 'import' | 'export' | 'bidirectional'

export type SyncStatus =
	| 'pending'
	| 'in_progress'
	| 'completed'
	| 'failed'
	| 'partial'

// =====================================================
// Результаты синхронизации
// =====================================================

export interface SyncResult {
	success: boolean
	entityType: SyncEntityType
	direction: SyncDirection
	totalProcessed: number
	created: number
	updated: number
	deleted: number
	failed: number
	errors: SyncError[]
	startedAt: Date
	completedAt: Date
	duration: number // ms
	provider: string
}

export interface SyncError {
	entityId?: string
	externalId?: string
	message: string
	code?: string
	details?: Record<string, any>
}

export interface SyncItemResult {
	success: boolean
	localId?: string
	externalId?: string
	action: 'created' | 'updated' | 'deleted' | 'skipped' | 'failed'
	error?: string
	data?: Record<string, any>
}

// =====================================================
// Конфигурация синхронизации
// =====================================================

export interface SyncOptions {
	/** Размер пакета для обработки */
	batchSize?: number
	/** Задержка между запросами (ms) */
	delayBetweenRequests?: number
	/** Максимум попыток при ошибке */
	maxRetries?: number
	/** Принудительная полная синхронизация */
	forceFullSync?: boolean
	/** Фильтр по дате изменения */
	modifiedSince?: Date
	/** Конкретные ID для синхронизации */
	ids?: string[]
	/** Пропустить существующие записи */
	skipExisting?: boolean
	/** Обновлять только измененные поля */
	updateOnlyChanged?: boolean
	/** Сухой запуск (без реальных изменений) */
	dryRun?: boolean
}

export interface ProviderConfig {
	/** Уникальный идентификатор провайдера */
	id: string
	/** Название провайдера */
	name: string
	/** Включен ли провайдер */
	enabled: boolean
	/** Приоритет (меньше = выше) */
	priority: number
	/** Конфигурация подключения */
	connection: Record<string, any>
	/** Маппинг полей */
	fieldMapping?: FieldMapping[]
	/** Расписание автосинхронизации */
	schedule?: SyncSchedule
}

export interface FieldMapping {
	localField: string
	externalField: string
	direction: SyncDirection
	transform?: 'uppercase' | 'lowercase' | 'trim' | 'date' | 'number' | 'boolean'
	defaultValue?: any
	required?: boolean
}

export interface SyncSchedule {
	enabled: boolean
	cron: string // cron expression
	entityTypes: SyncEntityType[]
	direction: SyncDirection
}

// =====================================================
// Интерфейс провайдера синхронизации
// =====================================================

export interface ISyncProvider {
	/** Уникальный идентификатор провайдера */
	readonly id: string

	/** Название провайдера */
	readonly name: string

	/** Поддерживаемые типы сущностей */
	readonly supportedEntities: SyncEntityType[]

	/** Поддерживаемые направления синхронизации */
	readonly supportedDirections: SyncDirection[]

	/**
	 * Инициализация провайдера
	 */
	initialize(config: ProviderConfig): Promise<void>

	/**
	 * Проверка подключения к внешней системе
	 */
	testConnection(): Promise<{ success: boolean; message: string }>

	/**
	 * Импорт данных из внешней системы в локальную БД
	 */
	importData(
		entityType: SyncEntityType,
		options?: SyncOptions
	): Promise<SyncResult>

	/**
	 * Экспорт данных из локальной БД во внешнюю систему
	 */
	exportData(
		entityType: SyncEntityType,
		options?: SyncOptions
	): Promise<SyncResult>

	/**
	 * Получение количества записей во внешней системе
	 */
	getExternalCount(entityType: SyncEntityType): Promise<number>

	/**
	 * Получение последней даты изменения во внешней системе
	 */
	getLastModifiedDate(entityType: SyncEntityType): Promise<Date | null>

	/**
	 * Очистка ресурсов при отключении
	 */
	dispose(): Promise<void>
}

// =====================================================
// Интерфейс для отслеживания синхронизации
// =====================================================

export interface SyncMetadata {
	id: string
	providerId: string
	entityType: SyncEntityType
	direction: SyncDirection
	status: SyncStatus
	lastSyncAt?: Date
	lastSuccessAt?: Date
	lastErrorAt?: Date
	lastError?: string
	totalSynced: number
	totalFailed: number
	nextScheduledAt?: Date
	config?: Record<string, any>
	createdAt: Date
	updatedAt: Date
}

// =====================================================
// События синхронизации
// =====================================================

export type SyncEventType =
	| 'sync:started'
	| 'sync:progress'
	| 'sync:completed'
	| 'sync:failed'
	| 'sync:item:processed'

export interface SyncEvent {
	type: SyncEventType
	providerId: string
	entityType: SyncEntityType
	direction: SyncDirection
	timestamp: Date
	data?: {
		progress?: number
		totalItems?: number
		processedItems?: number
		result?: SyncResult
		error?: string
		item?: SyncItemResult
	}
}

export type SyncEventHandler = (event: SyncEvent) => void | Promise<void>

// =====================================================
// Интерфейс SyncManager
// =====================================================

export interface ISyncManager {
	/**
	 * Регистрация провайдера синхронизации
	 */
	registerProvider(provider: ISyncProvider, config: ProviderConfig): void

	/**
	 * Удаление провайдера
	 */
	unregisterProvider(providerId: string): void

	/**
	 * Получение списка зарегистрированных провайдеров
	 */
	getProviders(): ProviderConfig[]

	/**
	 * Получение провайдера по ID
	 */
	getProvider(providerId: string): ISyncProvider | null

	/**
	 * Запуск синхронизации
	 */
	sync(
		providerId: string,
		entityType: SyncEntityType,
		direction: SyncDirection,
		options?: SyncOptions
	): Promise<SyncResult>

	/**
	 * Запуск полной синхронизации всех провайдеров
	 */
	syncAll(options?: SyncOptions): Promise<SyncResult[]>

	/**
	 * Получение статуса синхронизации
	 */
	getStatus(providerId?: string): Promise<SyncMetadata[]>

	/**
	 * Подписка на события синхронизации
	 */
	on(event: SyncEventType, handler: SyncEventHandler): void

	/**
	 * Отписка от событий
	 */
	off(event: SyncEventType, handler: SyncEventHandler): void
}
