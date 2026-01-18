import api from './api'

/**
 * Типы компаний
 */
export enum CompanyType {
	CUSTOMER = 'customer',
	SUPPLIER = 'supplier',
	PARTNER = 'partner',
	CONTRACTOR = 'contractor',
	OTHER = 'other',
}

/**
 * Статусы синхронизации
 */
export enum CompanySyncStatus {
	SYNCED = 'synced',
	PENDING = 'pending',
	ERROR = 'error',
	LOCAL_ONLY = 'local_only',
}

/**
 * Компания
 */
export interface Company {
	id: string
	name: string
	shortName?: string
	inn?: string
	kpp?: string
	ogrn?: string
	companyType: CompanyType
	legalAddress?: string
	actualAddress?: string
	phone?: string
	email?: string
	website?: string
	industry?: string
	bankName?: string
	bankBik?: string
	bankAccount?: string
	corrAccount?: string
	description?: string
	tags?: string[]
	bitrixCompanyId?: string
	syncStatus: CompanySyncStatus
	lastSyncAt?: string
	syncError?: { message: string; code?: string; timestamp?: string }
	isActive: boolean
	createdAt: string
	updatedAt: string
}

/**
 * DTO для создания компании
 */
export interface CreateCompanyDto {
	name: string
	shortName?: string
	inn?: string
	kpp?: string
	ogrn?: string
	companyType?: CompanyType
	legalAddress?: string
	actualAddress?: string
	phone?: string
	email?: string
	website?: string
	industry?: string
	bankName?: string
	bankBik?: string
	bankAccount?: string
	corrAccount?: string
	description?: string
	tags?: string[]
	bitrixCompanyId?: string
}

/**
 * DTO для обновления компании
 */
export interface UpdateCompanyDto extends Partial<CreateCompanyDto> {
	isActive?: boolean
	syncStatus?: CompanySyncStatus
}

/**
 * Параметры фильтрации списка
 */
export interface CompanyListParams {
	page?: number
	limit?: number
	sortBy?: string
	sortOrder?: 'ASC' | 'DESC'
	companyType?: CompanyType
	syncStatus?: CompanySyncStatus
	isActive?: boolean
	search?: string
	tags?: string[]
	industry?: string
}

/**
 * Пагинированный результат
 */
export interface PaginatedResult<T> {
	data: T[]
	pagination: {
		total: number
		page: number
		limit: number
		totalPages: number
		hasNext: boolean
		hasPrev: boolean
	}
}

/**
 * Результат поиска для форм
 */
export interface CompanySearchResult {
	value: string
	label: string
	metadata: {
		localId: string
		bitrixId?: string
		inn?: string
		phone?: string
		email?: string
		shortName?: string
	}
}

/**
 * Статистика компаний
 */
export interface CompanyStats {
	total: number
	active: number
	synced: number
	pending: number
	errors: number
	localOnly: number
	byType: Record<CompanyType, number>
}

/**
 * Результат импорта из Excel
 */
export interface CompanyImportResult {
	success: boolean
	message?: string
	totalRows: number
	created: number
	updated: number
	skipped: number
	failed: number
	errors: { row: number; field?: string; message: string; data?: any }[]
}

/**
 * Сервис для работы с компаниями
 */
export const CompanyService = {
	// === CRUD операции ===

	/**
	 * Получить список компаний с пагинацией и фильтрами
	 */
	async getAll(params?: CompanyListParams): Promise<PaginatedResult<Company>> {
		const response = await api.get('/api/companies', { params })
		return response.data
	},

	/**
	 * Получить компанию по ID
	 */
	async getById(id: string): Promise<Company> {
		const response = await api.get(`/api/companies/${id}`)
		return response.data.data
	},

	/**
	 * Найти компанию по ИНН
	 */
	async getByInn(inn: string): Promise<Company> {
		const response = await api.get(`/api/companies/by-inn/${encodeURIComponent(inn)}`)
		return response.data.data
	},

	/**
	 * Создать компанию
	 */
	async create(data: CreateCompanyDto): Promise<Company> {
		const response = await api.post('/api/companies', data)
		return response.data.data
	},

	/**
	 * Обновить компанию
	 */
	async update(id: string, data: UpdateCompanyDto): Promise<Company> {
		const response = await api.put(`/api/companies/${id}`, data)
		return response.data.data
	},

	/**
	 * Удалить компанию (soft delete)
	 */
	async delete(id: string): Promise<void> {
		await api.delete(`/api/companies/${id}`)
	},

	/**
	 * Полностью удалить компанию (hard delete)
	 */
	async hardDelete(id: string): Promise<void> {
		await api.delete(`/api/companies/${id}/hard`)
	},

	// === Поиск ===

	/**
	 * Поиск компаний (для автокомплита в формах)
	 */
	async search(query: string, limit: number = 20): Promise<CompanySearchResult[]> {
		const response = await api.get('/api/companies/search', {
			params: { q: query, limit },
		})
		return response.data.data
	},

	// === Синхронизация ===

	/**
	 * Получить компании с ошибками синхронизации
	 */
	async getSyncErrors(): Promise<Company[]> {
		const response = await api.get('/api/companies/sync-errors')
		return response.data.data
	},

	/**
	 * Получить компании, ожидающие синхронизации
	 */
	async getPendingSync(): Promise<Company[]> {
		const response = await api.get('/api/companies/pending-sync')
		return response.data.data
	},

	// === Статистика ===

	/**
	 * Получить статистику по компаниям
	 */
	async getStats(): Promise<CompanyStats> {
		const response = await api.get('/api/companies/stats')
		return response.data.data
	},

	// === Excel импорт/экспорт ===

	/**
	 * Импорт компаний из Excel
	 */
	async importExcel(file: File): Promise<CompanyImportResult> {
		const formData = new FormData()
		formData.append('file', file)

		const response = await api.post('/api/companies/import', formData, {
			headers: {
				'Content-Type': 'multipart/form-data',
			},
		})
		return response.data.data
	},

	/**
	 * Экспорт компаний в Excel
	 */
	async exportExcel(params?: {
		companyType?: CompanyType
		isActive?: boolean
	}): Promise<Blob> {
		const response = await api.get('/api/companies/export', {
			params,
			responseType: 'blob',
		})
		return response.data
	},

	/**
	 * Скачать шаблон Excel для импорта
	 */
	async downloadTemplate(): Promise<Blob> {
		const response = await api.get('/api/companies/template', {
			responseType: 'blob',
		})
		return response.data
	},

	/**
	 * Скачать файл (вспомогательный метод)
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

export default CompanyService
