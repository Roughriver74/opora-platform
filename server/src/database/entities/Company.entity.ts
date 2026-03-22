import {
	Entity,
	Column,
	OneToMany,
	ManyToOne,
	JoinColumn,
	Index,
} from 'typeorm'
import type { Contact } from './Contact.entity'
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
import { Organization } from './Organization.entity'

/**
 * Тип компании
 */
export enum CompanyType {
	CUSTOMER = 'customer',      // Заказчик
	SUPPLIER = 'supplier',      // Поставщик
	PARTNER = 'partner',        // Партнёр
	CONTRACTOR = 'contractor',  // Подрядчик
	OTHER = 'other',            // Прочее
}

/**
 * Статус синхронизации с Bitrix24
 */
export enum CompanySyncStatus {
	SYNCED = 'synced',
	PENDING = 'pending',
	ERROR = 'error',
	LOCAL_ONLY = 'local_only',
}

@Entity('companies')
@Index('idx_companies_search_vector', { synchronize: false }) // GIN index создаётся в миграции
@Index(['organizationId'])
export class Company extends AuditableEntity {
	@Column({ type: 'uuid', name: 'organization_id', nullable: true })
	@IsOptional()
	@IsUUID()
	organizationId?: string

	@ManyToOne(() => Organization)
	@JoinColumn({ name: 'organization_id' })
	organization?: Organization

	// === Основные реквизиты ===

	@Column({ type: 'varchar', length: 500 })
	@IsNotEmpty({ message: 'Название компании обязательно' })
	@Length(1, 500, { message: 'Название должно быть от 1 до 500 символов' })
	name: string

	@Column({ name: 'short_name', type: 'varchar', length: 255, nullable: true })
	@IsOptional()
	@Length(1, 255, { message: 'Краткое название должно быть до 255 символов' })
	shortName: string | null

	@Column({ type: 'varchar', length: 12, nullable: true })
	@IsOptional()
	@Length(10, 12, { message: 'ИНН должен быть 10 или 12 цифр' })
	@Index('idx_companies_inn')
	inn: string | null

	@Column({ type: 'varchar', length: 9, nullable: true })
	@IsOptional()
	@Length(9, 9, { message: 'КПП должен быть 9 цифр' })
	kpp: string | null

	@Column({ type: 'varchar', length: 15, nullable: true })
	@IsOptional()
	@Length(13, 15, { message: 'ОГРН должен быть 13 или 15 цифр' })
	ogrn: string | null

	// === Адреса ===

	@Column({ name: 'legal_address', type: 'text', nullable: true })
	@IsOptional()
	legalAddress: string | null

	@Column({ name: 'actual_address', type: 'text', nullable: true })
	@IsOptional()
	actualAddress: string | null

	@Column({ name: 'postal_address', type: 'text', nullable: true })
	@IsOptional()
	postalAddress: string | null

	// === Контактные данные ===

	@Column({ type: 'varchar', length: 50, nullable: true })
	@IsOptional()
	@Length(1, 50, { message: 'Телефон должен быть до 50 символов' })
	phone: string | null

	@Column({ name: 'additional_phones', type: 'varchar', array: true, default: [] })
	@IsOptional()
	@IsArray()
	additionalPhones: string[]

	@Column({ type: 'varchar', length: 255, nullable: true })
	@IsOptional()
	@IsEmail({}, { message: 'Некорректный формат email' })
	email: string | null

	@Column({ type: 'varchar', length: 255, nullable: true })
	@IsOptional()
	website: string | null

	// === Банковские реквизиты ===

	@Column({ name: 'bank_name', type: 'varchar', length: 255, nullable: true })
	@IsOptional()
	bankName: string | null

	@Column({ name: 'bank_bik', type: 'varchar', length: 9, nullable: true })
	@IsOptional()
	@Length(9, 9, { message: 'БИК должен быть 9 цифр' })
	bankBik: string | null

	@Column({ name: 'bank_account', type: 'varchar', length: 20, nullable: true })
	@IsOptional()
	@Length(20, 20, { message: 'Расчётный счёт должен быть 20 цифр' })
	bankAccount: string | null

