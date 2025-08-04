import { BaseRepository } from './base/BaseRepository'
import { User, UserRole, UserStatus } from '../entities/User.entity'
import { FindManyOptions } from 'typeorm'

export class UserRepository extends BaseRepository<User> {
	constructor() {
		super(User, 'user')
	}

	async findByEmail(email: string): Promise<User | null> {
		const cacheKey = `${this.cachePrefix}:email:${email.toLowerCase()}`
		
		// Проверка кеша
		const cached = await this.cacheGet<User>(cacheKey)
		if (cached) return cached

		const user = await this.repository.findOne({
			where: { email: email.toLowerCase() },
		})

		if (user) {
			await this.cacheSet(cacheKey, user)
		}

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
		const user = await this.findById(userId)
		if (!user) return false

		user.password = newPassword // Хеширование происходит в @BeforeUpdate
		await this.repository.save(user)
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
}