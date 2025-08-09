import { BaseService } from './base/BaseService'
import { User, UserRole, UserStatus } from '../database/entities/User.entity'
import { UserRepository } from '../database/repositories/UserRepository'
import { getUserRepository } from '../database/repositories'
import * as jwt from 'jsonwebtoken'
import * as bcrypt from 'bcrypt'
import { DeepPartial } from 'typeorm'

export interface CreateUserDTO {
	email: string
	password: string
	firstName?: string
	lastName?: string
	phone?: string
	role?: UserRole
}

export interface UpdateUserDTO {
	firstName?: string
	lastName?: string
	phone?: string
	status?: UserStatus
	isActive?: boolean
	settings?: Record<string, any>
}

export interface LoginDTO {
	email: string
	password: string
}

export interface AuthResponse {
	token: string
	user: Partial<User>
}

export class UserService extends BaseService<User, UserRepository> {
	constructor() {
		super(getUserRepository())
	}

	async createUser(data: CreateUserDTO): Promise<User> {
		// Валидация уникальности email
		const emailExists = await this.repository.findByEmail(data.email)
		if (emailExists) {
			this.throwDuplicateError('Email', data.email)
		}

		// Создание пользователя
		const user = await this.repository.create({
			...data,
			email: data.email.toLowerCase(),
			role: data.role || UserRole.USER,
			status: UserStatus.ACTIVE,
			isActive: true,
		})

		return user
	}

	async login(credentials: LoginDTO): Promise<AuthResponse | null> {
		const user = await this.repository.findByEmail(credentials.email)
		
		if (!user || !user.isActive) {
			return null
		}

		// Используем bcrypt напрямую
		const isPasswordValid = await bcrypt.compare(credentials.password, user.password)
		if (!isPasswordValid) {
			return null
		}

		// Обновление последнего входа
		await this.repository.updateLastLogin(user.id)

		// Генерация JWT токена
		const token = this.generateToken(user)

		return {
			token,
			user: user.toSafeObject(),
		}
	}

	async updateUser(id: string, data: UpdateUserDTO): Promise<User | null> {
		const user = await this.repository.findById(id)
		if (!user) {
			this.throwNotFound('Пользователь', id)
		}

		return this.repository.update(id, data)
	}

	async updateSettings(userId: string, settings: Record<string, any>): Promise<User | null> {
		return this.repository.updateSettings(userId, settings)
	}

	async changePassword(userId: string, oldPassword: string, newPassword: string): Promise<boolean> {
		const user = await this.repository.findById(userId)
		if (!user) {
			this.throwNotFound('Пользователь', userId)
		}

		const isPasswordValid = await bcrypt.compare(oldPassword, user.password)
		if (!isPasswordValid) {
			this.throwValidationError('Неверный текущий пароль')
		}

		return this.repository.changePassword(userId, newPassword)
	}

	async deactivateUser(userId: string): Promise<boolean> {
		return this.repository.deactivateUser(userId)
	}

	async activateUser(userId: string): Promise<boolean> {
		return this.repository.activateUser(userId)
	}

	async findByEmail(email: string): Promise<User | null> {
		return this.repository.findByEmail(email)
	}

	async findByBitrixUserId(bitrixUserId: string): Promise<User | null> {
		return this.repository.findByBitrixUserId(bitrixUserId)
	}

	async findActiveUsers(): Promise<User[]> {
		return this.repository.findActiveUsers()
	}

	async findAdmins(): Promise<User[]> {
		return this.repository.findAdmins()
	}

	async findByRole(role: UserRole): Promise<User[]> {
		return this.repository.findByRole(role)
	}

	async searchUsers(query: string): Promise<User[]> {
		return this.repository.searchUsers(query)
	}

	async getAssignableUsers(): Promise<User[]> {
		return this.repository.getAssignableUsers()
	}

	async getUserStatistics(userId: string): Promise<any> {
		return this.repository.getUserStatistics(userId)
	}

	async createOrUpdateFromBitrix(bitrixData: any): Promise<User> {
		const existingUser = await this.repository.findByBitrixUserId(bitrixData.ID)

		if (existingUser) {
			// Обновление существующего пользователя
			return this.repository.update(existingUser.id, {
				firstName: bitrixData.NAME || existingUser.firstName,
				lastName: bitrixData.LAST_NAME || existingUser.lastName,
				email: bitrixData.EMAIL || existingUser.email,
				phone: bitrixData.PERSONAL_MOBILE || existingUser.phone,
			}) as Promise<User>
		}

		// Создание нового пользователя
		return this.repository.create({
			email: bitrixData.EMAIL.toLowerCase(),
			password: this.generateRandomPassword(),
			firstName: bitrixData.NAME,
			lastName: bitrixData.LAST_NAME,
			phone: bitrixData.PERSONAL_MOBILE,
			bitrixUserId: bitrixData.ID,
			status: UserStatus.ACTIVE,
			isActive: true,
			role: UserRole.USER,
		})
	}

	private generateToken(user: User): string {
		const payload = {
			id: user.id,
			email: user.email,
			role: user.role,
		}

		const secret = process.env.JWT_SECRET || 'secret'
		const expiresIn = process.env.JWT_EXPIRES_IN || '7d'
		
		return jwt.sign(payload, secret, { expiresIn } as jwt.SignOptions)
	}

	private generateRandomPassword(): string {
		return Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8)
	}

	async verifyToken(token: string): Promise<User | null> {
		try {
			const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as any
			return this.repository.findById(decoded.id)
		} catch (error) {
			return null
		}
	}
}

// Синглтон для сервиса
let userService: UserService | null = null

export const getUserService = (): UserService => {
	if (!userService) {
		userService = new UserService()
	}
	return userService
}