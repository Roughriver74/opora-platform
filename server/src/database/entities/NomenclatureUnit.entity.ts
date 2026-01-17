import { Entity, Column, OneToMany, Index } from 'typeorm'
import { IsNotEmpty, Length, IsOptional, IsInt, IsBoolean } from 'class-validator'
import { BaseEntity } from './base/BaseEntity'
import type { Nomenclature } from './Nomenclature.entity'

@Entity('nomenclature_units')
@Index(['code'], { unique: true })
@Index(['isActive'])
export class NomenclatureUnit extends BaseEntity {
	@Column({ type: 'varchar', length: 50, unique: true })
	@IsNotEmpty({ message: 'Код единицы измерения обязателен' })
	@Length(1, 50, { message: 'Код должен быть от 1 до 50 символов' })
	code: string

	@Column({ type: 'varchar', length: 100 })
	@IsNotEmpty({ message: 'Название единицы измерения обязательно' })
	@Length(1, 100, { message: 'Название должно быть от 1 до 100 символов' })
	name: string

	@Column({ name: 'short_name', type: 'varchar', length: 20 })
	@IsNotEmpty({ message: 'Сокращение единицы измерения обязательно' })
	@Length(1, 20, { message: 'Сокращение должно быть от 1 до 20 символов' })
	shortName: string

	@Column({ name: 'okei_code', type: 'int', nullable: true })
	@IsOptional()
	@IsInt({ message: 'Код ОКЕИ должен быть целым числом' })
	okeiCode: number | null

	@Column({ name: 'is_active', type: 'boolean', default: true })
	@IsBoolean()
	isActive: boolean

	@OneToMany('Nomenclature', 'unit')
	nomenclatures: Nomenclature[]

	constructor(partial?: Partial<NomenclatureUnit>) {
		super()
		if (partial) {
			Object.assign(this, partial)
		}
	}
}
