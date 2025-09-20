import {
	Entity,
	Column,
	PrimaryColumn,
	CreateDateColumn,
	UpdateDateColumn,
} from 'typeorm'

@Entity('sync_metadata')
export class SyncMetadata {
	@PrimaryColumn({ type: 'varchar', length: 50 })
	entityType: string

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
