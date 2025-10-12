import { BaseRepository } from './base/BaseRepository'
import { Form } from '../entities/Form.entity'
import { FormField } from '../entities/FormField.entity'

export class FormRepository extends BaseRepository<Form> {
	constructor() {
		super(Form, 'form')
		this.cacheTTL = 3600 // 1 час для форм
	}

	async findByName(name: string): Promise<Form | null> {
		const cacheKey = `${this.cachePrefix}:name:${name}`
		const cached = await this.cacheGet<Form>(cacheKey)
		if (cached) return cached

		const form = await this.repository.findOne({
			where: { name },
			relations: ['fields'],
		})

		if (form) {
			await this.cacheSet(cacheKey, form)
		}

		return form
	}

	async findActive(): Promise<Form[]> {
		const cacheKey = `${this.cachePrefix}:active`
		const cached = await this.cacheGet<Form[]>(cacheKey)
		if (cached) return cached

		const forms = await this.repository.find({
			where: { isActive: true },
			relations: ['fields'],
			order: { createdAt: 'DESC' },
		})

		await this.cacheSet(cacheKey, forms)
		return forms
	}

	async findWithFields(
		formId: string,
		includeInactive = false
	): Promise<Form | null> {
		const queryBuilder = this.repository
			.createQueryBuilder('form')
			.leftJoinAndSelect('form.fields', 'field')
			.where('form.id = :formId', { formId })

		// Фильтруем неактивные поля если includeInactive = false
		if (!includeInactive) {
			queryBuilder.andWhere('field.isActive IS NULL OR field.isActive = true')
		}

		return queryBuilder.getOne()
	}

	async createWithFields(
		formData: Partial<Form>,
		fields: Partial<FormField>[]
	): Promise<Form> {
		const form = this.repository.create(formData)

		// Создание полей формы
		if (fields && fields.length > 0) {
			form.fields = fields.map((fieldData, index) => {
				const field = new FormField()
				Object.assign(field, {
					...fieldData,
					order: fieldData.order ?? index,
				})
				return field
			})
		}

		const saved = await this.repository.save(form)
		await this.invalidateCache(saved.id)
		await this.invalidateCachePattern(`${this.cachePrefix}:*`)

		return saved
	}

	async updateWithFields(
		formId: string,
		formData: Partial<Form>,
		fields?: Partial<FormField>[]
	): Promise<Form | null> {
		const form = await this.findWithFields(formId)
		if (!form) return null

		// Обновление данных формы
		Object.assign(form, formData)

		// Обновление полей, если предоставлены
		if (fields !== undefined) {
			// Удаляем старые поля
			form.fields = []

			// Добавляем новые поля
			if (fields.length > 0) {
				form.fields = fields.map((fieldData, index) => {
					const field = new FormField()
					Object.assign(field, {
						...fieldData,
						formId: formId,
						order: fieldData.order ?? index,
					})
					return field
				})
			}
		}

		const saved = await this.repository.save(form)
		await this.invalidateCache(formId)
		await this.invalidateCachePattern(`${this.cachePrefix}:*`)

		return saved
	}

	async toggleActive(formId: string): Promise<boolean> {
		const form = await this.findById(formId)
		if (!form) return false

		form.isActive = !form.isActive
		await this.repository.save(form)
		await this.invalidateCache(formId)
		await this.invalidateCachePattern(`${this.cachePrefix}:active`)

		return true
	}

	async getFormStatistics(formId: string): Promise<{
		totalSubmissions: number
		todaySubmissions: number
		avgDailySubmissions: number
		fieldCount: number
		requiredFieldCount: number
	}> {
		const stats = await this.createQueryBuilder('form')
			.leftJoin('form.submissions', 'submission')
			.leftJoin('form.fields', 'field')
			.where('form.id = :formId', { formId })
			.select('form.id', 'id')
			.addSelect('COUNT(DISTINCT submission.id)', 'totalSubmissions')
			.addSelect(
				'COUNT(DISTINCT CASE WHEN DATE(submission.createdAt) = CURRENT_DATE THEN submission.id END)',
				'todaySubmissions'
			)
			.addSelect('COUNT(DISTINCT field.id)', 'fieldCount')
			.addSelect(
				'COUNT(DISTINCT CASE WHEN field.required = true THEN field.id END)',
				'requiredFieldCount'
			)
			.groupBy('form.id')
			.getRawOne()

		if (!stats) {
			return {
				totalSubmissions: 0,
				todaySubmissions: 0,
				avgDailySubmissions: 0,
				fieldCount: 0,
				requiredFieldCount: 0,
			}
		}

		// Вычисление среднего количества заявок в день
		const form = await this.findById(formId)
		const daysSinceCreation = form ? form.getAge() : 1
		const avgDailySubmissions =
			daysSinceCreation > 0
				? Math.round(
						((parseInt(stats.totalSubmissions) || 0) / daysSinceCreation) * 10
				  ) / 10
				: 0

		return {
			totalSubmissions: parseInt(stats.totalSubmissions) || 0,
			todaySubmissions: parseInt(stats.todaySubmissions) || 0,
			avgDailySubmissions,
			fieldCount: parseInt(stats.fieldCount) || 0,
			requiredFieldCount: parseInt(stats.requiredFieldCount) || 0,
		}
	}

	async duplicateForm(formId: string, newName: string): Promise<Form | null> {
		const originalForm = await this.findWithFields(formId)
		if (!originalForm) return null

		const newForm = this.repository.create({
			name: newName,
			title: `${originalForm.title} (копия)`,
			description: originalForm.description,
			isActive: false, // Новая форма неактивна по умолчанию
			bitrixDealCategory: originalForm.bitrixDealCategory,
			successMessage: originalForm.successMessage,
		})

		// Копирование полей
		if (originalForm.fields && originalForm.fields.length > 0) {
			newForm.fields = originalForm.fields.map(field => {
				const newField = new FormField()
				Object.assign(newField, {
					...field,
					id: undefined, // Удаляем ID для создания нового
					formId: undefined, // Будет установлен при сохранении
					createdAt: undefined,
					updatedAt: undefined,
				})
				return newField
			})
		}

		const saved = await this.repository.save(newForm)
		await this.invalidateCachePattern(`${this.cachePrefix}:*`)

		return saved
	}

	async getFieldsGroupedBySections(
		formId: string
	): Promise<Record<string, FormField[]>> {
		const form = await this.findWithFields(formId)
		if (!form || !form.fields) return {}

		const grouped: Record<string, FormField[]> = {}

		for (const field of form.fields) {
			const sectionId = field.sectionId || 'default'
			if (!grouped[sectionId]) {
				grouped[sectionId] = []
			}
			grouped[sectionId].push(field)
		}

		// Сортировка полей в каждой секции по order
		for (const sectionId in grouped) {
			grouped[sectionId].sort((a, b) => a.order - b.order)
		}

		return grouped
	}
}
