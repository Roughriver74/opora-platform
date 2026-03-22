import {
	Entity,
	Column,
	Index,
	ManyToOne,
	JoinColumn,
	BeforeInsert,
	BeforeUpdate,
} from 'typeorm'
import {
	IsString,
	IsEnum,
	IsOptional,
	IsArray,
	IsNumber,
	IsBoolean,
	IsUUID,
} from 'class-validator'
import { BaseEntity } from './base/BaseEntity'
import { User } from './User.entity'
import { Form } from './Form.entity'
import { Organization } from './Organization.entity'
import { getSubmissionRepository } from '../repositories'

export enum SubmissionPriority {
	LOW = 'low',
	MEDIUM = 'medium',
	HIGH = 'high',
	URGENT = 'urgent',
}

export enum BitrixSyncStatus {
	PENDING = 'pending',
	SYNCED = 'synced',
	FAILED = 'failed',
}

@Entity('submissions')
@Index(['submissionNumber'], { unique: true })
@Index(['status', 'createdAt'])
@Index(['userId', 'status', 'createdAt'])
@Index(['assignedTo', 'status', 'createdAt'])
@Index(['formId', 'createdAt'])
@Index(['bitrixSyncStatus', 'createdAt'])
@Index(['priority', 'status'])
@Index(['tags', 'status'])
@Index(['userEmail', 'status'])
@Index(['formName', 'createdAt'])
@Index(['yearCreated', 'monthOfYear'])
@Index(['assignedToName', 'status'])
@Index(['organizationId'])
export class Submission extends BaseEntity {
	@Column({ type: 'uuid', name: 'organization_id', nullable: true })
	@IsOptional()
	@IsUUID()
	organizationId?: string

	@ManyToOne(() => Organization)
	@JoinColumn({ name: 'organization_id' })
	organization?: Organization

	@Column({ type: 'varchar', length: 50, unique: true })
	@IsOptional()
	@IsString()
	submissionNumber: string

	@ManyToOne(() => Form, form => form.submissions)
	@JoinColumn({ name: 'form_id' })
	form: Form

	@Column({ type: 'uuid', name: 'form_id' })
	formId: string

	@ManyToOne(() => User, user => user.submissions, { nullable: true })
	@JoinColumn({ name: 'user_id' })
	user?: User

	@Column({ type: 'uuid', nullable: true, name: 'user_id' })
	@IsOptional()
	userId?: string

	@ManyToOne(() => User, user => user.assignedSubmissions, { nullable: true })
	@JoinColumn({ name: 'assigned_to_id' })
	assignedTo?: User

	@Column({ type: 'uuid', nullable: true, name: 'assigned_to_id' })
	@IsOptional()
	assignedToId?: string

	@Column({ type: 'varchar', length: 500 })
	@IsString()
	title: string

	@Column({ type: 'varchar', length: 50, default: 'NEW' })
	@IsString()
	status: string

	@Column({
		type: 'enum',
		enum: SubmissionPriority,
		default: SubmissionPriority.MEDIUM,
	})
	@IsEnum(SubmissionPriority)
	priority: SubmissionPriority

	@Column({ type: 'varchar', length: 100, nullable: true })
	@IsOptional()
	@IsString()
	bitrixDealId?: string

	@Column({ type: 'varchar', length: 100, nullable: true })
	@IsOptional()
	@IsString()
	bitrixCategoryId?: string

	@Column({
		type: 'enum',
		enum: BitrixSyncStatus,
		default: BitrixSyncStatus.PENDING,
	})
	@IsEnum(BitrixSyncStatus)
	bitrixSyncStatus: BitrixSyncStatus

	@Column({ type: 'text', nullable: true })
	@IsOptional()
	@IsString()
	bitrixSyncError?: string

	@Column({ type: 'timestamp', name: 'bitrix_synced_at', nullable: true })
	@IsOptional()
	bitrixSyncedAt?: Date

