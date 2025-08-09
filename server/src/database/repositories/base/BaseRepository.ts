import {
	Repository,
	FindManyOptions,
	FindOneOptions,
	DeepPartial,
	ObjectLiteral,
	SelectQueryBuilder,
	FindOptionsWhere,
} from 'typeorm'
import { BaseEntity } from '../../entities/base/BaseEntity'
import { AppDataSource } from '../../config/database.config'
import { createClient } from 'redis'

export interface PaginationOptions {
	page?: number
	limit?: number
	sortBy?: string
	sortOrder?: 'ASC' | 'DESC'
}

export interface PaginatedResult<T> {
	data: T[]
	total: number
	page: number
	limit: number
	totalPages: number
	hasNext: boolean
	hasPrev: boolean
}

export interface FilterOptions {
	[key: string]: any
}

export abstract class BaseRepository<T extends BaseEntity> {
	protected repository: Repository<T>
	protected redisClient: ReturnType<typeof createClient> | null = null
	protected cachePrefix: string
	protected cacheTTL: number = 3600 // 1 час по умолчанию

	constructor(
		private EntityClass: new () => T,
		cachePrefix?: string
	) {
		this.repository = AppDataSource.getRepository(EntityClass)
		this.cachePrefix = cachePrefix || EntityClass.name.toLowerCase()
		this.initRedis()
	}

	private async initRedis() {
		try {
			this.redisClient = createClient({
				url: process.env.REDIS_URL || `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`,
			})
			await this.redisClient.connect()
		} catch (error) {
			console.error('Ошибка подключения к Redis:', error)
			this.redisClient = null
		}
	}

	async findById(id: string, options?: FindOneOptions<T>): Promise<T | null> {
		const cacheKey = `${this.cachePrefix}:${id}`
		
		// Попытка получить из кеша
		if (this.redisClient) {
			try {
				const cached = await this.redisClient.get(cacheKey)
				if (cached) {
					return JSON.parse(cached)
				}
			} catch (error) {
				console.error('Ошибка чтения из кеша:', error)
			}
		}

		const entity = await this.repository.findOne({
			where: { id } as any,
			...options,
		})

		// Сохранение в кеш
		if (entity && this.redisClient) {
			try {
				await this.redisClient.setEx(
					cacheKey,
					this.cacheTTL,
					JSON.stringify(entity)
				)
			} catch (error) {
				console.error('Ошибка записи в кеш:', error)
			}
		}

		return entity
	}

	async findAll(options?: FindManyOptions<T>): Promise<T[]> {
		return this.repository.find(options)
	}

	async findByIds(ids: string[]): Promise<T[]> {
		if (ids.length === 0) return []
		
		const queryBuilder = this.repository.createQueryBuilder('entity')
		return queryBuilder
			.where('entity.id IN (:...ids)', { ids })
			.getMany()
	}

	async findOne(options: FindOneOptions<T>): Promise<T | null> {
		return this.repository.findOne(options)
	}

	async findWithPagination(
		options: PaginationOptions & FindManyOptions<T>
	): Promise<PaginatedResult<T>> {
		const page = Math.max(1, options.page || 1)
		const limit = Math.min(100, Math.max(1, options.limit || 20))
		const skip = (page - 1) * limit

		const { sortBy, sortOrder, ...findOptions } = options

		const queryOptions: FindManyOptions<T> = {
			...findOptions,
			skip,
			take: limit,
		}

		if (sortBy) {
			queryOptions.order = {
				[sortBy]: sortOrder || 'ASC',
			} as any
		}

		const [data, total] = await this.repository.findAndCount(queryOptions)

		const totalPages = Math.ceil(total / limit)

		return {
			data,
			total,
			page,
			limit,
			totalPages,
			hasNext: page < totalPages,
			hasPrev: page > 1,
		}
	}

