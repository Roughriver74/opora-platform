import {
	Entity,
	Column,
	Index,
	OneToMany,
} from 'typeorm'
import { IsString, IsBoolean, IsOptional } from 'class-validator'
import { BaseEntity } from './base/BaseEntity'
import { FormField } from './FormField.entity'
import { Submission } from './Submission.entity'

@Entity('forms')
@Index(['name'], { unique: true })
@Index(['isActive'])
export class Form extends BaseEntity {
	@Column({ type: 'varchar', length: 255, unique: true })
	@IsString()
	name: string

	@Column({ type: 'varchar', length: 255 })
	@IsString()
	title: string

	@Column({ type: 'text', nullable: true })
	@IsOptional()
	@IsString()
	description?: string

	@Column({ type: 'boolean', default: true })
	@IsBoolean()
	isActive: boolean

	@Column({ type: 'varchar', length: 100, nullable: true })
	@IsOptional()
	@IsString()
	bitrixDealCategory?: string

	@Column({
		type: 'text',
		default: 'Спасибо! Ваша заявка успешно отправлена.',
	})
	@IsString()
	successMessage: string

	@OneToMany(() => FormField, field => field.form, {
		cascade: true,
		eager: true,
	})
	fields: FormField[]

	@OneToMany(() => Submission, submission => submission.form)
	submissions: Submission[]

	getActiveFields(): FormField[] {
		return this.fields?.filter(field => field !== null && field.isActive !== false) || []
	}

	getAllFields(includeInactive = false): FormField[] {
		if (includeInactive) {
			return this.fields?.filter(field => field !== null) || []
		}
		return this.getActiveFields()
	}

	getRequiredFields(): FormField[] {
		return this.fields?.filter(field => field.required) || []
	}

	getFieldByName(name: string): FormField | undefined {
		return this.fields?.find(field => field.name === name)
	}

	getFieldsBySection(sectionId: string): FormField[] {
		return this.fields?.filter(field => field.sectionId === sectionId) || []
	}

	getFieldCount(): number {
		return this.fields?.length || 0
	}

	toPublicJSON() {
		const { submissions, ...publicForm } = this
		return publicForm
	}
}