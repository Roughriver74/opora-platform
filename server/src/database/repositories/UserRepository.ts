import { BaseRepository } from './base/BaseRepository'
import { User, UserRole, UserStatus } from '../entities/User.entity'
import { FindManyOptions } from 'typeorm'

export class UserRepository extends BaseRepository<User> {
	constructor() {
		super(User, 'user')
	}

	async findByEmail(email: string): Promise<User | null> {
		const user = await this.repository.findOne({
			where: { email: email.toLowerCase() },
			select: ['id', 'email', 'password', 'firstName', 'lastName', 'phone', 'bitrixUserId', 'status', 'role', 'isActive', 'isSuperAdmin', 'settings', 'lastLogin', 'authProvider', 'authProviderId', 'createdAt', 'updatedAt']
		})

		return user
	}

	async findByBitrixUserId(bitrixUserId: string): Promise<User | null> {
		return this.repository.findOne({
			where: { bitrixUserId },
		})
	}

	async findActiveUsers(options?: FindManyOptions<User>): Promise<User[]> {
		return this.repository.find({
			where: { isActive: true, status: UserStatus.ACTIVE },
			...options,
		})
	}

	async findAdmins(): Promise<User[]> {
		return this.repository.find({
			where: { role: UserRole.ADMIN, isActive: true },
			order: { createdAt: 'DESC' },
		})
	}

	async findByRole(role: UserRole, options?: FindManyOptions<User>): Promise<User[]> {
		return this.repository.find({
			where: { role },
			...options,
		})
	}

	async updateLastLogin(userId: string): Promise<void> {
		await this.repository.update(userId, {
			lastLogin: new Date(),
		})
		await this.invalidateCache(userId)
	}

	async updateSettings(userId: string, settings: Record<string, any>): Promise<User | null> {
		const user = await this.findById(userId)
		if (!user) return null

		user.settings = { ...user.settings, ...settings }
		const saved = await this.repository.save(user)
		await this.invalidateCache(userId)
		
		return saved
	}

	async deactivateUser(userId: string): Promise<boolean> {
		const result = await this.repository.update(userId, {
			isActive: false,
			status: UserStatus.INACTIVE,
		})
		await this.invalidateCache(userId)
		return result.affected ? result.affected > 0 : false
	}

	async activateUser(userId: string): Promise<boolean> {
		const result = await this.repository.update(userId, {
			isActive: true,
			status: UserStatus.ACTIVE,
		})
		await this.invalidateCache(userId)
		return result.affected ? result.affected > 0 : false
	}

	async changePassword(userId: string, newPassword: string): Promise<boolean> {
		console.log(`🔐 changePassword called for user ${userId} with password: ${newPassword}`)
		
		// Получаем пользователя с паролем
		const user = await this.repository.createQueryBuilder('user')
			.where('user.id = :id', { id: userId })
			.addSelect('user.password')
			.getOne()
		
		if (!user) {
			console.log(`❌ User ${userId} not found`)
			return false
		}

		console.log(`👤 Found user: ${user.email}`)
		
		// Хеширование пароля вручную, так как hooks не всегда срабатывают
		if (!newPassword.startsWith('$2b$')) {
			const bcrypt = require('bcrypt')
			const salt = await bcrypt.genSalt(10)
			const hashedPassword = await bcrypt.hash(newPassword, salt)
			user.password = hashedPassword
			console.log(`🔒 Password hashed: ${hashedPassword.substring(0, 20)}...`)
		} else {
			user.password = newPassword
		}
		
		const savedUser = await this.repository.save(user)
		console.log(`💾 User saved successfully`)
		
		await this.invalidateCache(userId)
		
		return true
	}

	async searchUsers(query: string): Promise<User[]> {
		const queryBuilder = this.createQueryBuilder('user')
		
		return queryBuilder
			.where(
				'LOWER(user.email) LIKE LOWER(:query) OR ' +
				'LOWER(user.firstName) LIKE LOWER(:query) OR ' +
				'LOWER(user.lastName) LIKE LOWER(:query)',
				{ query: `%${query}%` }
			)
			.andWhere('user.isActive = :isActive', { isActive: true })
			.orderBy('user.createdAt', 'DESC')
			.limit(20)
			.getMany()
	}