	@Column({ name: 'bank_corr_account', type: 'varchar', length: 20, nullable: true })
	@IsOptional()
	@Length(20, 20, { message: 'Корр. счёт должен быть 20 цифр' })
	bankCorrAccount: string | null

	// === Классификация ===

	@Column({
		name: 'company_type',
		type: 'enum',
		enum: CompanyType,
		default: CompanyType.CUSTOMER,
	})
	@IsEnum(CompanyType, { message: 'Некорректный тип компании' })
	companyType: CompanyType

	@Column({ type: 'varchar', length: 255, nullable: true })
	@IsOptional()
	industry: string | null

	@Column({ type: 'text', nullable: true })
	@IsOptional()
	notes: string | null

	// === Интеграция с Bitrix24 ===

	@Column({ name: 'bitrix_company_id', type: 'varchar', length: 50, nullable: true, unique: true })
	@IsOptional()
	@Length(1, 50, { message: 'Bitrix24 ID должен быть до 50 символов' })
	@Index('idx_companies_bitrix_id')
	bitrixCompanyId: string | null

	@Column({
		name: 'sync_status',
		type: 'enum',
		enum: CompanySyncStatus,
		default: CompanySyncStatus.LOCAL_ONLY,
	})
	@IsEnum(CompanySyncStatus, { message: 'Некорректный статус синхронизации' })
	syncStatus: CompanySyncStatus

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

	// === Полнотекстовый поиск (tsvector) ===
	// Это поле заполняется триггером PostgreSQL автоматически
	@Column({ name: 'search_vector', type: 'tsvector', select: false, nullable: true })
	searchVector: any

	// === Связи с контактами ===
	@OneToMany('Contact', 'company')
	contacts: Contact[]

	constructor(partial?: Partial<Company>) {
		super()
		if (partial) {
			Object.assign(this, partial)
		}
	}

	// === Вспомогательные методы ===

	/**
	 * Проверяет, синхронизирована ли компания с Bitrix24
	 */
	isSyncedWithBitrix(): boolean {
		return this.bitrixCompanyId !== null && this.syncStatus === CompanySyncStatus.SYNCED
	}

	/**
	 * Проверяет, есть ли ошибка синхронизации
	 */
	hasSyncError(): boolean {
		return this.syncStatus === CompanySyncStatus.ERROR && this.syncError !== null
	}

	/**
	 * Возвращает полное название с ИНН
	 */
	getFullName(): string {
		return this.inn ? `${this.name} (ИНН: ${this.inn})` : this.name
	}

	/**
	 * Возвращает краткое название или полное, если краткое не задано
	 */
	getDisplayName(): string {
		return this.shortName || this.name
	}

	/**
	 * Устанавливает ошибку синхронизации
	 */
	setSyncError(message: string, code?: string): void {
		this.syncStatus = CompanySyncStatus.ERROR
		this.syncError = {
			message,
			timestamp: new Date(),
			code,
		}
	}

	/**
	 * Очищает ошибку синхронизации и устанавливает статус
	 */
	clearSyncError(status: CompanySyncStatus = CompanySyncStatus.SYNCED): void {
		this.syncStatus = status
		this.syncError = null
		this.lastSyncAt = new Date()
	}

	/**
	 * Обновляет данные из Bitrix24
	 */
	updateFromBitrix(data: {
		name?: string
		shortName?: string
		inn?: string
		phone?: string
		email?: string
		address?: string
	}): void {
		if (data.name) this.name = data.name
		if (data.shortName !== undefined) this.shortName = data.shortName
		if (data.inn !== undefined) this.inn = data.inn
		if (data.phone !== undefined) this.phone = data.phone
		if (data.email !== undefined) this.email = data.email
		if (data.address !== undefined) this.actualAddress = data.address
		this.clearSyncError(CompanySyncStatus.SYNCED)
	}

	/**
	 * Проверяет валидность ИНН (базовая проверка)
	 */
	isValidInn(): boolean {
		if (!this.inn) return true // nullable
		const innClean = this.inn.replace(/\D/g, '')
		return innClean.length === 10 || innClean.length === 12
	}
}
