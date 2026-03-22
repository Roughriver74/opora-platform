import {
	Entity,
	Column,
	ManyToOne,
	OneToMany,
	JoinColumn,
	Index,
} from 'typeorm'
import {
	IsNotEmpty,
	Length,
	IsOptional,
	IsBoolean,
	IsInt,
	IsUUID,
} from 'class-validator'
import { AuditableEntity } from './base/AuditableEntity'
import type { Nomenclature } from './Nomenclature.entity'
import { Organization } from './Organization.entity'

@Entity('nomenclature_categories')
@Index(['parentId'])
@Index(['isActive'])
@Index(['bitrixSectionId'])
@Index(['organizationId'])
@Index(['organizationId', 'code'], { unique: true })
export class NomenclatureCategory extends AuditableEntity {
	@Column({ type: 'uuid', name: 'organization_id', nullable: true })
	@IsOptional()
	@IsUUID()
	organizationId?: string

	@ManyToOne(() => Organization)
	@JoinColumn({ name: 'organization_id' })
	organization?: Organization

	@Column({ type: 'varchar', length: 100 })
	@IsNotEmpty({ message: 'Код категории обязателен' })
	@Length(1, 100, { message: 'Код должен быть от 1 до 100 символов' })
	code: string

	@Column({ type: 'varchar', length: 255 })
	@IsNotEmpty({ message: 'Название категории обязательно' })
	@Length(1, 255, { message: 'Название должно быть от 1 до 255 символов' })
	name: string

	@Column({ type: 'text', nullable: true })
	@IsOptional()
	description: string | null

	@Column({ name: 'parent_id', type: 'uuid', nullable: true })
	@IsOptional()
	@IsUUID('4', { message: 'Некорректный UUID родительской категории' })
	parentId: string | null

	@ManyToOne(() => NomenclatureCategory, (category) => category.children, {
		nullable: true,
		onDelete: 'SET NULL',
	})
	@JoinColumn({ name: 'parent_id' })
	parent: NomenclatureCategory | null

	@OneToMany(() => NomenclatureCategory, (category) => category.parent)
	children: NomenclatureCategory[]

	@Column({ name: 'sort_order', type: 'int', default: 0 })
	@IsInt({ message: 'Порядок сортировки должен быть целым числом' })
	sortOrder: number

	@Column({ name: 'is_active', type: 'boolean', default: true })
	@IsBoolean()
	isActive: boolean

	@Column({ name: 'bitrix_section_id', type: 'varchar', length: 100, nullable: true })
	@IsOptional()
	@Length(1, 100, { message: 'ID раздела Bitrix24 должен быть до 100 символов' })
	bitrixSectionId: string | null

	@Column({ name: 'last_sync_at', type: 'timestamp', nullable: true })
	lastSyncAt: Date | null

	@OneToMany('Nomenclature', 'category')
	nomenclatures: Nomenclature[]

	constructor(partial?: Partial<NomenclatureCategory>) {
		super()
		if (partial) {
			Object.assign(this, partial)
		}
	}

	/**
	 * Проверяет, является ли категория корневой (без родителя)
	 */
	isRoot(): boolean {
		return this.parentId === null
	}

	/**
	 * Получает полный путь категории (для иерархического отображения)
	 */
	getPath(): string {
		if (this.parent) {
			return `${this.parent.getPath()} > ${this.name}`
		}
		return this.name
	}
}
