import {
	Entity,
	Column,
	Index,
	ManyToOne,
	JoinColumn,
	Unique,
} from 'typeorm'
import { IsEnum, IsBoolean } from 'class-validator'
import { BaseEntity } from './base/BaseEntity'
import { User } from './User.entity'
import { Organization } from './Organization.entity'

export enum OrganizationRole {
	ORG_ADMIN = 'org_admin',
	MANAGER = 'manager',
	DISTRIBUTOR = 'distributor',
}

@Entity('user_organizations')
@Unique(['userId', 'organizationId'])
@Index(['userId'])
@Index(['organizationId'])
@Index(['role'])
export class UserOrganization extends BaseEntity {
	@Column({ type: 'uuid', name: 'user_id' })
	userId: string

	@Column({ type: 'uuid', name: 'organization_id' })
	organizationId: string

	@Column({
		type: 'enum',
		enum: OrganizationRole,
	})
	@IsEnum(OrganizationRole)
	role: OrganizationRole

	@Column({ type: 'boolean', default: true, name: 'is_active' })
	@IsBoolean()
	isActive: boolean

	@ManyToOne(() => User, user => user.organizationMemberships, { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'user_id' })
	user: User

	@ManyToOne(() => Organization, org => org.members, { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'organization_id' })
	organization: Organization

	toJSON() {
		const obj: any = super.toJSON()
		return obj
	}
}
