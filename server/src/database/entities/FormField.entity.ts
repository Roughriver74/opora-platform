import {
	Entity,
	Column,
	Index,
	ManyToOne,
	JoinColumn,
} from 'typeorm'
import { IsString, IsBoolean, IsOptional, IsNumber, IsObject, IsArray } from 'class-validator'
import { BaseEntity } from './base/BaseEntity'
import { Form } from './Form.entity'

export interface FieldOption {
	value: string
	label: string
}

export interface DynamicSource {
	enabled: boolean
	source: string
	filter?: Record<string, any>
}

export interface LinkedFieldMapping {
	targetFieldName: string
	copyDirection: 'from' | 'to' | 'both'
	transformFunction?: string
}

export interface SourceField {
	sourceFieldName: string
	sourceFieldLabel?: string
	sourceSectionName?: string
}

export interface LinkedFields {
	enabled: boolean
	mappings: LinkedFieldMapping[]
	sourceField?: SourceField
}

@Entity('form_fields')
@Index(['formId', 'order'])
@Index(['formId', 'sectionId', 'order'])
@Index(['name', 'formId'])
@Index(['type'])
export class FormField extends BaseEntity {
	@ManyToOne(() => Form, form => form.fields, {
		onDelete: 'CASCADE',
	})
	@JoinColumn({ name: 'form_id' })
	form: Form

	@Column({ type: 'uuid', name: 'form_id' })
	formId: string

	@Column({ type: 'varchar', length: 100, nullable: true })
	@IsOptional()
	@IsString()
	sectionId?: string

	@Column({ type: 'varchar', length: 255 })
	@IsString()
	name: string

	@Column({ type: 'varchar', length: 255 })
	@IsString()
	label: string

	@Column({ type: 'varchar', length: 50 })
	@IsString()
	type: string

	@Column({ type: 'boolean', default: false })
	@IsBoolean()
	required: boolean

	@Column({ type: 'varchar', length: 255, nullable: true })
	@IsOptional()
	@IsString()
	placeholder?: string

	@Column({ type: 'varchar', length: 100, nullable: true })
	@IsOptional()
	@IsString()
	bitrixFieldId?: string

	@Column({ type: 'varchar', length: 100, nullable: true })
	@IsOptional()
	@IsString()
	bitrixFieldType?: string

	@Column({ type: 'varchar', length: 50, nullable: true })
	@IsOptional()
	@IsString()
	bitrixEntity?: string

	@Column({ type: 'jsonb', nullable: true })
	@IsOptional()
	@IsArray()
	options?: FieldOption[]

	@Column({ type: 'jsonb', nullable: true })
	@IsOptional()
	@IsObject()
	dynamicSource?: DynamicSource

	@Column({ type: 'jsonb', nullable: true })
	@IsOptional()
	@IsObject()
	linkedFields?: LinkedFields

	@Column({ type: 'int', default: 0 })
	@IsNumber()
	order: number

	@Column({ type: 'boolean', default: true, name: 'is_active' })
	@IsBoolean()
	isActive: boolean

	isDropdown(): boolean {
		return this.type === 'dropdown' || this.type === 'select'
	}

	isHidden(): boolean {
		return this.isActive === false
	}

	isDynamic(): boolean {
		return this.dynamicSource?.enabled === true
	}

	isLinked(): boolean {
		return this.linkedFields?.enabled === true
	}

	hasOptions(): boolean {
		return Array.isArray(this.options) && this.options.length > 0
	}

	getOptionByValue(value: string): FieldOption | undefined {
		return this.options?.find(opt => opt.value === value)
	}

	getLinkedTargetFields(): string[] {
		if (!this.linkedFields?.enabled || !this.linkedFields.mappings) {
			return []
		}
		return this.linkedFields.mappings.map(m => m.targetFieldName)
	}

	toPublicJSON() {
		const { form, ...publicField } = this
		return publicField
	}
}