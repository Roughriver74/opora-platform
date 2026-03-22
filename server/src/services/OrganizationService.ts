import { AppDataSource } from '../database/config/database.config'
import { Organization, OrganizationSettings } from '../database/entities/Organization.entity'
import { UserOrganization, OrganizationRole } from '../database/entities/UserOrganization.entity'
import { User } from '../database/entities/User.entity'
import { Repository } from 'typeorm'

export interface CreateOrganizationDTO {
	name: string
	slug: string
	inn?: string
	settings?: Record<string, any>
}

export interface UpdateOrganizationDTO {
	name?: string
	slug?: string
	inn?: string
	isActive?: boolean
	settings?: Record<string, any>
}

export interface AddMemberDTO {
	userId: string
	role: OrganizationRole
}

export class OrganizationService {
	private orgRepo: Repository<Organization>
	private uoRepo: Repository<UserOrganization>
	private userRepo: Repository<User>

	constructor() {
		this.orgRepo = AppDataSource.getRepository(Organization)
		this.uoRepo = AppDataSource.getRepository(UserOrganization)
		this.userRepo = AppDataSource.getRepository(User)
	}

	async findAll(): Promise<Organization[]> {
		return this.orgRepo.find({ order: { createdAt: 'DESC' } })
	}

	async findById(id: string): Promise<Organization | null> {
		return this.orgRepo.findOne({ where: { id } })
	}

	async findBySlug(slug: string): Promise<Organization | null> {
		return this.orgRepo.findOne({ where: { slug } })
	}

	async create(data: CreateOrganizationDTO): Promise<Organization> {
		// Проверка уникальности slug
		const existing = await this.findBySlug(data.slug)
		if (existing) {
			throw new Error(`Организация со slug "${data.slug}" уже существует`)
		}

		const org = this.orgRepo.create({
			name: data.name,
			slug: data.slug.toLowerCase(),
			inn: data.inn,
			settings: data.settings || {},
			isActive: true,
		})
		return this.orgRepo.save(org)
	}

	async update(id: string, data: UpdateOrganizationDTO): Promise<Organization | null> {
		const org = await this.findById(id)
		if (!org) return null

		if (data.slug && data.slug !== org.slug) {
			const existing = await this.findBySlug(data.slug)
			if (existing) {
				throw new Error(`Организация со slug "${data.slug}" уже существует`)
			}
		}

		Object.assign(org, data)
		return this.orgRepo.save(org)
	}

	async deactivate(id: string): Promise<boolean> {
		const result = await this.orgRepo.update(id, { isActive: false })
		return (result.affected || 0) > 0
	}

	// === Управление участниками ===

	async getMembers(organizationId: string): Promise<(UserOrganization & { user: User })[]> {
		return this.uoRepo.find({
			where: { organizationId },
			relations: ['user'],
			order: { createdAt: 'ASC' },
		}) as any
	}

	async addMember(organizationId: string, data: AddMemberDTO): Promise<UserOrganization> {
		// Проверить, что пользователь существует
		const user = await this.userRepo.findOne({ where: { id: data.userId } })
		if (!user) {
			throw new Error('Пользователь не найден')
		}

		// Проверить, что не дублируется
		const existing = await this.uoRepo.findOne({
			where: { userId: data.userId, organizationId },
		})
		if (existing) {
			throw new Error('Пользователь уже является участником этой организации')
		}

		const membership = this.uoRepo.create({
			userId: data.userId,
			organizationId,
			role: data.role,
			isActive: true,
		})
		return this.uoRepo.save(membership)
	}

	async updateMemberRole(organizationId: string, userId: string, role: OrganizationRole): Promise<UserOrganization | null> {
		const membership = await this.uoRepo.findOne({
			where: { userId, organizationId },
		})
		if (!membership) return null

		membership.role = role
		return this.uoRepo.save(membership)
	}

	async removeMember(organizationId: string, userId: string): Promise<boolean> {
		const result = await this.uoRepo.delete({ userId, organizationId })
		return (result.affected || 0) > 0
	}

	// === Настройки организации ===

	/**
	 * Получить настройки организации
	 */
	async getSettings(organizationId: string): Promise<OrganizationSettings> {
		const org = await this.findById(organizationId)
		return org?.settings || {}
	}

	/**
	 * Проверить, включена ли интеграция Bitrix24 для организации
	 */
	async isBitrixEnabled(organizationId: string): Promise<boolean> {
		const settings = await this.getSettings(organizationId)
		return settings.bitrixEnabled === true && !!settings.bitrixWebhookUrl
	}

	/**
	 * Получить маппинг полей Bitrix24 для организации
	 * Возвращает захардкоженный маппинг по умолчанию, если не настроен
	 */
	async getBitrixFieldMapping(organizationId: string): Promise<Record<string, string>> {
		const settings = await this.getSettings(organizationId)
		return settings.bitrixFieldMapping || {}
	}

	/**
	 * Получить статусы Bitrix24 для организации
	 */
	async getBitrixStatuses(organizationId: string): Promise<Record<string, string>> {
		const settings = await this.getSettings(organizationId)
		return settings.bitrixStatuses || { new: 'C1:NEW', won: 'C1:WON', lost: 'C1:LOSE' }
	}
}

// Синглтон
let organizationService: OrganizationService | null = null

export const getOrganizationService = (): OrganizationService => {
	if (!organizationService) {
		organizationService = new OrganizationService()
	}
	return organizationService
}
