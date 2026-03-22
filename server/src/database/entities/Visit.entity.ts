import {
	Entity,
	Column,
	Index,
	ManyToOne,
	JoinColumn,
} from 'typeorm'
import {
	IsString,
	IsEnum,
	IsOptional,
	IsUUID,
} from 'class-validator'
import { BaseEntity } from './base/BaseEntity'
import { User } from './User.entity'
import { Company } from './Company.entity'
import { Organization } from './Organization.entity'

export enum VisitStatus {
	PLANNED = 'planned',
	COMPLETED = 'completed',
	CANCELLED = 'cancelled',
	FAILED = 'failed',
}

export enum VisitSyncStatus {
	NONE = 'none',
	PENDING = 'pending',
	SYNCED = 'synced',
	ERROR = 'error',
}

@Entity('visits')
@Index(['organizationId'])
@Index(['userId'])
@Index(['companyId'])
@Index(['date'])
@Index(['status'])
export class Visit extends BaseEntity {
	@Column({ type: 'uuid', name: 'organization_id' })
	@IsUUID()
	organizationId: string

	@ManyToOne(() => Organization)
	@JoinColumn({ name: 'organization_id' })
	organization?: Organization

	@Column({ type: 'uuid', name: 'company_id' })
	@IsUUID()
	companyId: string

	@ManyToOne(() => Company)
	@JoinColumn({ name: 'company_id' })
	company?: Company

	@Column({ type: 'uuid', name: 'contact_id', nullable: true })
	@IsOptional()
	@IsUUID()
	contactId?: string

	@Column({ type: 'uuid', name: 'user_id' })
	@IsUUID()
	userId: string

	@ManyToOne(() => User)
	@JoinColumn({ name: 'user_id' })
	user?: User

	@Column({ type: 'timestamp' })
	date: Date

	@Column({
		type: 'enum',
		enum: VisitStatus,
		default: VisitStatus.PLANNED,
	})
	@IsEnum(VisitStatus)
	status: VisitStatus

	@Column({ type: 'varchar', length: 255, name: 'visit_type', nullable: true })
	@IsOptional()
	@IsString()
	visitType?: string

	@Column({ type: 'text', nullable: true })
	@IsOptional()
	@IsString()
	comment?: string

	@Column({ type: 'jsonb', name: 'dynamic_fields', default: {} })
	dynamicFields: Record<string, any>

	@Column({ type: 'varchar', length: 100, name: 'bitrix_id', nullable: true })
	@IsOptional()
	@IsString()
	bitrixId?: string

	@Column({
		type: 'enum',
		enum: VisitSyncStatus,
		name: 'sync_status',
		default: VisitSyncStatus.NONE,
	})
	@IsEnum(VisitSyncStatus)
	syncStatus: VisitSyncStatus

	@Column({ type: 'timestamp', name: 'last_synced', nullable: true })
	@IsOptional()
	lastSynced?: Date

	// Денормализованные поля
	@Column({ type: 'varchar', length: 255, name: 'user_name', nullable: true })
	@IsOptional()
	@IsString()
	userName?: string

	@Column({ type: 'varchar', length: 500, name: 'company_name', nullable: true })
	@IsOptional()
	@IsString()
	companyName?: string
}
