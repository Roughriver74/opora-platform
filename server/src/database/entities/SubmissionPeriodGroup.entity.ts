import {
	Entity,
	Column,
	Index,
	ManyToOne,
	JoinColumn,
	OneToMany,
} from 'typeorm'
import { IsString, IsNumber, IsEnum, IsOptional, IsObject } from 'class-validator'
import { BaseEntity } from './base/BaseEntity'
import { User } from './User.entity'
import { Form } from './Form.entity'
import { Submission } from './Submission.entity'

export enum PeriodGroupStatus {
	ACTIVE = 'active',
	CANCELLED = 'cancelled',
	COMPLETED = 'completed',
}

/**
 * Entity для хранения информации о группах периодических заявок
 */
@Entity('submission_period_groups')
@Index(['formId', 'createdAt'])
@Index(['startDate', 'endDate'])
@Index(['status'])
@Index(['createdById'])
export class SubmissionPeriodGroup extends BaseEntity {
	@ManyToOne(() => Form, { nullable: false })
	@JoinColumn({ name: 'form_id' })
	form: Form

	@Column({ type: 'uuid', name: 'form_id' })
	@IsString()
	formId: string

	@Column({ type: 'timestamp', name: 'start_date' })
	startDate: Date

	@Column({ type: 'timestamp', name: 'end_date' })
	endDate: Date

	@Column({ type: 'int', name: 'total_submissions', default: 0 })
	@IsNumber()
	totalSubmissions: number

	@ManyToOne(() => User, { nullable: true })
	@JoinColumn({ name: 'created_by_id' })
	createdBy?: User

	@Column({ type: 'uuid', name: 'created_by_id', nullable: true })
	@IsOptional()
	@IsString()
	createdById?: string

	@Column({
		type: 'varchar',
		length: 50,
		default: PeriodGroupStatus.ACTIVE,
	})
	@IsEnum(PeriodGroupStatus)
	status: PeriodGroupStatus

	@Column({ type: 'varchar', length: 255, name: 'date_field_name' })
	@IsString()
	dateFieldName: string

	@Column({ type: 'jsonb', nullable: true })
	@IsOptional()
	@IsObject()
	metadata?: Record<string, any>

	@OneToMany(() => Submission, submission => submission.periodGroupId)
	submissions?: Submission[]

	/**
	 * Проверяет, является ли группа активной
	 */
	isActive(): boolean {
		return this.status === PeriodGroupStatus.ACTIVE
	}

	/**
	 * Проверяет, завершена ли группа
	 */
	isCompleted(): boolean {
		return this.status === PeriodGroupStatus.COMPLETED
	}

	/**
	 * Проверяет, отменена ли группа
	 */
	isCancelled(): boolean {
		return this.status === PeriodGroupStatus.CANCELLED
	}

	/**
	 * Возвращает количество дней в периоде
	 */
	getDaysCount(): number {
		const start = new Date(this.startDate)
		const end = new Date(this.endDate)
		const diffTime = Math.abs(end.getTime() - start.getTime())
		return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
	}

	/**
	 * Возвращает строковое представление периода
	 */
	getPeriodString(): string {
		const start = new Date(this.startDate).toLocaleDateString('ru-RU')
		const end = new Date(this.endDate).toLocaleDateString('ru-RU')
		return `${start} - ${end}`
	}

	/**
	 * Возвращает публичное представление группы
	 */
	toPublicJSON() {
		const { form, createdBy, submissions, ...publicGroup } = this
		return {
			...publicGroup,
			periodString: this.getPeriodString(),
			daysCount: this.getDaysCount(),
			createdBy: createdBy?.toSafeObject(),
			form: form?.toPublicJSON(),
		}
	}
}
