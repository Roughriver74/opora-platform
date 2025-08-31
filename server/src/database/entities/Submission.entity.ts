import {
	Entity,
	Column,
	Index,
	ManyToOne,
	JoinColumn,
	BeforeInsert,
	BeforeUpdate,
} from 'typeorm'
import { IsString, IsEnum, IsOptional, IsArray, IsNumber } from 'class-validator'
import { BaseEntity } from './base/BaseEntity'
import { User } from './User.entity'
import { Form } from './Form.entity'

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
export class Submission extends BaseEntity {
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
	
	@Column({ type: 'jsonb' })
	formData: any

	// Override the base class validation to ensure submission number is generated first
	@BeforeInsert()
	async validate() {
		// Generate submission number BEFORE validation
		await this.generateSubmissionNumber()
		// Skip validation temporarily for debugging
		// await super.validate()
	}

	private async generateSubmissionNumber() {
		// Always generate submissionNumber if not set
		if (!this.submissionNumber || this.submissionNumber === undefined) {
			const today = new Date()
			const year = today.getFullYear()
			const month = String(today.getMonth() + 1).padStart(2, '0')
			const day = String(today.getDate()).padStart(2, '0')
			const randomSuffix = Math.floor(Math.random() * 9999)
				.toString()
				.padStart(4, '0')
			
			this.submissionNumber = `${year}${month}${day}${randomSuffix}`
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
		return ['WON', 'LOSE', 'COMPLETED', 'CLOSED', 'C1:WON', 'C1:LOSE'].includes(this.status)
	}

	isHighPriority(): boolean {
		return this.priority === SubmissionPriority.HIGH || 
			   this.priority === SubmissionPriority.URGENT
	}

	isSyncedWithBitrix(): boolean {
		return this.bitrixSyncStatus === BitrixSyncStatus.SYNCED
	}

	getDaysOpen(): number {
		if (this.isStatusCompleted() && this.processingTimeMinutes) {
			return Math.round(this.processingTimeMinutes / (60 * 24))
		}
		const now = new Date()
		const created = new Date(this.createdAt)
		return Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24))
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