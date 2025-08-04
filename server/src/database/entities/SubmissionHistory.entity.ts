import {
	Entity,
	Column,
	Index,
	ManyToOne,
	JoinColumn,
} from 'typeorm'
import { IsString, IsObject, IsOptional } from 'class-validator'
import { BaseEntity } from './base/BaseEntity'
import { Submission } from './Submission.entity'
import { User } from './User.entity'

export enum HistoryActionType {
	CREATE = 'create',
	UPDATE = 'update',
	STATUS_CHANGE = 'status_change',
	ASSIGN = 'assign',
	COMMENT = 'comment',
	SYNC_BITRIX = 'sync_bitrix',
	DELETE = 'delete',
}

@Entity('submission_history')
@Index(['submissionId', 'createdAt'])
@Index(['userId', 'createdAt'])
@Index(['actionType', 'createdAt'])
export class SubmissionHistory extends BaseEntity {
	@Column({ type: 'uuid' })
	submissionId: string

	@ManyToOne(() => Submission, { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'submissionId' })
	submission: Submission

	@Column({ type: 'uuid', nullable: true })
	@IsOptional()
	userId?: string

	@ManyToOne(() => User, { nullable: true })
	@JoinColumn({ name: 'userId' })
	user?: User

	@Column({
		type: 'enum',
		enum: HistoryActionType,
	})
	actionType: HistoryActionType

	@Column({ type: 'text' })
	@IsString()
	description: string

	@Column({ type: 'jsonb', nullable: true })
	@IsOptional()
	@IsObject()
	changes?: {
		field: string
		oldValue: any
		newValue: any
	}[]

	@Column({ type: 'jsonb', nullable: true })
	@IsOptional()
	@IsObject()
	metadata?: Record<string, any>

	static createEntry(
		submissionId: string,
		actionType: HistoryActionType,
		description: string,
		userId?: string,
		changes?: any[],
		metadata?: Record<string, any>
	): SubmissionHistory {
		const entry = new SubmissionHistory()
		entry.submissionId = submissionId
		entry.actionType = actionType
		entry.description = description
		entry.userId = userId
		entry.changes = changes
		entry.metadata = metadata
		return entry
	}

	isSystemAction(): boolean {
		return !this.userId
	}

	getFormattedDescription(): string {
		const userPrefix = this.user ? `${this.user.fullName}: ` : 'Система: '
		return userPrefix + this.description
	}

	toPublicJSON() {
		const { submission, user, ...publicHistory } = this
		return {
			...publicHistory,
			userName: user?.fullName,
			userEmail: user?.email,
		}
	}
}