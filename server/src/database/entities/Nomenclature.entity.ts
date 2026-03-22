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
	IsInt,
	IsEnum,
	IsNumber,
	IsArray,
	IsUUID,
} from 'class-validator'
import { AuditableEntity } from './base/AuditableEntity'
import { NomenclatureCategory } from './NomenclatureCategory.entity'
import { NomenclatureUnit } from './NomenclatureUnit.entity'
import { Organization } from './Organization.entity'

/**
 * Тип номенклатуры
 */
export enum NomenclatureType {
	PRODUCT = 'product',
	SERVICE = 'service',
	MATERIAL = 'material',
}

/**
 * Статус синхронизации с Bitrix24
 */
export enum NomenclatureSyncStatus {
	SYNCED = 'synced',
	PENDING = 'pending',
	ERROR = 'error',
	LOCAL_ONLY = 'local_only',
}

@Entity('nomenclatures')
@Index(['organizationId'])
@Index(['organizationId', 'sku'], { unique: true })
export class Nomenclature extends AuditableEntity {
	@Column({ type: 'uuid', name: 'organization_id', nullable: true })
	@IsOptional()
	@IsUUID()
	organizationId?: string

	@ManyToOne(() => Organization)
	@JoinColumn({ name: 'organization_id' })
	organization?: Organization

	// === Основные поля ===

	@Column({ type: 'varchar', length: 100 })
	@IsNotEmpty({ message: 'Артикул (SKU) обязателен' })
	@Length(1, 100, { message: 'Артикул должен быть от 1 до 100 символов' })
	sku: string

	@Column({ type: 'varchar', length: 500 })
	@IsNotEmpty({ message: 'Название товара обязательно' })
	@Length(1, 500, { message: 'Название должно быть от 1 до 500 символов' })
	name: string

	@Column({ type: 'text', nullable: true })
	@IsOptional()
	description: string | null

	@Column({
		type: 'enum',
		enum: NomenclatureType,
		default: NomenclatureType.PRODUCT,
	})
	@IsEnum(NomenclatureType, { message: 'Некорректный тип номенклатуры' })
	type: NomenclatureType

	// === Связи ===

	@Column({ name: 'category_id', type: 'uuid', nullable: true })
	@IsOptional()
	@IsUUID('4', { message: 'Некорректный UUID категории' })
	categoryId: string | null

	@ManyToOne(() => NomenclatureCategory, { nullable: true, onDelete: 'SET NULL' })
	@JoinColumn({ name: 'category_id' })
	category: NomenclatureCategory | null

	@Column({ name: 'unit_id', type: 'uuid' })
	@IsNotEmpty({ message: 'Единица измерения обязательна' })
	@IsUUID('4', { message: 'Некорректный UUID единицы измерения' })
	unitId: string

	@ManyToOne(() => NomenclatureUnit, { nullable: false })
	@JoinColumn({ name: 'unit_id' })
	unit: NomenclatureUnit

	// === Ценовые поля ===

	@Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
	@IsOptional()
	@IsNumber({}, { message: 'Цена должна быть числом' })
	price: number | null

	@Column({ type: 'varchar', length: 10, default: 'RUB' })
	@Length(1, 10, { message: 'Код валюты должен быть до 10 символов' })
	currency: string

	@Column({ name: 'cost_price', type: 'decimal', precision: 15, scale: 2, nullable: true })
	@IsOptional()
	@IsNumber({}, { message: 'Себестоимость должна быть числом' })
	costPrice: number | null

	// === Интеграция с Bitrix24 ===

	@Column({ name: 'bitrix_product_id', type: 'varchar', length: 50, nullable: true })
	@IsOptional()
	@Length(1, 50, { message: 'Bitrix24 ID должен быть до 50 символов' })
	bitrixProductId: string | null

	@Column({ name: 'bitrix_section_id', type: 'varchar', length: 50, nullable: true })
	@IsOptional()
	@Length(1, 50, { message: 'Bitrix24 Section ID должен быть до 50 символов' })
	bitrixSectionId: string | null

	@Column({
		name: 'sync_status',
		type: 'enum',
		enum: NomenclatureSyncStatus,
		default: NomenclatureSyncStatus.LOCAL_ONLY,
	})
	@IsEnum(NomenclatureSyncStatus, { message: 'Некорректный статус синхронизации' })
	syncStatus: NomenclatureSyncStatus

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
	tags: string[] = []

	@Column({ name: 'image_url', type: 'varchar', length: 500, nullable: true })
	@IsOptional()
	@Length(1, 500, { message: 'URL изображения должен быть до 500 символов' })
	imageUrl: string | null

	@Column({ name: 'sort_order', type: 'int', default: 0 })
	@IsOptional()
	@IsInt({ message: 'Порядок сортировки должен быть целым числом' })
	sortOrder: number = 0

	@Column({ name: 'is_active', type: 'boolean', default: true })
	@IsOptional()
	@IsBoolean()
	isActive: boolean = true

	// === Полнотекстовый поиск (tsvector) ===
	// Это поле заполняется триггером PostgreSQL автоматически
	@Column({ name: 'search_vector', type: 'tsvector', select: false, nullable: true })
	searchVector: any

	constructor(partial?: Partial<Nomenclature>) {
		super()
		if (partial) {
			Object.assign(this, partial)
		}
	}

	// === Вспомогательные методы ===

	/**
	 * Проверяет, синхронизирован ли товар с Bitrix24
	 */
	isSyncedWithBitrix(): boolean {
		return this.bitrixProductId !== null && this.syncStatus === NomenclatureSyncStatus.SYNCED
	}

	/**
	 * Проверяет, есть ли ошибка синхронизации
	 */
	hasSyncError(): boolean {
		return this.syncStatus === NomenclatureSyncStatus.ERROR && this.syncError !== null
	}

	/**
	 * Возвращает форматированную цену
	 */
	getFormattedPrice(): string {
		if (this.price === null) return 'Цена не указана'
		return `${this.price.toLocaleString('ru-RU')} ${this.currency}`
	}

	/**
	 * Возвращает полное название с артикулом
	 */
	getFullName(): string {
		return `${this.sku} - ${this.name}`
	}

	/**
	 * Устанавливает ошибку синхронизации
	 */
	setSyncError(message: string, code?: string): void {
		this.syncStatus = NomenclatureSyncStatus.ERROR
		this.syncError = {
			message,
			timestamp: new Date(),
			code,
		}
	}

	/**
	 * Очищает ошибку синхронизации и устанавливает статус
	 */
	clearSyncError(status: NomenclatureSyncStatus = NomenclatureSyncStatus.SYNCED): void {
		this.syncStatus = status
		this.syncError = null
		this.lastSyncAt = new Date()
	}

	/**
	 * Обновляет данные из Bitrix24
	 */
	updateFromBitrix(data: {
		name?: string
		description?: string
		price?: number
		currency?: string
	}): void {
		if (data.name) this.name = data.name
		if (data.description !== undefined) this.description = data.description
		if (data.price !== undefined) this.price = data.price
		if (data.currency) this.currency = data.currency
		this.clearSyncError(NomenclatureSyncStatus.SYNCED)
	}
}
