import {
	getContactRepository,
	ContactRepository,
	ContactFilterOptions,
} from '../database/repositories'
import { Contact, ContactType, ContactSyncStatus } from '../database/entities'
import { PaginatedResult, PaginationOptions } from '../database/repositories/base/BaseRepository'

/**
 * DTO для создания контакта
 */
export interface CreateContactDTO {
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
export interface UpdateContactDTO extends Partial<CreateContactDTO> {
	isActive?: boolean
	syncStatus?: ContactSyncStatus
}

/**
 * Сервис для работы с контактами
 */
export class ContactService {
	private repository: ContactRepository

	constructor() {
		this.repository = getContactRepository()
	}

	/**
	 * Получить все контакты с фильтрацией и пагинацией
	 */
	async findAll(
		options: PaginationOptions & ContactFilterOptions = {}
	): Promise<PaginatedResult<Contact>> {
		return this.repository.findWithFilters(options)
	}

	/**
	 * Получить контакт по ID
	 */
	async findById(id: string): Promise<Contact | null> {
		return this.repository.findOne({
			where: { id },
			relations: ['company'],
		})
	}

	/**
	 * Найти контакт по телефону
	 */
	async findByPhone(phone: string): Promise<Contact | null> {
		return this.repository.findByPhone(phone)
	}

	/**
	 * Найти контакт по email
	 */
	async findByEmail(email: string): Promise<Contact | null> {
		return this.repository.findByEmail(email)
	}

	/**
	 * Найти контакт по Bitrix ID
	 */
	async findByBitrixId(bitrixContactId: string): Promise<Contact | null> {
		return this.repository.findByBitrixId(bitrixContactId)
	}

	/**
	 * Поиск контактов (для автокомплита в формах)
	 */
	async search(query: string, limit: number = 20): Promise<Contact[]> {
		if (!query || query.trim().length === 0) {
			// Возвращаем последние активные контакты
			const result = await this.repository.findWithFilters({
				isActive: true,
				limit,
				sortBy: 'lastName',
				sortOrder: 'ASC',
			})
			return result.data
		}
		return this.repository.search(query, limit)
	}

	/**
	 * Получить контакты компании
	 */
	async findByCompany(
		companyId: string,
		options: PaginationOptions = {}
	): Promise<PaginatedResult<Contact>> {
		return this.repository.findByCompany(companyId, options)
	}

	/**
	 * Получить основной контакт компании
	 */
	async findPrimaryByCompany(companyId: string): Promise<Contact | null> {
		return this.repository.findPrimaryByCompany(companyId)
	}

	/**
	 * Создать новый контакт
	 */
	async create(data: CreateContactDTO): Promise<Contact> {
		// Проверка уникальности Bitrix ID
		if (data.bitrixContactId) {
			const existingByBitrix = await this.repository.isBitrixIdExists(data.bitrixContactId)
			if (existingByBitrix) {
				throw new Error(`Контакт с Bitrix ID ${data.bitrixContactId} уже существует`)
			}
		}

		const contact = new Contact()
		Object.assign(contact, {
			...data,
			isActive: true,
			syncStatus: data.bitrixContactId ? ContactSyncStatus.SYNCED : ContactSyncStatus.LOCAL_ONLY,
		})

		const savedContact = await this.repository.save(contact)

		// Если это основной контакт, обновляем остальные контакты компании
		if (data.isPrimary && data.companyId) {
			await this.repository.setPrimaryContact(savedContact.id, data.companyId)
		}

		return savedContact
	}

