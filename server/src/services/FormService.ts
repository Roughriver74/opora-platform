import { BaseService } from './base/BaseService'
import { Form } from '../database/entities/Form.entity'
import { FormField } from '../database/entities/FormField.entity'
import { FormRepository } from '../database/repositories/FormRepository'
import { getFormRepository } from '../database/repositories'

export interface CreateFormDTO {
	name: string
	title: string
	description?: string
	bitrixDealCategory?: string
	successMessage?: string
	fields?: CreateFormFieldDTO[]
}

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
}

export interface UpdateFormDTO {
	title?: string
	description?: string
	isActive?: boolean
	bitrixDealCategory?: string
	successMessage?: string
	fields?: CreateFormFieldDTO[]
}

export class FormService extends BaseService<Form, FormRepository> {
	constructor() {
		super(getFormRepository())
	}

	async createForm(data: CreateFormDTO): Promise<Form> {
		// Валидация уникальности имени
		const nameExists = await this.repository.findByName(data.name)
		if (nameExists) {
			this.throwDuplicateError('Название формы', data.name)
		}

		// Подготовка данных формы
		const formData = {
			name: data.name,
			title: data.title,
			description: data.description,
			bitrixDealCategory: data.bitrixDealCategory,
			successMessage:
				data.successMessage || 'Спасибо! Ваша заявка успешно отправлена.',
			isActive: true,
		}

		// Создание формы с полями
		return this.repository.createWithFields(formData, data.fields || [])
	}

	async updateForm(id: string, data: UpdateFormDTO): Promise<Form | null> {
		const form = await this.repository.findById(id)
		if (!form) {
			this.throwNotFound('Форма', id)
		}

		// Обновление формы с полями
		const { fields, ...formData } = data
		return this.repository.updateWithFields(
			id,
			formData as Partial<Form>,
			fields
		)
	}

	async findByName(name: string): Promise<Form | null> {
		return this.repository.findByName(name)
	}

	async findActive(): Promise<Form[]> {
		return this.repository.findActive()
	}

	async findWithFields(
		formId: string,
		includeInactive = false
	): Promise<Form | null> {
		return this.repository.findWithFields(formId, includeInactive)
	}

	async toggleActive(formId: string): Promise<boolean> {
		const form = await this.repository.findById(formId)
		if (!form) {
			this.throwNotFound('Форма', formId)
		}

		return this.repository.toggleActive(formId)
	}

	async duplicateForm(formId: string, newName: string): Promise<Form | null> {
		// Проверка существования оригинальной формы
		const originalForm = await this.repository.findById(formId)
		if (!originalForm) {
			this.throwNotFound('Форма', formId)
		}

		// Проверка уникальности нового имени
		const nameExists = await this.repository.findByName(newName)
		if (nameExists) {
			this.throwDuplicateError('Название формы', newName)
		}

		return this.repository.duplicateForm(formId, newName)
	}

	async getFormStatistics(formId: string): Promise<any> {
		const form = await this.repository.findById(formId)
		if (!form) {
			this.throwNotFound('Форма', formId)
		}

		return this.repository.getFormStatistics(formId)
	}

	async getFieldsGroupedBySections(
		formId: string
	): Promise<Record<string, FormField[]>> {
		const form = await this.repository.findById(formId)
		if (!form) {
			this.throwNotFound('Форма', formId)
		}

		return this.repository.getFieldsGroupedBySections(formId)
	}

	async updateFieldOrder(
		formId: string,
		fieldOrders: Array<{ fieldId: string; order: number }>
	): Promise<Form | null> {
		const form = await this.repository.findWithFields(formId)
		if (!form) {
			this.throwNotFound('Форма', formId)
		}

		// Обновление порядка полей
		const updatedFields = form.fields.map(field => {
			const orderInfo = fieldOrders.find(o => o.fieldId === field.id)
			if (orderInfo) {
				return { ...field, order: orderInfo.order }
			}
			return field
		})

		return this.repository.updateWithFields(formId, {}, updatedFields)
	}

	async validateFormData(
		formId: string,
		formData: Record<string, any>
	): Promise<{
		isValid: boolean
		errors: Record<string, string>
	}> {
		const form = await this.repository.findWithFields(formId)
		if (!form) {
			this.throwNotFound('Форма', formId)
		}

		const errors: Record<string, string> = {}

		// Валидация обязательных полей
		for (const field of form.fields) {
			if (field.required && !formData[field.name]) {
				errors[field.name] = `Поле "${field.label}" обязательно для заполнения`
			}

			// Валидация типов
			if (formData[field.name]) {
				switch (field.type) {
					case 'email':
						if (!this.isValidEmail(formData[field.name])) {
							errors[
								field.name
							] = `Поле "${field.label}" должно содержать корректный email`
						}
						break
					case 'phone':
						if (!this.isValidPhone(formData[field.name])) {
							errors[
								field.name
							] = `Поле "${field.label}" должно содержать корректный телефон`
						}
						break
					case 'number':
						if (isNaN(Number(formData[field.name]))) {
							errors[field.name] = `Поле "${field.label}" должно быть числом`
						}
						break
				}
			}
		}

		return {
			isValid: Object.keys(errors).length === 0,
			errors,
		}
	}

	private isValidEmail(email: string): boolean {
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
		return emailRegex.test(email)
	}

	private isValidPhone(phone: string): boolean {
		const phoneRegex = /^[\d\s\-\+\(\)]+$/
		return phoneRegex.test(phone) && phone.replace(/\D/g, '').length >= 10
	}

	async getFormForBitrixMapping(formId: string): Promise<{
		form: Form
		fieldMapping: Record<string, string>
	} | null> {
		const form = await this.repository.findWithFields(formId)
		if (!form) {
			return null
		}

		// Создание маппинга полей для Bitrix24
		const fieldMapping: Record<string, string> = {}

		for (const field of form.fields) {
			if (field.bitrixFieldId) {
				fieldMapping[field.name] = field.bitrixFieldId
			}
		}

		return { form, fieldMapping }
	}
}

// Синглтон для сервиса
let formService: FormService | null = null

export const getFormService = (): FormService => {
	if (!formService) {
		formService = new FormService()
	}
	return formService
}
