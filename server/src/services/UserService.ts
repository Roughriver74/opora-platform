import { BaseService } from './base/BaseService'
import { User, UserRole, UserStatus } from '../database/entities/User.entity'
import { UserRepository } from '../database/repositories/UserRepository'
import { getUserRepository } from '../database/repositories'
import { UserOrganization, OrganizationRole } from '../database/entities/UserOrganization.entity'
import { AppDataSource } from '../database/config/database.config'
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
	bitrixUserId?: string
}

export interface UpdateUserDTO {
	firstName?: string
	lastName?: string
	phone?: string
	status?: UserStatus
	isActive?: boolean
	settings?: Record<string, any>
	bitrixUserId?: string
	password?: string
	email?: string
	role?: UserRole
}

export interface LoginDTO {
	email: string
	password: string
}

export interface OrganizationInfo {
	id: string
	name: string
	slug: string
	role: OrganizationRole
}

export interface AuthResponse {
	token: string
	user: Partial<User>
	organizations?: OrganizationInfo[]
	needsOrganizationSelection?: boolean
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

		// Используем bcrypt напрямую, с безопасным фолбэком для старых (нехэшированных) паролей
		let isPasswordValid = false
		try {
			isPasswordValid = await bcrypt.compare(
				credentials.password,
				user.password
			)
		} catch (e) {
			// Если в БД хранится невалидный/нехэшированный пароль — пробуем прямое сравнение
			isPasswordValid =
				credentials.password === (user.password as unknown as string)
			if (isPasswordValid) {
				// Перехэшируем пароль и сохраняем
				await this.repository.changePassword(user.id, credentials.password)
			}
		}
		if (!isPasswordValid) {
			return null
		}

		// Обновление последнего входа
		await this.repository.updateLastLogin(user.id)

		// Загрузить организации пользователя
		const memberships = await this.getUserOrganizations(user.id)

		if (user.isSuperAdmin || memberships.length === 0) {
			// Суперадмин или пользователь без организаций — токен без организации
			const token = this.generateToken(user)
			return {
				token,
				user: user.toSafeObject(),
				organizations: memberships,
				needsOrganizationSelection: memberships.length > 1,
			}
		}

		if (memberships.length === 1) {
			// Одна организация — автоматически подставляем
			const token = this.generateToken(user, memberships[0].id, memberships[0].role)
			return {
				token,
				user: user.toSafeObject(),
				organizations: memberships,
			}
		}

		// Несколько организаций — требуется выбор
		const token = this.generateToken(user)
		return {
			token,
			user: user.toSafeObject(),
			organizations: memberships,
			needsOrganizationSelection: true,
		}
	}

	/**
	 * Выбор организации — возвращает новый JWT с контекстом организации
	 */
	async selectOrganization(userId: string, organizationId: string): Promise<AuthResponse | null> {
		const user = await this.repository.findById(userId)
		if (!user || !user.isActive) return null

		// Проверить, что пользователь состоит в этой организации
		const uoRepo = AppDataSource.getRepository(UserOrganization)
		const membership = await uoRepo.findOne({
			where: { userId, organizationId, isActive: true },
			relations: ['organization'],
		})

		if (!membership && !user.isSuperAdmin) {
			return null
		}

		const role = membership?.role
		const token = this.generateToken(user, organizationId, role)
		const memberships = await this.getUserOrganizations(userId)

		return {
			token,
			user: user.toSafeObject(),
			organizations: memberships,
		}
	}

	/**
	 * Получить список организаций пользователя
	 */
	async getUserOrganizations(userId: string): Promise<OrganizationInfo[]> {
		const uoRepo = AppDataSource.getRepository(UserOrganization)
		const memberships = await uoRepo.find({
			where: { userId, isActive: true },
			relations: ['organization'],
		})

		return memberships
			.filter(m => m.organization && m.organization.isActive)
			.map(m => ({
				id: m.organization.id,
				name: m.organization.name,
				slug: m.organization.slug,
				role: m.role,
			}))
	}

	async updateUser(id: string, data: UpdateUserDTO): Promise<User | null> {
		console.log(`🔄 updateUser called for ${id} with data:`, data)
		
		const user = await this.repository.findById(id)
		if (!user) {
			this.throwNotFound('Пользователь', id)
		}

		// Если обновляется пароль, используем специальный метод
		if (data.password) {
			console.log(`🔐 Password detected in data: ${data.password}`)
			const { password, ...otherData } = data
			await this.repository.changePassword(id, password)
			
			// Обновляем остальные данные если есть
			if (Object.keys(otherData).length > 0) {
				console.log(`🔄 Updating other data:`, otherData)
				return this.repository.update(id, otherData)
			}
			
			// Возвращаем обновленного пользователя
			console.log(`👤 Returning updated user`)
			return this.repository.findById(id)
		}

		console.log(`📝 No password, using regular update`)
		return this.repository.update(id, data)
	}

	async updateSettings(
		userId: string,
		settings: Record<string, any>
	): Promise<User | null> {
		return this.repository.updateSettings(userId, settings)
	}

	async changePassword(
		userId: string,
		oldPassword: string,
		newPassword: string
	): Promise<boolean> {
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

	private generateToken(user: User, organizationId?: string, organizationRole?: OrganizationRole): string {
		const payload: Record<string, any> = {
			id: user.id,
			email: user.email,
			role: user.role,
			isSuperAdmin: user.isSuperAdmin || false,
			bitrixUserId: user.bitrixUserId,
		}

		if (organizationId) {
			payload.organizationId = organizationId
		}
		if (organizationRole) {
			payload.organizationRole = organizationRole
		}

		const secret = process.env.JWT_SECRET || 'secret'
		const expiresIn = process.env.JWT_EXPIRES_IN || '7d'

		return jwt.sign(payload, secret, { expiresIn } as jwt.SignOptions)
	}

	private generateRandomPassword(): string {
		return (
			Math.random().toString(36).slice(-8) +
			Math.random().toString(36).slice(-8)
		)
	}

	async verifyToken(token: string): Promise<User | null> {
		try {
			const decoded = jwt.verify(
				token,
				process.env.JWT_SECRET || 'secret'
			) as any
			return this.repository.findById(decoded.id)
		} catch (error) {
			return null
		}
	}

	async findWithPaginationAndFilters(
		page: number = 1,
		limit: number = 20,
		filters: { search?: string; role?: UserRole; status?: UserStatus } = {}
	): Promise<{
		data: User[]
		total: number
		page: number
		limit: number
		pages: number
	}> {
		return this.repository.findWithPaginationAndFilters(page, limit, filters)
	}

	// Публичный доступ к repository для прямых операций
	get userRepository(): UserRepository {
		return this.repository
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
