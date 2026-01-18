import api from './api'
import { Company } from './companyService'

/**
 * Типы контактов
 */
export enum ContactType {
	DECISION_MAKER = 'decision_maker',
	MANAGER = 'manager',
	ACCOUNTANT = 'accountant',
	DIRECTOR = 'director',
	DISPATCHER = 'dispatcher',
	OTHER = 'other',
}

/**
 * Статусы синхронизации
 */
export enum ContactSyncStatus {
	SYNCED = 'synced',
	PENDING = 'pending',
	ERROR = 'error',
	LOCAL_ONLY = 'local_only',
}

/**
 * Контакт
 */
export interface Contact {
	id: string
	firstName: string
	lastName?: string
	middleName?: string
	phone?: string
	email?: string
	position?: string
	department?: string
	contactType: ContactType
	companyId?: string
	company?: Company
	isPrimary: boolean
	description?: string
	tags?: string[]
	bitrixContactId?: string
	syncStatus: ContactSyncStatus
	lastSyncAt?: string
	syncError?: { message: string; code?: string; timestamp?: string }
	isActive: boolean
	createdAt: string
	updatedAt: string
}

/**
 * DTO для создания контакта
 */
export interface CreateContactDto {
	firstName: string
	lastName?: string
	middleName?: string
	phone?: string
	email?: string
	position?: string
	department?: string
	contactType?: ContactType
	companyId?: string
	isPrimary?: boolean
	description?: string
	tags?: string[]
	bitrixContactId?: string
}

/**
 * DTO для обновления контакта
 */
export interface UpdateContactDto extends Partial<CreateContactDto> {
	isActive?: boolean
	syncStatus?: ContactSyncStatus
}

/**
 * Параметры фильтрации списка
 */
export interface ContactListParams {
	page?: number
	limit?: number
	sortBy?: string
	sortOrder?: 'ASC' | 'DESC'
	companyId?: string
	contactType?: ContactType
	syncStatus?: ContactSyncStatus
	isActive?: boolean
	isPrimary?: boolean
	search?: string
	tags?: string[]
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
export interface ContactSearchResult {
	value: string
	label: string
	metadata: {
		localId: string
		bitrixId?: string
		firstName: string
		lastName?: string
		phone?: string
		email?: string
		position?: string
		companyId?: string
		companyName?: string
	}
}

/**
 * Статистика контактов
 */
export interface ContactStats {
	total: number
	active: number
	synced: number
	pending: number
	errors: number
	localOnly: number
	byType: Record<ContactType, number>
	withCompany: number
	withoutCompany: number
}

/**
 * Результат импорта из Excel
 */
export interface ContactImportResult {
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
 * Сервис для работы с контактами
 */
export const ContactService = {
	// === CRUD операции ===

	/**
	 * Получить список контактов с пагинацией и фильтрами
	 */
	async getAll(params?: ContactListParams): Promise<PaginatedResult<Contact>> {
		const response = await api.get('/api/contacts', { params })
		return response.data
	},

	/**
	 * Получить контакт по ID
	 */
	async getById(id: string): Promise<Contact> {
		const response = await api.get(`/api/contacts/${id}`)
		return response.data.data
	},

	/**
	 * Найти контакт по телефону
	 */
	async getByPhone(phone: string): Promise<Contact> {
		const response = await api.get(`/api/contacts/by-phone/${encodeURIComponent(phone)}`)
		return response.data.data
	},

	/**
	 * Найти контакт по email
	 */
	async getByEmail(email: string): Promise<Contact> {
		const response = await api.get(`/api/contacts/by-email/${encodeURIComponent(email)}`)
		return response.data.data
	},

	/**
	 * Получить контакты компании
	 */
	async getByCompany(companyId: string, params?: { page?: number; limit?: number }): Promise<PaginatedResult<Contact>> {
		const response = await api.get(`/api/contacts/by-company/${companyId}`, { params })
		return response.data
	},

	/**
	 * Получить основной контакт компании
	 */
	async getPrimaryByCompany(companyId: string): Promise<Contact> {
		const response = await api.get(`/api/contacts/primary/${companyId}`)
		return response.data.data
	},

	/**
	 * Создать контакт
	 */
	async create(data: CreateContactDto): Promise<Contact> {
		const response = await api.post('/api/contacts', data)
		return response.data.data
	},

	/**
	 * Обновить контакт
	 */
	async update(id: string, data: UpdateContactDto): Promise<Contact> {
		const response = await api.put(`/api/contacts/${id}`, data)
		return response.data.data
	},

	/**
	 * Удалить контакт (soft delete)
	 */
	async delete(id: string): Promise<void> {
		await api.delete(`/api/contacts/${id}`)
	},

	/**
	 * Полностью удалить контакт (hard delete)
	 */
	async hardDelete(id: string): Promise<void> {
		await api.delete(`/api/contacts/${id}/hard`)
	},

	/**
	 * Установить основной контакт для компании
	 */
	async setPrimary(contactId: string, companyId: string): Promise<void> {
		await api.post(`/api/contacts/${contactId}/set-primary`, { companyId })
	},

	// === Поиск ===

	/**
	 * Поиск контактов (для автокомплита в формах)
	 */
	async search(query: string, limit: number = 20, companyId?: string): Promise<ContactSearchResult[]> {
		const response = await api.get('/api/contacts/search', {
			params: { q: query, limit, companyId },
		})
		return response.data.data
	},

	// === Синхронизация ===

	/**
	 * Получить контакты с ошибками синхронизации
	 */
	async getSyncErrors(): Promise<Contact[]> {
		const response = await api.get('/api/contacts/sync-errors')
		return response.data.data
	},

	/**
	 * Получить контакты, ожидающие синхронизации
	 */
	async getPendingSync(): Promise<Contact[]> {
		const response = await api.get('/api/contacts/pending-sync')
		return response.data.data
	},

	// === Статистика ===

	/**
	 * Получить статистику по контактам
	 */
	async getStats(): Promise<ContactStats> {
		const response = await api.get('/api/contacts/stats')
		return response.data.data
	},

	// === Вспомогательные методы ===

	/**
	 * Получить полное имя контакта
	 */
	getFullName(contact: Contact): string {
		return [contact.lastName, contact.firstName, contact.middleName]
			.filter(Boolean)
			.join(' ')
	},

	// === Excel импорт/экспорт ===

	/**
	 * Импорт контактов из Excel
	 */
	async importExcel(file: File): Promise<ContactImportResult> {
		const formData = new FormData()
		formData.append('file', file)

		const response = await api.post('/api/contacts/import', formData, {
			headers: {
				'Content-Type': 'multipart/form-data',
			},
		})
		return response.data.data
	},

	/**
	 * Экспорт контактов в Excel
	 */
	async exportExcel(params?: {
		companyId?: string
		contactType?: ContactType
		isActive?: boolean
	}): Promise<Blob> {
		const response = await api.get('/api/contacts/export', {
			params,
			responseType: 'blob',
		})
		return response.data
	},

	/**
	 * Скачать шаблон Excel для импорта
	 */
	async downloadTemplate(): Promise<Blob> {
		const response = await api.get('/api/contacts/template', {
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

export default ContactService
