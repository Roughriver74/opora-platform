import { BaseService } from './base/BaseService'
import { FormField } from '../database/entities/FormField.entity'
import { FormFieldRepository } from '../database/repositories/FormFieldRepository'
import { getFormFieldRepository } from '../database/repositories'

export interface CreateFormFieldDTO {
	name: string
	label: string
	type: string
	required?: boolean
	placeholder?: string
	bitrixFieldId?: string
	bitrixFieldType?: string
	bitrixEntity?: string
	sectionId?: string
	options?: Array<{ value: string; label: string }>
	dynamicSource?: {
		enabled: boolean
		source: string
		filter?: Record<string, any>
	}
	linkedFields?: {
		enabled: boolean
		mappings: Array<{
			targetFieldName: string
			copyDirection: 'from' | 'to' | 'both'
			transformFunction?: string
		}>
		sourceField?: {
			sourceFieldName: string
			sourceFieldLabel?: string
			sourceSectionName?: string
		}
	}
	order?: number
	formId: string
}

export interface UpdateFormFieldDTO {
	name?: string
	label?: string
	placeholder?: string
	required?: boolean
	order?: number
	bitrixFieldId?: string
	bitrixFieldType?: string
	bitrixEntity?: string
	sectionId?: string
	formId?: string
	_id?: string
	options?: Array<{ value: string; label: string }>
	dynamicSource?: {
		enabled: boolean
		source: string
		filter?: Record<string, any>
	}
	linkedFields?: {
		enabled: boolean
		mappings: Array<{
			targetFieldName: string
			copyDirection: 'from' | 'to' | 'both'
			transformFunction?: string
		}>
		sourceField?: {
			sourceFieldName: string
			sourceFieldLabel?: string
			sourceSectionName?: string
		}
	}
}

export class FormFieldService extends BaseService<FormField, FormFieldRepository> {
	constructor() {
		super(getFormFieldRepository())
	}

	async createField(data: CreateFormFieldDTO): Promise<FormField> {
		// Валидация уникальности имени в рамках формы
		const existingField = await this.repository.findByFormAndName(data.formId, data.name)
		if (existingField) {
			this.throwDuplicateError('Поле с таким именем', data.name)
		}

		// Создание поля
		return this.repository.create(data)
	}

	async updateField(id: string, data: UpdateFormFieldDTO): Promise<FormField | null> {
		const field = await this.repository.findById(id)
		if (!field) {
			this.throwNotFound('Поле формы', id)
		}

		// Проверяем и очищаем данные перед обновлением
		const cleanData = { ...data }
		
		// Если formId пустая строка, используем formId из существующего поля
		if (cleanData.formId === '') {
			cleanData.formId = field.formId
		}
		
		// Удаляем лишние поля если они есть
		delete cleanData._id

		console.log('FormField update data:', {
			id,
			originalFormId: field.formId,
			newFormId: cleanData.formId,
			fieldName: cleanData.name
		})

		// Обновление поля
		return this.repository.update(id, cleanData)
	}

	async findByFormId(formId: string): Promise<FormField[]> {
		return this.repository.findByFormId(formId)
	}

	async updateFieldsOrder(updates: Array<{ id: string; order: number }>): Promise<{ success: boolean; updatedCount: number }> {
		const updatePromises = updates.map(update => 
			this.repository.update(update.id, { order: update.order })
		)

		const results = await Promise.all(updatePromises)
		const updatedCount = results.filter(result => result !== null).length

		// Получаем formId из первого обновленного поля для инвалидации кеша формы
		if (results.length > 0 && results[0]) {
			const formId = results[0].formId
			// Инвалидируем кеш всей формы, так как порядок полей изменился
			// Используем метод репозитория, который имеет доступ к protected методу
			await (this.repository as any).invalidateCachePattern(`formfield:form:${formId}*`)
		}

		return {
			success: true,
			updatedCount
		}
	}

	async deleteField(id: string): Promise<boolean> {
		const field = await this.repository.findById(id)
		if (!field) {
			this.throwNotFound('Поле формы', id)
		}

		return this.repository.delete(id)
	}

	async duplicateFields(sourceFormId: string, targetFormId: string): Promise<FormField[]> {
		const sourceFields = await this.repository.findByFormId(sourceFormId)
		
		const duplicatePromises = sourceFields.map(field => {
			const { id, createdAt, updatedAt, ...fieldData } = field
			return this.repository.create({
				...fieldData,
				formId: targetFormId
			})
		})

		return Promise.all(duplicatePromises)
	}
}

// Синглтон для сервиса
let formFieldService: FormFieldService | null = null

export const getFormFieldService = (): FormFieldService => {
	if (!formFieldService) {
		formFieldService = new FormFieldService()
	}
	return formFieldService
}