	async getUsersWithSubmissions(): Promise<User[]> {
		return this.createQueryBuilder('user')
			.leftJoinAndSelect('user.submissions', 'submission')
			.where('user.isActive = :isActive', { isActive: true })
			.orderBy('user.createdAt', 'DESC')
			.getMany()
	}

	async getAssignableUsers(): Promise<User[]> {
		return this.repository.find({
			where: [
				{ role: UserRole.ADMIN, isActive: true },
				{ role: UserRole.USER, isActive: true, settings: { onlyMyCompanies: false } as any },
			],
			order: { firstName: 'ASC', lastName: 'ASC' },
		})
	}

	async getUserStatistics(userId: string): Promise<{
		totalSubmissions: number
		assignedSubmissions: number
		lastLoginDays: number | null
		accountAgeDays: number
	}> {
		const user = await this.createQueryBuilder('user')
			.leftJoin('user.submissions', 'submission')
			.leftJoin('user.assignedSubmissions', 'assigned')
			.where('user.id = :userId', { userId })
			.select('user.id', 'id')
			.addSelect('user.createdAt', 'createdAt')
			.addSelect('user.lastLogin', 'lastLogin')
			.addSelect('COUNT(DISTINCT submission.id)', 'totalSubmissions')
			.addSelect('COUNT(DISTINCT assigned.id)', 'assignedSubmissions')
			.groupBy('user.id')
			.getRawOne()

		if (!user) {
			return {
				totalSubmissions: 0,
				assignedSubmissions: 0,
				lastLoginDays: null,
				accountAgeDays: 0,
			}
		}

		const now = new Date()
		const createdAt = new Date(user.createdAt)
		const lastLogin = user.lastLogin ? new Date(user.lastLogin) : null

		return {
			totalSubmissions: parseInt(user.totalSubmissions) || 0,
			assignedSubmissions: parseInt(user.assignedSubmissions) || 0,
			lastLoginDays: lastLogin 
				? Math.floor((now.getTime() - lastLogin.getTime()) / (1000 * 60 * 60 * 24))
				: null,
			accountAgeDays: Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24)),
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
		const queryBuilder = this.createQueryBuilder('user')
		
		// Применяем фильтры
		if (filters.search) {
			queryBuilder.where(
				'LOWER(user.email) LIKE LOWER(:search) OR ' +
				'LOWER(user.firstName) LIKE LOWER(:search) OR ' +
				'LOWER(user.lastName) LIKE LOWER(:search)',
				{ search: `%${filters.search}%` }
			)
		}

		if (filters.role) {
			if (filters.search) {
				queryBuilder.andWhere('user.role = :role', { role: filters.role })
			} else {
				queryBuilder.where('user.role = :role', { role: filters.role })
			}
		}

		if (filters.status) {
			const condition = 'user.status = :status'
			if (filters.search || filters.role) {
				queryBuilder.andWhere(condition, { status: filters.status })
			} else {
				queryBuilder.where(condition, { status: filters.status })
			}
		}

		// Исключаем поле password из выборки
		queryBuilder.select([
			'user.id',
			'user.email',
			'user.firstName',
			'user.lastName',
			'user.phone',
			'user.bitrixUserId',
			'user.status',
			'user.role',
			'user.isActive',
			'user.settings',
			'user.lastLogin',
			'user.createdAt',
			'user.updatedAt',
		])

		// Сортировка по дате создания (новые первыми)
		queryBuilder.orderBy('user.createdAt', 'DESC')

		// Пагинация
		const skip = (page - 1) * limit
		queryBuilder.skip(skip).take(limit)

		// Получаем данные и общее количество
		const [data, total] = await queryBuilder.getManyAndCount()

		return {
			data,
			total,
			page,
			limit,
			pages: Math.ceil(total / limit),
		}
	}
}

// Экспорт функции для получения экземпляра репозитория
let userRepository: UserRepository | null = null

export const getUserRepository = (): UserRepository => {
	if (!userRepository) {
		userRepository = new UserRepository()
	}
	return userRepository
}