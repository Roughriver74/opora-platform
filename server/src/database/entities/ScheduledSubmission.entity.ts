import {
	Entity,
	Column,
	Index,
	ManyToOne,
	JoinColumn,
	BeforeInsert,
} from 'typeorm'
import {
	IsString,
	IsEnum,
	IsOptional,
	IsDate,
	IsNumber,
	IsObject,
	IsUUID,
} from 'class-validator'
import { BaseEntity } from './base/BaseEntity'
import { User } from './User.entity'
import { Form } from './Form.entity'
import { SubmissionPeriodGroup } from './SubmissionPeriodGroup.entity'
import { Submission } from './Submission.entity'
import { Organization } from './Organization.entity'

export enum ScheduledSubmissionStatus {
	PENDING = 'pending',
	PROCESSING = 'processing',
	COMPLETED = 'completed',
	FAILED = 'failed',
	CANCELLED = 'cancelled',
}

/**
 * Сущность для хранения запланированных заявок
 * Используется для отложенного создания заявок через очередь задач
 */
@Entity('scheduled_submissions')
@Index(['scheduledDate', 'status'])
@Index(['periodGroupId', 'status'])
@Index(['formId', 'status'])
@Index(['assignedToId', 'status'])
@Index(['organizationId'])
export class ScheduledSubmission extends BaseEntity {
	@Column({ type: 'uuid', name: 'organization_id', nullable: true })
	@IsOptional()
	@IsUUID()
	organizationId?: string

	@ManyToOne(() => Organization)
	@JoinColumn({ name: 'organization_id' })
	organization?: Organization

	@ManyToOne(() => SubmissionPeriodGroup, { nullable: true })
	@JoinColumn({ name: 'period_group_id' })
	periodGroup?: SubmissionPeriodGroup

	@Column({ type: 'uuid', nullable: true, name: 'period_group_id' })
	@IsOptional()
	periodGroupId?: string

	@ManyToOne(() => Form, { nullable: false })
	@JoinColumn({ name: 'form_id' })
	form: Form

	@Column({ type: 'uuid', name: 'form_id' })
	@IsString()
	formId: string

	@Column({ type: 'jsonb' })
	@IsObject()
	formData: Record<string, any>

	@Column({ type: 'date' })
	@IsDate()
	scheduledDate: Date

	@Column({ type: 'time', nullable: true })
	@IsOptional()
	@IsString()
	scheduledTime?: string

	@ManyToOne(() => User, { nullable: true })
	@JoinColumn({ name: 'assigned_to_id' })
	assignedTo?: User

	@Column({ type: 'uuid', nullable: true, name: 'assigned_to_id' })
	@IsOptional()
	assignedToId?: string

	@Column({
		type: 'enum',
		enum: ScheduledSubmissionStatus,
		default: ScheduledSubmissionStatus.PENDING,
	})
	@IsEnum(ScheduledSubmissionStatus)
	status: ScheduledSubmissionStatus

	@Column({ type: 'smallint', default: 0 })
	@IsNumber()
	attempts: number

	@Column({ type: 'text', nullable: true })
	@IsOptional()
	@IsString()
	error?: string

	@ManyToOne(() => Submission, { nullable: true })
	@JoinColumn({ name: 'submission_id' })
	submission?: Submission

	@Column({ type: 'uuid', nullable: true, name: 'submission_id' })
	@IsOptional()
	submissionId?: string

	// Метаданные для периодических заявок
	@Column({ type: 'smallint', nullable: true })
	@IsOptional()
	@IsNumber()
	periodPosition?: number

	@Column({ type: 'smallint', nullable: true })
	@IsOptional()
	@IsNumber()
	totalInPeriod?: number

	@Column({ type: 'date', nullable: true })
	@IsOptional()
	@IsDate()
	periodStartDate?: Date

	@Column({ type: 'date', nullable: true })
	@IsOptional()
	@IsDate()
	periodEndDate?: Date