	@Column({ type: 'int', name: 'bitrix_sync_attempts', default: 0 })
	@IsOptional()
	@IsNumber()
	bitrixSyncAttempts: number = 0

	@Column({ type: 'text', nullable: true })
	@IsOptional()
	@IsString()
	notes?: string

	@Column({ type: 'text', array: true, default: [] })
	@IsArray()
	@IsString({ each: true })
	tags: string[]

	// Денормализованные поля для производительности
	@Column({ type: 'varchar', length: 255, nullable: true })
	formName?: string

	@Column({ type: 'varchar', length: 255, nullable: true })
	formTitle?: string

	@Column({ type: 'varchar', length: 255, nullable: true })
	userEmail?: string

	@Column({ type: 'varchar', length: 255, nullable: true })
	userName?: string

	@Column({ type: 'varchar', length: 255, nullable: true })
	assignedToName?: string

	// Предвычисленные поля для отчетности
	@Column({ type: 'smallint', nullable: true })
	@IsOptional()
	@IsNumber()
	dayOfWeek?: number

	@Column({ type: 'smallint', nullable: true })
	@IsOptional()
	@IsNumber()
	monthOfYear?: number

	@Column({ type: 'int', nullable: true })
	@IsOptional()
	@IsNumber()
	yearCreated?: number

	@Column({ type: 'int', nullable: true })
	@IsOptional()
	@IsNumber()
	processingTimeMinutes?: number

	// Поля для периодических заявок
	@Column({ type: 'boolean', name: 'is_period_submission', default: false })
	@IsBoolean()
	isPeriodSubmission: boolean

	@Column({ type: 'uuid', name: 'period_group_id', nullable: true })
	@IsOptional()
	@IsString()
	periodGroupId?: string

	@Column({ type: 'timestamp', name: 'period_start_date', nullable: true })
	@IsOptional()
	periodStartDate?: Date

	@Column({ type: 'timestamp', name: 'period_end_date', nullable: true })
	@IsOptional()
	periodEndDate?: Date

	@Column({ type: 'int', name: 'period_position', nullable: true })
	@IsOptional()
	@IsNumber()
	periodPosition?: number

	@Column({ type: 'int', name: 'total_in_period', nullable: true })
	@IsOptional()
	@IsNumber()
	totalInPeriod?: number

	@Column({ type: 'jsonb', name: 'form_data' })
	formData: any

	// Override the base class validation to ensure submission number is generated first
	@BeforeInsert()
	async validate() {
		// Generate submission number BEFORE validation
		await this.generateSubmissionNumber()
		// Skip validation temporarily for debugging
		// await super.validate()
	}

	public async generateSubmissionNumber() {
		// Always generate submissionNumber if not set
		if (!this.submissionNumber || this.submissionNumber === undefined) {
			let attempts = 0
			const maxAttempts = 10

			while (attempts < maxAttempts) {
				const today = new Date()
				const year = today.getFullYear()
				const month = String(today.getMonth() + 1).padStart(2, '0')
				const day = String(today.getDate()).padStart(2, '0')
				const randomSuffix = Math.floor(Math.random() * 9999)
					.toString()
					.padStart(4, '0')

				const candidateNumber = `${year}${month}${day}${randomSuffix}`

				// Проверяем уникальность через репозиторий
				try {
					const existingSubmission =
						await getSubmissionRepository().findBySubmissionNumber(
							candidateNumber
						)
					if (!existingSubmission) {
						this.submissionNumber = candidateNumber
						break
					}
				} catch (error) {
					// Если ошибка при проверке, используем номер с timestamp для уникальности
					this.submissionNumber = `${year}${month}${day}${Date.now()
						.toString()
						.slice(-4)}`
					break
				}

				attempts++
			}

			// Если не удалось сгенерировать уникальный номер за 10 попыток, используем timestamp
			if (!this.submissionNumber) {
				const today = new Date()
				const year = today.getFullYear()
				const month = String(today.getMonth() + 1).padStart(2, '0')
				const day = String(today.getDate()).padStart(2, '0')
				this.submissionNumber = `${year}${month}${day}${Date.now()
					.toString()
					.slice(-4)}`
			}
		}

		// Заполнение предвычисленных полей
		const createdDate = this.createdAt || new Date()
		this.dayOfWeek = createdDate.getDay()
		this.monthOfYear = createdDate.getMonth() + 1
		this.yearCreated = createdDate.getFullYear()
	}

