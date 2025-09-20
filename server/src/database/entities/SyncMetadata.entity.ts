import {
	Entity,
	PrimaryGeneratedColumn,
	Column,
	CreateDateColumn,
	UpdateDateColumn,
} from 'typeorm'

@Entity('sync_metadata')
export class SyncMetadata {
	@PrimaryGeneratedColumn()
	id: number

	@Column({ name: 'entity_type', type: 'varchar', length: 100, unique: true })
	entityType: string // 'products', 'companies', 'submissions', 'contacts'

	@Column({ name: 'last_sync_time', type: 'timestamp', nullable: true })
	lastSyncTime: Date | null

	@Column({ name: 'last_full_sync_time', type: 'timestamp', nullable: true })
	lastFullSyncTime: Date | null

	@Column({ name: 'total_processed', type: 'int', default: 0 })
	totalProcessed: number

	@Column({ type: 'int', default: 0 })
	successful: number

	@Column({ type: 'int', default: 0 })
	failed: number

	@Column({ type: 'text', array: true, default: '{}' })
	errors: string[]

	@Column({ type: 'varchar', length: 50, default: 'idle' })
	status: 'idle' | 'running' | 'completed' | 'failed'

	@CreateDateColumn()
	createdAt: Date

	@UpdateDateColumn()
	updatedAt: Date
}
