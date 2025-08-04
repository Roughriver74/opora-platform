import {
	Entity,
	Column,
	Index,
	BeforeInsert,
	BeforeUpdate,
	OneToMany,
} from 'typeorm'
import * as bcrypt from 'bcrypt'
import { IsEmail, IsEnum, IsBoolean, IsOptional, IsString } from 'class-validator'
import { BaseEntity } from './base/BaseEntity'
import { Exclude, Expose } from 'class-transformer'
import { Submission } from './Submission.entity'

export enum UserRole {
	USER = 'user',
	ADMIN = 'admin',
}

export enum UserStatus {
	ACTIVE = 'active',
	INACTIVE = 'inactive',
}

@Entity('users')
@Index(['email'], { unique: true })
@Index(['role'])
@Index(['isActive'])
@Index(['bitrixUserId'])
export class User extends BaseEntity {
	@Column({ type: 'varchar', length: 255, unique: true })
	@IsEmail()
	email: string

	@Column({ type: 'varchar', length: 255 })
	@Exclude()
	password: string

	@Column({ type: 'varchar', length: 100, nullable: true })
	@IsOptional()
	@IsString()
	firstName?: string

	@Column({ type: 'varchar', length: 100, nullable: true })
	@IsOptional()
	@IsString()
	lastName?: string

	@Column({ type: 'varchar', length: 50, nullable: true })
	@IsOptional()
	@IsString()
	phone?: string

	@Column({ type: 'varchar', length: 100, nullable: true })
	@IsOptional()
	@IsString()
	bitrix_id?: string

	@Column({ type: 'varchar', length: 100, nullable: true })
	@IsOptional()
	@IsString()
	bitrixUserId?: string

	@Column({
		type: 'enum',
		enum: UserStatus,
		default: UserStatus.ACTIVE,
	})
	@IsEnum(UserStatus)
	status: UserStatus

	@Column({
		type: 'enum',
		enum: UserRole,
		default: UserRole.USER,
	})
	@IsEnum(UserRole)
	role: UserRole

	@Column({ type: 'boolean', default: true })
	@IsBoolean()
	isActive: boolean

	@Column({
		type: 'jsonb',
		default: { onlyMyCompanies: false },
	})
	settings: {
		onlyMyCompanies: boolean
		[key: string]: any
	}

	@Column({ type: 'timestamp', nullable: true })
	lastLogin?: Date

	@OneToMany(() => Submission, submission => submission.user)
	submissions: Submission[]

	@OneToMany(() => Submission, submission => submission.assignedTo)
	assignedSubmissions: Submission[]

	@BeforeInsert()
	@BeforeUpdate()
	async hashPassword() {
		if (this.password && !this.password.startsWith('$2b$')) {
			const salt = await bcrypt.genSalt(10)
			this.password = await bcrypt.hash(this.password, salt)
		}
	}

	async comparePassword(candidatePassword: string): Promise<boolean> {
		return bcrypt.compare(candidatePassword, this.password)
	}

	@Expose()
	get fullName(): string {
		if (this.firstName && this.lastName) {
			return `${this.firstName} ${this.lastName}`
		}
		return this.firstName || this.lastName || this.email
	}

	updateLastLogin() {
		this.lastLogin = new Date()
	}

	isAdmin(): boolean {
		return this.role === UserRole.ADMIN
	}

	canAccessAllCompanies(): boolean {
		return this.isAdmin() || !this.settings.onlyMyCompanies
	}

	toJSON() {
		const obj = super.toJSON()
		delete obj.password
		return obj
	}

	toSafeObject() {
		const { password, ...safeUser } = this
		return safeUser
	}
}