import {
	Entity,
	Column,
	PrimaryColumn,
	CreateDateColumn,
	UpdateDateColumn,
	Index,
	ManyToOne,
	JoinColumn,
} from 'typeorm'
import { Organization } from './Organization.entity'

@Entity('sync_metadata')
@Index(['organizationId'])
export class SyncMetadata {
	@PrimaryColumn({ type: 'varchar', length: 50 })
	entityType: string

	@Column({ type: 'uuid', name: 'organization_id', nullable: true })
	organizationId?: string

	@ManyToOne(() => Organization)
	@JoinColumn({ name: 'organization_id' })
	organization?: Organization

	@Column({ type: 'timestamp', nullable: true })
	lastSyncTime?: Date

	@Column({ type: 'timestamp', nullable: true })
	lastFullSyncTime?: Date

	@Column({ type: 'int', default: 0 })
	totalProcessed: number

	@Column({ type: 'int', default: 0 })
	successful: number

	@Column({ type: 'int', default: 0 })
	failed: number

	@Column({ type: 'text', array: true, default: [] })
	errors: string[]

	@Column({
		type: 'enum',
		enum: ['idle', 'running', 'completed', 'failed'],
		default: 'idle',
	})
	status: 'idle' | 'running' | 'completed' | 'failed'

	@CreateDateColumn()
	createdAt: Date

	@UpdateDateColumn()
	updatedAt: Date
}