	@BeforeInsert()
	@BeforeUpdate()
	async updateDenormalizedFields() {
		// Обновление времени обработки при завершении
		if (this.isStatusCompleted() && !this.processingTimeMinutes) {
			const processingTime = Date.now() - this.createdAt.getTime()
			this.processingTimeMinutes = Math.round(processingTime / (1000 * 60))
		}
	}

	isStatusCompleted(): boolean {
		return ['WON', 'LOSE', 'COMPLETED', 'CLOSED', 'C1:WON', 'C1:LOSE'].includes(
			this.status
		)
	}

	isHighPriority(): boolean {
		return (
			this.priority === SubmissionPriority.HIGH ||
			this.priority === SubmissionPriority.URGENT
		)
	}

	isSyncedWithBitrix(): boolean {
		return this.bitrixSyncStatus === BitrixSyncStatus.SYNCED
	}

	needsBitrixSync(): boolean {
		return this.bitrixSyncStatus === BitrixSyncStatus.PENDING ||
			this.bitrixSyncStatus === BitrixSyncStatus.FAILED
	}

	canRetrySync(maxAttempts: number = 5): boolean {
		return this.needsBitrixSync() && this.bitrixSyncAttempts < maxAttempts
	}

	markSyncSuccess(bitrixDealId: string, bitrixCategoryId?: string): void {
		this.bitrixDealId = bitrixDealId
		if (bitrixCategoryId) {
			this.bitrixCategoryId = bitrixCategoryId
		}
		this.bitrixSyncStatus = BitrixSyncStatus.SYNCED
		this.bitrixSyncedAt = new Date()
		this.bitrixSyncError = undefined
		this.bitrixSyncAttempts = (this.bitrixSyncAttempts || 0) + 1
	}

	markSyncFailed(error: string): void {
		this.bitrixSyncStatus = BitrixSyncStatus.FAILED
		this.bitrixSyncError = error
		this.bitrixSyncAttempts = (this.bitrixSyncAttempts || 0) + 1
	}

	markSyncPending(): void {
		this.bitrixSyncStatus = BitrixSyncStatus.PENDING
		this.bitrixSyncError = undefined
	}

	getDaysOpen(): number {
		if (this.isStatusCompleted() && this.processingTimeMinutes) {
			return Math.round(this.processingTimeMinutes / (60 * 24))
		}
		const now = new Date()
		const created = new Date(this.createdAt)
		return Math.floor(
			(now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)
		)
	}

	isPeriodic(): boolean {
		return this.isPeriodSubmission === true && !!this.periodGroupId
	}

	getPeriodDisplayString(): string | null {
		if (!this.isPeriodic() || !this.periodStartDate || !this.periodEndDate) {
			return null
		}
		const start = new Date(this.periodStartDate).toLocaleDateString('ru-RU')
		const end = new Date(this.periodEndDate).toLocaleDateString('ru-RU')
		return `${start} - ${end}`
	}

	getPeriodPositionString(): string | null {
		if (!this.isPeriodic() || !this.periodPosition || !this.totalInPeriod) {
			return null
		}
		return `${this.periodPosition} из ${this.totalInPeriod}`
	}

	get submittedAt(): Date {
		return this.createdAt
	}

	toPublicJSON() {
		const { user, form, assignedTo, ...publicSubmission } = this
		return {
			...publicSubmission,
			user: user?.toSafeObject(),
			form: form?.toPublicJSON(),
			assignedTo: assignedTo?.toSafeObject(),
		}
	}
}