	/**
	 * Обновить контакт
	 */
	async update(id: string, data: UpdateContactDTO): Promise<Contact> {
		const contact = await this.repository.findOne({
			where: { id },
			relations: ['company'],
		})
		if (!contact) {
			throw new Error('Контакт не найден')
		}

		// Проверка уникальности Bitrix ID (если изменяется)
		if (data.bitrixContactId && data.bitrixContactId !== contact.bitrixContactId) {
			const existingByBitrix = await this.repository.isBitrixIdExists(data.bitrixContactId, id)
			if (existingByBitrix) {
				throw new Error(`Контакт с Bitrix ID ${data.bitrixContactId} уже существует`)
			}
		}

		Object.assign(contact, data)
		const savedContact = await this.repository.save(contact)

		// Если устанавливаем как основной контакт
		if (data.isPrimary && contact.companyId) {
			await this.repository.setPrimaryContact(savedContact.id, contact.companyId)
		}

		return savedContact
	}

	/**
	 * Удалить контакт (soft delete - деактивация)
	 */
	async delete(id: string): Promise<void> {
		const contact = await this.repository.findById(id)
		if (!contact) {
			throw new Error('Контакт не найден')
		}

		contact.isActive = false
		await this.repository.save(contact)
	}

	/**
	 * Полностью удалить контакт (hard delete)
	 */
	async hardDelete(id: string): Promise<void> {
		const contact = await this.repository.findById(id)
		if (!contact) {
			throw new Error('Контакт не найден')
		}

		await this.repository.delete(id)
	}

	/**
	 * Установить основной контакт для компании
	 */
	async setPrimaryContact(contactId: string, companyId: string): Promise<void> {
		return this.repository.setPrimaryContact(contactId, companyId)
	}

	/**
	 * Получить статистику по контактам
	 */
	async getStats(): Promise<{
		total: number
		active: number
		synced: number
		pending: number
		errors: number
		localOnly: number
		byType: Record<ContactType, number>
		withCompany: number
		withoutCompany: number
	}> {
		return this.repository.getStats()
	}

	/**
	 * Получить контакты с ошибками синхронизации
	 */
	async findWithSyncErrors(): Promise<Contact[]> {
		return this.repository.findWithSyncErrors()
	}

	/**
	 * Получить контакты, требующие синхронизации
	 */
	async findPendingSync(): Promise<Contact[]> {
		return this.repository.findPendingSync()
	}

	/**
	 * Обновить статус синхронизации
	 */
	async updateSyncStatus(
		ids: string[],
		status: ContactSyncStatus,
		error?: { message: string; code?: string }
	): Promise<number> {
		return this.repository.updateSyncStatus(ids, status, error)
	}

	/**
	 * Импорт контакта из Bitrix24
	 */
	async importFromBitrix(bitrixData: {
		bitrixContactId: string
		firstName: string
		lastName?: string
		phone?: string
		email?: string
		companyId?: string
		[key: string]: any
	}): Promise<Contact> {
		// Проверяем, существует ли контакт с таким Bitrix ID
		let contact = await this.repository.findByBitrixId(bitrixData.bitrixContactId)

		if (contact) {
			// Обновляем существующий
			Object.assign(contact, {
				firstName: bitrixData.firstName,
				lastName: bitrixData.lastName || contact.lastName,
				phone: bitrixData.phone || contact.phone,
				email: bitrixData.email || contact.email,
				companyId: bitrixData.companyId || contact.companyId,
				syncStatus: ContactSyncStatus.SYNCED,
				lastSyncAt: new Date(),
				syncError: null,
			})
		} else {
			// Создаем новый
			contact = new Contact()
			Object.assign(contact, {
				bitrixContactId: bitrixData.bitrixContactId,
				firstName: bitrixData.firstName,
				lastName: bitrixData.lastName,
				phone: bitrixData.phone,
				email: bitrixData.email,
				companyId: bitrixData.companyId,
				isActive: true,
				syncStatus: ContactSyncStatus.SYNCED,
				lastSyncAt: new Date(),
			})
		}

		return this.repository.save(contact)
	}
}

// Singleton instance
let contactServiceInstance: ContactService | null = null

export const getContactService = (): ContactService => {
	if (!contactServiceInstance) {
		contactServiceInstance = new ContactService()
	}
	return contactServiceInstance
}

export default ContactService
