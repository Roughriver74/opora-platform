import {
	PrimaryGeneratedColumn,
	CreateDateColumn,
	UpdateDateColumn,
	BaseEntity as TypeOrmBaseEntity,
	BeforeInsert,
	BeforeUpdate,
} from 'typeorm'
import { validateOrReject } from 'class-validator'

export abstract class BaseEntity extends TypeOrmBaseEntity {
	@PrimaryGeneratedColumn('uuid')
	id: string

	@CreateDateColumn({
		name: 'created_at',
		type: 'timestamp',
		default: () => 'CURRENT_TIMESTAMP',
	})
	createdAt: Date

	@UpdateDateColumn({
		name: 'updated_at',
		type: 'timestamp',
		default: () => 'CURRENT_TIMESTAMP',
		onUpdate: 'CURRENT_TIMESTAMP',
	})
	updatedAt: Date

	@BeforeInsert()
	@BeforeUpdate()
	async validate() {
		await validateOrReject(this)
	}

	toJSON() {
		const obj = { ...this }
		delete (obj as any).__entity
		delete (obj as any).__has_id
		return obj
	}

	async softSave() {
		await this.validate()
		return this.save()
	}

	isNew(): boolean {
		return !this.id
	}

	getAge(): number {
		const now = new Date()
		const created = new Date(this.createdAt)
		return Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24))
	}

	wasUpdated(): boolean {
		return this.updatedAt.getTime() !== this.createdAt.getTime()
	}

	getLastUpdateAge(): number {
		const now = new Date()
		const updated = new Date(this.updatedAt)
		return Math.floor((now.getTime() - updated.getTime()) / (1000 * 60 * 60 * 24))
	}
}