	async create(data: DeepPartial<T>): Promise<T> {
		const entity = this.repository.create(data)
		const saved = await this.repository.save(entity)
		await this.invalidateCache(saved.id)
		return saved
	}

	async update(id: string, data: DeepPartial<T>): Promise<T | null> {
		const entity = await this.findById(id)
		if (!entity) return null

		const updated = this.repository.merge(entity, data)
		const saved = await this.repository.save(updated)
		await this.invalidateCache(id)
		return saved
	}

	async delete(id: string): Promise<boolean> {
		const result = await this.repository.delete(id)
		await this.invalidateCache(id)
		return result.affected ? result.affected > 0 : false
	}

	async softDelete(id: string): Promise<boolean> {
		const result = await this.repository.softDelete(id)
		await this.invalidateCache(id)
		return result.affected ? result.affected > 0 : false
	}

	async restore(id: string): Promise<boolean> {
		const result = await this.repository.restore(id)
		await this.invalidateCache(id)
		return result.affected ? result.affected > 0 : false
	}

	async count(options?: FindManyOptions<T>): Promise<number> {
		return this.repository.count(options)
	}

	async exists(options: FindManyOptions<T>): Promise<boolean> {
		const count = await this.count(options)
		return count > 0
	}

	async existsById(id: string): Promise<boolean> {
		return this.exists({ where: { id } as any })
	}

	async bulkCreate(data: DeepPartial<T>[]): Promise<T[]> {
		const entities = this.repository.create(data)
		const saved = await this.repository.save(entities)
		
		// Инвалидация кеша для всех созданных сущностей
		for (const entity of saved) {
			await this.invalidateCache(entity.id)
		}
		
		return saved
	}

	async bulkUpdate(
		criteria: FindOptionsWhere<T>,
		data: DeepPartial<T>
	): Promise<number> {
		const result = await this.repository.update(criteria, data as any)
		await this.invalidateCachePattern(`${this.cachePrefix}:*`)
		return result.affected || 0
	}

	async bulkDelete(ids: string[]): Promise<number> {
		if (ids.length === 0) return 0
		
		const result = await this.repository.delete(ids)
		
		// Инвалидация кеша для всех удаленных сущностей
		for (const id of ids) {
			await this.invalidateCache(id)
		}
		
		return result.affected || 0
	}

	createQueryBuilder(alias?: string): SelectQueryBuilder<T> {
		return this.repository.createQueryBuilder(alias || 'entity')
	}

	async executeRawQuery(query: string, parameters?: any[]): Promise<any> {
		return this.repository.query(query, parameters)
	}

	protected async invalidateCache(id: string): Promise<void> {
		if (!this.redisClient) return

		try {
			await this.redisClient.del(`${this.cachePrefix}:${id}`)
		} catch (error) {
			console.error('Ошибка инвалидации кеша:', error)
		}
	}

	protected async invalidateCachePattern(pattern: string): Promise<void> {
		if (!this.redisClient) return

		try {
			const keys = await this.redisClient.keys(pattern)
			if (keys.length > 0) {
				await this.redisClient.del(keys)
			}
		} catch (error) {
			console.error('Ошибка инвалидации кеша по паттерну:', error)
		}
	}

	protected async cacheGet<R>(key: string): Promise<R | null> {
		if (!this.redisClient) return null

		try {
			const cached = await this.redisClient.get(key)
			return cached ? JSON.parse(cached) : null
		} catch (error) {
			console.error('Ошибка чтения из кеша:', error)
			return null
		}
	}

	protected async cacheSet<R>(
		key: string,
		value: R,
		ttl: number = this.cacheTTL
	): Promise<void> {
		if (!this.redisClient) return

		try {
			await this.redisClient.setEx(key, ttl, JSON.stringify(value))
		} catch (error) {
			console.error('Ошибка записи в кеш:', error)
		}
	}

	async disconnect(): Promise<void> {
		if (this.redisClient) {
			await this.redisClient.quit()
		}
	}
}