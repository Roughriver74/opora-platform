import { BaseRepository } from './base/BaseRepository'
import { FormField } from '../entities/FormField.entity'

export class FormFieldRepository extends BaseRepository<FormField> {
	constructor() {
		super(FormField, 'formfield')
		this.cacheTTL = 3600 // 1 час для полей формы
	}

	async findByFormId(formId: string): Promise<FormField[]> {
		const cacheKey = `${this.cachePrefix}:form:${formId}`
		const cached = await this.cacheGet<FormField[]>(cacheKey)
		if (cached) return cached

		const fields = await this.repository.find({
			where: { formId },
			order: { order: 'ASC' }
		})

		await this.cacheSet(cacheKey, fields)
		return fields
	}

	async findByFormAndName(formId: string, name: string): Promise<FormField | null> {
		const cacheKey = `${this.cachePrefix}:form:${formId}:name:${name}`
		const cached = await this.cacheGet<FormField>(cacheKey)
		if (cached) return cached

		const field = await this.repository.findOne({
			where: { formId, name }
		})

		if (field) {
			await this.cacheSet(cacheKey, field)
		}

		return field
	}

	async updateFieldOrder(fieldId: string, order: number): Promise<FormField | null> {
		const field = await this.findById(fieldId)
		if (!field) return null

		field.order = order
		const saved = await this.repository.save(field)
		
		// Инвалидация кэша
		await this.invalidateCache(fieldId)
		await this.invalidateCachePattern(`${this.cachePrefix}:form:${field.formId}*`)
		
		return saved
	}

	async deleteByFormId(formId: string): Promise<void> {
		await this.repository.delete({ formId })
		await this.invalidateCachePattern(`${this.cachePrefix}:form:${formId}*`)
	}

	async getMaxOrder(formId: string): Promise<number> {
		const result = await this.createQueryBuilder('field')
			.where('field.formId = :formId', { formId })
			.select('MAX(field.order)', 'maxOrder')
			.getRawOne()

		return result?.maxOrder || 0
	}

	// Переопределяем метод update, чтобы инвалидировать кеш формы при любом обновлении поля
	async update(id: string, data: any): Promise<FormField | null> {
		const field = await this.findById(id)
		if (!field) return null

		const updated = await super.update(id, data)
		
		// Инвалидируем кеш формы после обновления любого поля
		if (updated && field.formId) {
			await this.invalidateCachePattern(`${this.cachePrefix}:form:${field.formId}*`)
		}
		
		return updated
	}

	async duplicateFields(sourceFormId: string, targetFormId: string): Promise<FormField[]> {
		const sourceFields = await this.findByFormId(sourceFormId)
		
		const duplicatedFields = sourceFields.map(field => {
			const { id, createdAt, updatedAt, ...fieldData } = field
			return this.repository.create({
				...fieldData,
				formId: targetFormId
			})
		})

		const saved = await this.repository.save(duplicatedFields)
		await this.invalidateCachePattern(`${this.cachePrefix}:form:${targetFormId}*`)
		
		return saved
	}
}