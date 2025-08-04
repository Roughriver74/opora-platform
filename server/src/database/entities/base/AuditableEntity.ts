import { Column, ManyToOne, JoinColumn, BeforeInsert, BeforeUpdate } from 'typeorm'
import { BaseEntity } from './BaseEntity'
import { User } from '../User.entity'

export abstract class AuditableEntity extends BaseEntity {
	@Column({ type: 'uuid', nullable: true })
	createdBy: string | null

	@Column({ type: 'uuid', nullable: true })
	updatedBy: string | null

	@ManyToOne(() => User, { nullable: true })
	@JoinColumn({ name: 'createdBy' })
	creator?: User

	@ManyToOne(() => User, { nullable: true })
	@JoinColumn({ name: 'updatedBy' })
	updater?: User

	@Column({ type: 'jsonb', nullable: true })
	changeHistory: ChangeHistoryEntry[]

	private currentUserId: string | null = null

	setCurrentUser(userId: string | null) {
		this.currentUserId = userId
	}

	@BeforeInsert()
	setCreatedBy() {
		if (this.currentUserId) {
			this.createdBy = this.currentUserId
			this.updatedBy = this.currentUserId
		}
		this.changeHistory = []
	}

	@BeforeUpdate()
	setUpdatedBy() {
		if (this.currentUserId) {
			this.updatedBy = this.currentUserId
		}
		this.addChangeHistoryEntry()
	}

	private addChangeHistoryEntry() {
		if (!this.changeHistory) {
			this.changeHistory = []
		}

		const changes = this.getChangedFields()
		if (changes.length > 0) {
			const entry: ChangeHistoryEntry = {
				timestamp: new Date(),
				userId: this.currentUserId,
				changes: changes,
			}
			this.changeHistory.push(entry)
		}
	}

	private getChangedFields(): FieldChange[] {
		const metadata = this.constructor.getRepository().metadata
		const changes: FieldChange[] = []

		for (const column of metadata.columns) {
			const propertyName = column.propertyName
			const databaseValue = column.getEntityValue(this)
			
			if (this.hasId() && column.isUpdate) {
				const originalValue = (this as any)[`__original_${propertyName}`]
				if (originalValue !== undefined && originalValue !== databaseValue) {
					changes.push({
						field: propertyName,
						oldValue: originalValue,
						newValue: databaseValue,
					})
				}
			}
		}

		return changes
	}

	getChangeCount(): number {
		return this.changeHistory?.length || 0
	}

	getLastChange(): ChangeHistoryEntry | null {
		if (!this.changeHistory || this.changeHistory.length === 0) {
			return null
		}
		return this.changeHistory[this.changeHistory.length - 1]
	}

	getChangesByUser(userId: string): ChangeHistoryEntry[] {
		if (!this.changeHistory) {
			return []
		}
		return this.changeHistory.filter(entry => entry.userId === userId)
	}

	getChangesByField(fieldName: string): FieldChange[] {
		if (!this.changeHistory) {
			return []
		}
		const allChanges: FieldChange[] = []
		for (const entry of this.changeHistory) {
			const fieldChanges = entry.changes.filter(change => change.field === fieldName)
			allChanges.push(...fieldChanges)
		}
		return allChanges
	}
}

export interface ChangeHistoryEntry {
	timestamp: Date
	userId: string | null
	changes: FieldChange[]
}

export interface FieldChange {
	field: string
	oldValue: any
	newValue: any
}