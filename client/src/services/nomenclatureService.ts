import api from './api'

/**
 * Типы номенклатуры
 */
export enum NomenclatureType {
	PRODUCT = 'product',
	SERVICE = 'service',
	MATERIAL = 'material',
}

/**
 * Статусы синхронизации
 */
export enum NomenclatureSyncStatus {
	SYNCED = 'synced',
	PENDING = 'pending',
	ERROR = 'error',
	LOCAL_ONLY = 'local_only',
}

/**
 * Единица измерения
 */
export interface NomenclatureUnit {
	id: string
	code: string
	name: string
	shortName: string
	okeiCode?: number
	isActive: boolean
}

/**
 * Категория номенклатуры
 */
export interface NomenclatureCategory {
	id: string
	code: string
	name: string
	description?: string
	parentId?: string
	parent?: NomenclatureCategory
	children?: NomenclatureCategory[]
	sortOrder: number
	bitrixSectionId?: string
	isActive: boolean
	createdAt: string
	updatedAt: string
}

/**
 * Номенклатура
 */
export interface Nomenclature {
	id: string
	sku: string
	name: string
	description?: string
	type: NomenclatureType
	categoryId?: string
	category?: NomenclatureCategory
	unitId: string
	unit?: NomenclatureUnit
	price?: number
	currency: string
	costPrice?: number
	bitrixProductId?: string
	bitrixSectionId?: string
	syncStatus: NomenclatureSyncStatus
	lastSyncAt?: string
	syncError?: string
	attributes?: Record<string, any>
	tags?: string[]
	imageUrl?: string
	sortOrder: number
	isActive: boolean
	createdAt: string
	updatedAt: string
}

/**
 * DTO для создания номенклатуры
 */
export interface CreateNomenclatureDto {
	sku: string
	name: string
	description?: string
	type?: NomenclatureType
	categoryId?: string
	unitId: string
	price?: number
	currency?: string
	costPrice?: number
	bitrixProductId?: string
	attributes?: Record<string, any>
	tags?: string[]
	imageUrl?: string
	sortOrder?: number
	isActive?: boolean
}

/**
 * DTO для обновления номенклатуры
 */
export interface UpdateNomenclatureDto {
	sku?: string
	name?: string
	description?: string
	type?: NomenclatureType
	categoryId?: string | null
	unitId?: string
	price?: number | null
	currency?: string
	costPrice?: number | null
	bitrixProductId?: string | null
	syncStatus?: NomenclatureSyncStatus
	attributes?: Record<string, any>
	tags?: string[]
	imageUrl?: string | null
	sortOrder?: number
	isActive?: boolean
}

/**
 * Параметры фильтрации списка
 */
export interface NomenclatureListParams {
	page?: number
	limit?: number
	sortBy?: string
	sortOrder?: 'ASC' | 'DESC'
	categoryId?: string
	type?: NomenclatureType
	syncStatus?: NomenclatureSyncStatus
	isActive?: boolean
	search?: string
	tags?: string[]
	priceMin?: number
	priceMax?: number
}

/**
 * Пагинированный результат
 */
export interface PaginatedResult<T> {
	data: T[]
	total: number
	page: number
	limit: number
	totalPages: number
}

/**
 * Результат поиска для форм
 */
export interface SearchResult {
	id: string
	value: string
	label: string
	metadata: {
		localId: string
		bitrixId?: string
		sku: string
		price?: number
		unit?: string
		category?: string
	}
}

/**
 * Результат импорта
 */
export interface ImportResult {
	success: boolean
	message: string
	total: number
	created: number
	updated: number
	skipped: number
	errors: { row: number; message: string; data?: any }[]
}

/**
 * Результат синхронизации
 */
export interface SyncResult {
	success: boolean
	message: string
	created: number
	updated: number
	errors: number
	errorDetails?: { id: string; message: string }[]
}

/**
 * Статистика номенклатуры
 */
export interface NomenclatureStats {
	total: number
	active: number
	inactive: number
	synced: number
	localOnly: number
	pending: number
	errors: number
	byType: { type: NomenclatureType; count: number }[]
	byCategory: { categoryId: string; categoryName: string; count: number }[]
}

/**
 * DTO для создания категории
 */
export interface CreateCategoryDto {
	code: string
	name: string
	description?: string
	parentId?: string
	sortOrder?: number
}

/**
 * DTO для обновления категории
 */
export interface UpdateCategoryDto {
	code?: string
	name?: string
	description?: string
	parentId?: string | null
	sortOrder?: number
	isActive?: boolean
}

/**
 * Сервис для работы с номенклатурой
 */
