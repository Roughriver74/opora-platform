import {
	Entity,
	Column,
	Index,
	ManyToOne,
	JoinColumn,
	BeforeInsert,
} from 'typeorm'
import { IsString, IsBoolean, IsOptional, IsDate } from 'class-validator'
import { BaseEntity } from './base/BaseEntity'
import { User } from './User.entity'
import * as crypto from 'crypto'

@Entity('admin_tokens')
@Index(['token'], { unique: true })
@Index(['userId'])
@Index(['isActive', 'expiresAt'])
export class AdminToken extends BaseEntity {
	@Column({ type: 'varchar', length: 255, unique: true })
	@IsString()
	token: string

	@ManyToOne(() => User, { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'user_id' })
	user: User

	@Column({ type: 'uuid', name: 'user_id' })
	userId: string

	@Column({ type: 'text' })
	@IsString()
	purpose: string

	@Column({ type: 'boolean', default: true })
	@IsBoolean()
	isActive: boolean

	@Column({ type: 'timestamp', nullable: true })
	@IsOptional()
	@IsDate()
	lastUsedAt?: Date

	@Column({ type: 'timestamp' })
	@IsDate()
	expiresAt: Date

	@Column({ type: 'varchar', length: 45, nullable: true })
	@IsOptional()
	@IsString()
	ipAddress?: string

	@Column({ type: 'text', nullable: true })
	@IsOptional()
	@IsString()
	userAgent?: string

	@BeforeInsert()
	generateToken() {
		if (!this.token) {
			this.token = crypto.randomBytes(32).toString('hex')
		}
		if (!this.expiresAt) {
			// По умолчанию токен действует 30 дней
			const expirationDate = new Date()
			expirationDate.setDate(expirationDate.getDate() + 30)
			this.expiresAt = expirationDate
		}
	}

	isExpired(): boolean {
		return new Date() > new Date(this.expiresAt)
	}

	isValid(): boolean {
		return this.isActive && !this.isExpired()
	}

	markAsUsed(ipAddress?: string, userAgent?: string) {
		this.lastUsedAt = new Date()
		if (ipAddress) this.ipAddress = ipAddress
		if (userAgent) this.userAgent = userAgent
	}

	revoke() {
		this.isActive = false
	}

	getDaysUntilExpiration(): number {
		const now = new Date()
		const expiration = new Date(this.expiresAt)
		const diffTime = expiration.getTime() - now.getTime()
		return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
	}

	static createToken(
		userId: string,
		purpose: string,
		expirationDays: number = 30
	): AdminToken {
		const token = new AdminToken()
		token.userId = userId
		token.purpose = purpose
		token.isActive = true
		
		const expirationDate = new Date()
		expirationDate.setDate(expirationDate.getDate() + expirationDays)
		token.expiresAt = expirationDate
		
		return token
	}

	toPublicJSON() {
		const { token, user, ...publicToken } = this
		return {
			...publicToken,
			tokenPreview: this.token.substring(0, 8) + '...',
			userName: user?.fullName,
			userEmail: user?.email,
		}
	}
}