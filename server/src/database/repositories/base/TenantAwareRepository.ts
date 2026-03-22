import {
	FindManyOptions,
	FindOneOptions,
	DeepPartial,
} from 'typeorm'
import { BaseEntity } from '../../entities/base/BaseEntity'
import { BaseRepository, PaginationOptions, PaginatedResult } from './BaseRepository'

/**
 * Репозиторий с автоматической фильтрацией по organization_id.
 * Наследует все методы BaseRepository, добавляя tenant-aware варианты.
 *
 * Все *ForOrg методы автоматически добавляют WHERE organization_id = :orgId.
 */
export abstract class TenantAwareRepository<T extends BaseEntity> extends BaseRepository<T> {
	async findByIdForOrg(organizationId: string, id: string, options?: FindOneOptions<T>): Promise<T | null> {
		return this.repository.findOne({
			where: { id, organizationId } as any,
			...options,
		})
	}

	async findAllForOrg(organizationId: string, options?: FindManyOptions<T>): Promise<T[]> {
		return this.repository.find({
			...options,
			where: {
				...(options?.where || {}),
				organizationId,
			} as any,
		})
	}

	async findOneForOrg(organizationId: string, options: FindOneOptions<T>): Promise<T | null> {
		return this.repository.findOne({
			...options,
			where: {
				...(options.where || {}),
				organizationId,
			} as any,
		})
	}

	async findWithPaginationForOrg(
		organizationId: string,
		options: PaginationOptions & FindManyOptions<T>
	): Promise<PaginatedResult<T>> {
		return this.findWithPagination({
			...options,
			where: {
				...(options.where || {}),
				organizationId,
			} as any,
		})
	}

	async createForOrg(organizationId: string, data: DeepPartial<T>): Promise<T> {
		return this.create({
			...data,
			organizationId,
		} as any)
	}

	async updateForOrg(organizationId: string, id: string, data: DeepPartial<T>): Promise<T | null> {
		// Проверяем, что сущность принадлежит организации
		const entity = await this.findByIdForOrg(organizationId, id)
		if (!entity) return null

		const updated = this.repository.merge(entity, data)
		const saved = await this.repository.save(updated)
		await this.invalidateCache(id)
		return saved
	}

	async deleteForOrg(organizationId: string, id: string): Promise<boolean> {
		// Проверяем, что сущность принадлежит организации
		const entity = await this.findByIdForOrg(organizationId, id)
		if (!entity) return false

		const result = await this.repository.delete(id)
		await this.invalidateCache(id)
		return result.affected ? result.affected > 0 : false
	}

	async countForOrg(organizationId: string, options?: FindManyOptions<T>): Promise<number> {
		return this.repository.count({
			...options,
			where: {
				...(options?.where || {}),
				organizationId,
			} as any,
		})
	}

	async existsForOrg(organizationId: string, options: FindManyOptions<T>): Promise<boolean> {
		const count = await this.countForOrg(organizationId, options)
		return count > 0
	}
}