export const NomenclatureService = {
	// === CRUD операции ===

	/**
	 * Получить список номенклатуры с пагинацией и фильтрами
	 */
	async getAll(params?: NomenclatureListParams): Promise<PaginatedResult<Nomenclature>> {
		const response = await api.get('/api/nomenclature', { params })
		return response.data
	},

	/**
	 * Получить номенклатуру по ID
	 */
	async getById(id: string): Promise<Nomenclature> {
		const response = await api.get(`/api/nomenclature/${id}`)
		return response.data
	},

	/**
	 * Получить номенклатуру по SKU
	 */
	async getBySku(sku: string): Promise<Nomenclature> {
		const response = await api.get(`/api/nomenclature/sku/${encodeURIComponent(sku)}`)
		return response.data
	},

	/**
	 * Создать номенклатуру
	 */
	async create(data: CreateNomenclatureDto): Promise<Nomenclature> {
		const response = await api.post('/api/nomenclature', data)
		return response.data
	},

	/**
	 * Обновить номенклатуру
	 */
	async update(id: string, data: UpdateNomenclatureDto): Promise<Nomenclature> {
		const response = await api.put(`/api/nomenclature/${id}`, data)
		return response.data
	},

	/**
	 * Удалить номенклатуру
	 */
	async delete(id: string): Promise<void> {
		await api.delete(`/api/nomenclature/${id}`)
	},

	// === Поиск ===

	/**
	 * Поиск номенклатуры (для автокомплита в формах)
	 */
	async search(query: string, limit: number = 20): Promise<{ result: SearchResult[]; total: number }> {
		const response = await api.get('/api/nomenclature/search', {
			params: { query, limit },
		})
		return response.data
	},

	// === Синхронизация ===

	/**
	 * Синхронизация с Bitrix24
	 */
	async syncFromBitrix(): Promise<SyncResult> {
		const response = await api.post('/api/nomenclature/sync-bitrix')
		return response.data
	},

	/**
	 * Получить номенклатуру с ошибками синхронизации
	 */
	async getSyncErrors(): Promise<Nomenclature[]> {
		const response = await api.get('/api/nomenclature/sync-errors')
		return response.data
	},

	// === Импорт/Экспорт ===

	/**
	 * Импорт из Excel файла
	 */
	async importExcel(file: File): Promise<ImportResult> {
		const formData = new FormData()
		formData.append('file', file)

		const response = await api.post('/api/nomenclature/import', formData, {
			headers: {
				'Content-Type': 'multipart/form-data',
			},
		})
		return response.data
	},

	/**
	 * Экспорт в Excel
	 */
	async exportExcel(params?: {
		categoryId?: string
		type?: NomenclatureType
		syncStatus?: NomenclatureSyncStatus
		isActive?: boolean
	}): Promise<Blob> {
		const response = await api.get('/api/nomenclature/export', {
			params,
			responseType: 'blob',
		})
		return response.data
	},

	/**
	 * Скачать шаблон Excel для импорта
	 */
	async downloadTemplate(): Promise<Blob> {
		const response = await api.get('/api/nomenclature/template', {
			responseType: 'blob',
		})
		return response.data
	},

	// === Статистика ===

	/**
	 * Получить статистику номенклатуры
	 */
	async getStats(): Promise<NomenclatureStats> {
		const response = await api.get('/api/nomenclature/stats')
		return response.data
	},

	// === Категории ===

	/**
	 * Получить все категории
	 */
	async getCategories(tree: boolean = false): Promise<NomenclatureCategory[]> {
		const response = await api.get('/api/nomenclature/categories', {
			params: tree ? { tree: 'true' } : {},
		})
		return response.data
	},

	/**
	 * Создать категорию
	 */
	async createCategory(data: CreateCategoryDto): Promise<NomenclatureCategory> {
		const response = await api.post('/api/nomenclature/categories', data)
		return response.data
	},

	/**
	 * Обновить категорию
	 */
	async updateCategory(id: string, data: UpdateCategoryDto): Promise<NomenclatureCategory> {
		const response = await api.put(`/api/nomenclature/categories/${id}`, data)
		return response.data
	},

	/**
	 * Удалить категорию
	 */
	async deleteCategory(id: string): Promise<void> {
		await api.delete(`/api/nomenclature/categories/${id}`)
	},

	// === Единицы измерения ===

	/**
	 * Получить все единицы измерения
	 */
	async getUnits(): Promise<NomenclatureUnit[]> {
		const response = await api.get('/api/nomenclature/units')
		return response.data
	},

	// === Вспомогательные методы ===

	/**
	 * Скачать файл из blob
	 */
	downloadFile(blob: Blob, filename: string): void {
		const url = window.URL.createObjectURL(blob)
		const link = document.createElement('a')
		link.href = url
		link.download = filename
		document.body.appendChild(link)
		link.click()
		document.body.removeChild(link)
		window.URL.revokeObjectURL(url)
	},
}

export default NomenclatureService
