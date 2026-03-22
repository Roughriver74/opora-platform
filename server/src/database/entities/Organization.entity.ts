import {
	Entity,
	Column,
	Index,
	OneToMany,
} from 'typeorm'
import { IsString, IsBoolean, IsOptional } from 'class-validator'
import { BaseEntity } from './base/BaseEntity'
import { UserOrganization } from './UserOrganization.entity'

export interface OrganizationSettings {
	// Bitrix24 интеграция (опционально)
	bitrixEnabled?: boolean
	bitrixWebhookUrl?: string
	bitrixDealCategory?: string
	bitrixFieldMapping?: Record<string, string> // formField -> UF_CRM_* маппинг
	bitrixStatuses?: {
		new?: string        // e.g. 'C1:NEW'
		won?: string        // e.g. 'C1:WON'
		lost?: string       // e.g. 'C1:LOSE'
		[key: string]: string | undefined
	}
	// Общие настройки
	timezone?: string
	// Конфигурация материалов (вместо захардкоженных concrete/mortar/cps)
	materialConfig?: Record<string, {
		priority: number
		label: string
		fields: string[]
		volumeFields: string[]
	}>
	// Конфигурация специальных полей формы
	specialFields?: {
		shipmentDateField?: string    // ID поля даты отгрузки
		clientField?: string          // ID поля клиента/компании
		abnTimeField?: string         // ID поля времени АБН
	}
	// Брендинг
	branding?: {
		companyName?: string
		primaryColor?: string
		secondaryColor?: string
		logoUrl?: string
	}
	[key: string]: any
}

@Entity('organizations')
@Index(['slug'], { unique: true })
@Index(['isActive'])
export class Organization extends BaseEntity {
	@Column({ type: 'varchar', length: 500 })
	@IsString()
	name: string

	@Column({ type: 'varchar', length: 100, unique: true })
	@IsString()
	slug: string

	@Column({ type: 'varchar', length: 12, nullable: true })
	@IsOptional()
	@IsString()
	inn?: string

	@Column({ type: 'boolean', default: true })
	@IsBoolean()
	isActive: boolean

	@Column({
		type: 'jsonb',
		default: {},
	})
	settings: OrganizationSettings

	@Column({ type: 'varchar', length: 50, nullable: true, name: 'subscription_plan' })
	@IsOptional()
	@IsString()
	subscriptionPlan?: string

	@Column({ type: 'timestamp', nullable: true, name: 'subscription_expires_at' })
	@IsOptional()
	subscriptionExpiresAt?: Date

	@OneToMany(() => UserOrganization, uo => uo.organization)
	members: UserOrganization[]

	toJSON() {
		const obj: any = super.toJSON()
		return obj
	}
}
