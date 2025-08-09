import { BaseRepository, PaginatedResult, PaginationOptions } from '../../database/repositories/base/BaseRepository'
import { BaseEntity } from '../../database/entities/base/BaseEntity'
import { DeepPartial } from 'typeorm'

export abstract class BaseService<T extends BaseEntity, R extends BaseRepository<T>> {
	constructor(protected repository: R) {}

	async findById(id: string): Promise<T | null> {
		return this.repository.findById(id)
	}

	async findAll(): Promise<T[]> {
		return this.repository.findAll()
	}

	async findByIds(ids: string[]): Promise<T[]> {
		return this.repository.findByIds(ids)
	}

	async findWithPagination(options: PaginationOptions): Promise<PaginatedResult<T>> {
		return this.repository.findWithPagination(options)
	}

	async create(data: DeepPartial<T>): Promise<T> {
		return this.repository.create(data)
	}

	async update(id: string, data: DeepPartial<T>): Promise<T | null> {
		return this.repository.update(id, data)
	}

	async delete(id: string): Promise<boolean> {
		return this.repository.delete(id)
	}

	async exists(id: string): Promise<boolean> {
		return this.repository.existsById(id)
	}

	async count(): Promise<number> {
		return this.repository.count()
	}

	protected async validateUnique(field: string, value: any, excludeId?: string): Promise<boolean> {
		const options: any = {
			where: { [field]: value }
		}

		const existing = await this.repository.findOne(options)
		
		if (!existing) return true
		if (excludeId && existing.id === excludeId) return true
		
		return false
	}

	protected throwNotFound(entity: string, id: string): never {
		throw new Error(`${entity} с ID ${id} не найден`)
	}

	protected throwValidationError(message: string): never {
		throw new Error(`Ошибка валидации: ${message}`)
	}

	protected throwDuplicateError(field: string, value: string): never {
		throw new Error(`${field} "${value}" уже существует`)
	}
}