	// Денормализованные данные для производительности
	@Column({ type: 'uuid', nullable: true })
	@IsOptional()
	userId?: string

	@Column({ type: 'varchar', length: 255, nullable: true })
	@IsOptional()
	@IsString()
	userName?: string

	@Column({ type: 'varchar', length: 255, nullable: true })
	@IsOptional()
	@IsString()
	userEmail?: string

	@Column({ type: 'varchar', length: 255, nullable: true })
	@IsOptional()
	@IsString()
	formName?: string

	@Column({ type: 'varchar', length: 255, nullable: true })
	@IsOptional()
	@IsString()
	formTitle?: string

	@Column({ type: 'varchar', length: 50, nullable: true })
	@IsOptional()
	@IsString()
	priority?: string

	// ID задачи в очереди BullMQ
	@Column({ type: 'varchar', length: 255, nullable: true })
	@IsOptional()
	@IsString()
	jobId?: string

	@Column({ type: 'timestamp', nullable: true })
	@IsOptional()
	@IsDate()
	processedAt?: Date

	/**
	 * Проверяет, можно ли обработать эту запланированную заявку
	 */
	isReadyToProcess(): boolean {
		// Проверяем статус
		if (this.status !== ScheduledSubmissionStatus.PENDING) {
			return false
		}

		// Проверяем дату
		const now = new Date()
		const scheduledDate = new Date(this.scheduledDate)

		// Сбрасываем время для сравнения только даты
		now.setHours(0, 0, 0, 0)
		scheduledDate.setHours(0, 0, 0, 0)

		if (scheduledDate > now) {
			return false
		}

		// Если указано конкретное время, проверяем его
		if (this.scheduledTime) {
			const nowTime = new Date()
			const [hours, minutes] = this.scheduledTime.split(':').map(Number)
			const scheduledDateTime = new Date(this.scheduledDate)
			scheduledDateTime.setHours(hours, minutes, 0, 0)

			if (scheduledDateTime > nowTime) {
				return false
			}
		}

		return true
	}

	/**
	 * Помечает заявку как обработанную
	 */
	markAsProcessed(submissionId: string): void {
		this.status = ScheduledSubmissionStatus.COMPLETED
		this.submissionId = submissionId
		this.processedAt = new Date()
		this.error = null
	}

	/**
	 * Помечает заявку как неудачную
	 */
	markAsFailed(error: string): void {
		this.status = ScheduledSubmissionStatus.FAILED
		this.error = error
		this.attempts++
	}

	/**
	 * Помечает заявку как обрабатываемую
	 */
	markAsProcessing(jobId?: string): void {
		this.status = ScheduledSubmissionStatus.PROCESSING
		this.jobId = jobId
		this.attempts++
	}

	/**
	 * Сбрасывает статус для повторной попытки
	 */
	resetForRetry(): void {
		this.status = ScheduledSubmissionStatus.PENDING
		this.jobId = null
		this.error = null
	}

	/**
	 * Отменяет запланированную заявку
	 */
	cancel(): void {
		this.status = ScheduledSubmissionStatus.CANCELLED
		this.processedAt = new Date()
	}

	/**
	 * Возвращает публичное представление
	 */
	toPublicJSON(): any {
		return {
			id: this.id,
			formId: this.formId,
			formName: this.formName,
			formTitle: this.formTitle,
			scheduledDate: this.scheduledDate,
			scheduledTime: this.scheduledTime,
			status: this.status,
			attempts: this.attempts,
			error: this.error,
			submissionId: this.submissionId,
			periodGroupId: this.periodGroupId,
			periodPosition: this.periodPosition,
			totalInPeriod: this.totalInPeriod,
			assignedToId: this.assignedToId,
			userName: this.userName,
			userEmail: this.userEmail,
			priority: this.priority,
			processedAt: this.processedAt,
			createdAt: this.createdAt,
			updatedAt: this.updatedAt,
		}
	}
}