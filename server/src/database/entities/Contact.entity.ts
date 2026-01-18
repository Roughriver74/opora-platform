import {
	Entity,
	Column,
	ManyToOne,
	JoinColumn,
	Index,
} from 'typeorm'
import {
	IsNotEmpty,
	Length,
	IsOptional,
	IsBoolean,
	IsEnum,
	IsArray,
	IsEmail,
	IsUUID,
} from 'class-validator'
import { AuditableEntity } from './base/AuditableEntity'
import { Company } from './Company.entity'

/**
 * Статус синхронизации с Bitrix24
 */
export enum ContactSyncStatus {
	SYNCED = 'synced',
	PENDING = 'pending',
	ERROR = 'error',
	LOCAL_ONLY = 'local_only',
}

/**
 * Тип контакта
 */
export enum ContactType {
	DECISION_MAKER = 'decision_maker',  // ЛПР (Лицо, принимающее решения)
	MANAGER = 'manager',                // Менеджер
	ACCOUNTANT = 'accountant',          // Бухгалтер
	DIRECTOR = 'director',              // Директор
	DISPATCHER = 'dispatcher',          // Диспетчер
	OTHER = 'other',                    // Прочее
}

@Entity('contacts')
@Index('idx_contacts_search_vector', { synchronize: false }) // GIN index создаётся в миграции
export class Contact extends AuditableEntity {
	// === ФИО ===

	@Column({ name: 'first_name', type: 'varchar', length: 100 })
	@IsNotEmpty({ message: 'Имя обязательно' })
	@Length(1, 100, { message: 'Имя должно быть от 1 до 100 символов' })
	firstName: string

	@Column({ name: 'last_name', type: 'varchar', length: 100, nullable: true })
	@IsOptional()
	@Length(1, 100, { message: 'Фамилия должна быть до 100 символов' })
	lastName: string | null

	@Column({ name: 'middle_name', type: 'varchar', length: 100, nullable: true })
	@IsOptional()
	@Length(1, 100, { message: 'Отчество должно быть до 100 символов' })
	middleName: string | null

	// === Контактные данные ===

	@Column({ type: 'varchar', length: 50, nullable: true })
	@IsOptional()
	@Length(1, 50, { message: 'Телефон должен быть до 50 символов' })
	@Index('idx_contacts_phone')
	phone: string | null

	@Column({ name: 'additional_phones', type: 'varchar', array: true, default: [] })
	@IsOptional()
	@IsArray()
	additionalPhones: string[]

	@Column({ type: 'varchar', length: 255, nullable: true })
	@IsOptional()
	@IsEmail({}, { message: 'Некорректный формат email' })
	@Index('idx_contacts_email')
	email: string | null

	// === Рабочая информация ===

	@Column({ type: 'varchar', length: 255, nullable: true })
	@IsOptional()
	@Length(1, 255, { message: 'Должность должна быть до 255 символов' })
	position: string | null

	@Column({
		name: 'contact_type',
		type: 'enum',
		enum: ContactType,
		default: ContactType.OTHER,
	})
	@IsEnum(ContactType, { message: 'Некорректный тип контакта' })
	contactType: ContactType

	@Column({ type: 'varchar', length: 255, nullable: true })
	@IsOptional()
	department: string | null

	// === Связь с компанией ===

	@Column({ name: 'company_id', type: 'uuid', nullable: true })
	@IsOptional()
	@IsUUID('4', { message: 'Некорректный UUID компании' })
	@Index('idx_contacts_company')
	companyId: string | null

	@ManyToOne(() => Company, { nullable: true, onDelete: 'SET NULL' })
	@JoinColumn({ name: 'company_id' })
	company: Company | null

	// === Дополнительная информация ===

	@Column({ type: 'text', nullable: true })
	@IsOptional()
	notes: string | null

	@Column({ type: 'date', nullable: true })
	@IsOptional()
	birthdate: Date | null

	@Column({ type: 'varchar', length: 500, nullable: true })
	@IsOptional()
	@Length(1, 500, { message: 'Адрес должен быть до 500 символов' })
	address: string | null

	// === Интеграция с Bitrix24 ===

	@Column({ name: 'bitrix_contact_id', type: 'varchar', length: 50, nullable: true, unique: true })
	@IsOptional()
	@Length(1, 50, { message: 'Bitrix24 ID должен быть до 50 символов' })
	@Index('idx_contacts_bitrix_id')
	bitrixContactId: string | null

