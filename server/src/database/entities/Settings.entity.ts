import {
	Entity,
	Column,
	Index,
	BeforeInsert,
	BeforeUpdate,
} from 'typeorm'
import { IsString, IsObject, IsOptional } from 'class-validator'
import { BaseEntity } from './base/BaseEntity'

export enum SettingCategory {
	SYSTEM = 'system',
	BITRIX = 'bitrix',
	EMAIL = 'email',
	NOTIFICATION = 'notification',
	SECURITY = 'security',
	UI = 'ui',
}

@Entity('settings')
@Index(['key'], { unique: true })
@Index(['category'])
export class Settings extends BaseEntity {
	@Column({ type: 'varchar', length: 255, unique: true })
	@IsString()
	key: string

	@Column({ type: 'jsonb' })
	value: any

	@Column({
		type: 'enum',
		enum: SettingCategory,
		default: SettingCategory.SYSTEM,
	})
	category: SettingCategory

	@Column({ type: 'text', nullable: true })
	@IsOptional()
	@IsString()
	description?: string

	@Column({ type: 'boolean', default: false })
	isPublic: boolean

	@Column({ type: 'boolean', default: false })
	isEncrypted: boolean

	@Column({ type: 'jsonb', nullable: true })
	@IsOptional()
	@IsObject()
	validation?: {
		type?: string
		min?: number
		max?: number
		pattern?: string
		enum?: any[]
		required?: boolean
	}

	@Column({ type: 'jsonb', nullable: true })
	@IsOptional()
	@IsObject()
	metadata?: Record<string, any>

	@BeforeInsert()
	@BeforeUpdate()
	validateValue() {
		if (this.validation) {
			// Простая валидация на основе правил
			const { type, min, max, pattern, enum: enumValues, required } = this.validation

			if (required && (this.value === null || this.value === undefined)) {
				throw new Error(`Настройка ${this.key} обязательна`)
			}

			if (type) {
				const valueType = typeof this.value
				if (type === 'number' && valueType !== 'number') {
					throw new Error(`Настройка ${this.key} должна быть числом`)
				}
				if (type === 'string' && valueType !== 'string') {
					throw new Error(`Настройка ${this.key} должна быть строкой`)
				}
				if (type === 'boolean' && valueType !== 'boolean') {
					throw new Error(`Настройка ${this.key} должна быть булевым значением`)
				}
			}

			if (typeof this.value === 'number') {
				if (min !== undefined && this.value < min) {
					throw new Error(`Настройка ${this.key} не может быть меньше ${min}`)
				}
				if (max !== undefined && this.value > max) {
					throw new Error(`Настройка ${this.key} не может быть больше ${max}`)
				}
			}

			if (pattern && typeof this.value === 'string') {
				const regex = new RegExp(pattern)
				if (!regex.test(this.value)) {
					throw new Error(`Настройка ${this.key} не соответствует формату`)
				}
			}

			if (enumValues && enumValues.length > 0) {
				if (!enumValues.includes(this.value)) {
					throw new Error(`Настройка ${this.key} должна быть одним из: ${enumValues.join(', ')}`)
				}
			}
		}
	}

	static createSetting(
		key: string,
		value: any,
		category: SettingCategory = SettingCategory.SYSTEM,
		description?: string
	): Settings {
		const setting = new Settings()
		setting.key = key
		setting.value = value
		setting.category = category
		setting.description = description
		return setting
	}

	getValue<T = any>(): T {
		return this.value as T
	}

	updateValue(newValue: any) {
		this.value = newValue
	}

	toPublicJSON() {
		if (!this.isPublic) {
			return null
		}
		
		const { isEncrypted, ...publicSetting } = this
		if (isEncrypted) {
			return {
				...publicSetting,
				value: '***encrypted***',
			}
		}
		return publicSetting
	}
}