	@Column({
		name: 'sync_status',
		type: 'enum',
		enum: ContactSyncStatus,
		default: ContactSyncStatus.LOCAL_ONLY,
	})
	@IsEnum(ContactSyncStatus, { message: 'Некорректный статус синхронизации' })
	syncStatus: ContactSyncStatus

	@Column({ name: 'last_sync_at', type: 'timestamp', nullable: true })
	lastSyncAt: Date | null

	@Column({ name: 'sync_error', type: 'jsonb', nullable: true })
	syncError: { message: string; timestamp: Date; code?: string } | null

	// === Дополнительные поля ===

	@Column({ type: 'jsonb', nullable: true })
	@IsOptional()
	attributes: Record<string, any> | null

	@Column({ type: 'varchar', array: true, default: [] })
	@IsArray({ message: 'Теги должны быть массивом' })
	tags: string[]

	@Column({ name: 'is_active', type: 'boolean', default: true })
	@IsOptional()
	@IsBoolean()
	isActive: boolean = true

	@Column({ name: 'is_primary', type: 'boolean', default: false })
	@IsOptional()
	@IsBoolean()
	isPrimary: boolean = false // Основной контакт компании

	// === Полнотекстовый поиск (tsvector) ===
	// Это поле заполняется триггером PostgreSQL автоматически
	@Column({ name: 'search_vector', type: 'tsvector', select: false, nullable: true })
	searchVector: any

	constructor(partial?: Partial<Contact>) {
		super()
		if (partial) {
			Object.assign(this, partial)
		}
	}

	// === Вспомогательные методы ===

	/**
	 * Возвращает полное ФИО
	 */
	getFullName(): string {
		const parts = [this.lastName, this.firstName, this.middleName].filter(Boolean)
		return parts.join(' ') || 'Без имени'
	}

	/**
	 * Возвращает краткое ФИО (Фамилия И.О.)
	 */
	getShortName(): string {
		let result = ''
		if (this.lastName) result += this.lastName
		if (this.firstName) result += ` ${this.firstName.charAt(0)}.`
		if (this.middleName) result += `${this.middleName.charAt(0)}.`
		return result.trim() || 'Без имени'
	}

	/**
	 * Возвращает имя с должностью
	 */
	getNameWithPosition(): string {
		const name = this.getFullName()
		return this.position ? `${name} (${this.position})` : name
	}

	/**
	 * Проверяет, синхронизирован ли контакт с Bitrix24
	 */
	isSyncedWithBitrix(): boolean {
		return this.bitrixContactId !== null && this.syncStatus === ContactSyncStatus.SYNCED
	}

	/**
	 * Проверяет, есть ли ошибка синхронизации
	 */
	hasSyncError(): boolean {
		return this.syncStatus === ContactSyncStatus.ERROR && this.syncError !== null
	}

	/**
	 * Устанавливает ошибку синхронизации
	 */
	setSyncError(message: string, code?: string): void {
		this.syncStatus = ContactSyncStatus.ERROR
		this.syncError = {
			message,
			timestamp: new Date(),
			code,
		}
	}

	/**
	 * Очищает ошибку синхронизации и устанавливает статус
	 */
	clearSyncError(status: ContactSyncStatus = ContactSyncStatus.SYNCED): void {
		this.syncStatus = status
		this.syncError = null
		this.lastSyncAt = new Date()
	}

	/**
	 * Обновляет данные из Bitrix24
	 */
	updateFromBitrix(data: {
		firstName?: string
		lastName?: string
		middleName?: string
		phone?: string
		email?: string
		position?: string
	}): void {
		if (data.firstName) this.firstName = data.firstName
		if (data.lastName !== undefined) this.lastName = data.lastName
		if (data.middleName !== undefined) this.middleName = data.middleName
		if (data.phone !== undefined) this.phone = data.phone
		if (data.email !== undefined) this.email = data.email
		if (data.position !== undefined) this.position = data.position
		this.clearSyncError(ContactSyncStatus.SYNCED)
	}

	/**
	 * Проверяет наличие контактных данных
	 */
	hasContactInfo(): boolean {
		return Boolean(this.phone || this.email)
	}
}
