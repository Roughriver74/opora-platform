import { ReactNode } from 'react'

// Типы для полей формы
export interface FormFieldOption {
	value: string
	label: string
}

export interface DynamicSource {
	enabled: boolean
	source: string
	filter?: Record<string, any>
}

// Типы для связанных полей
export interface LinkedFieldMapping {
	[x: string]: ReactNode
	targetFieldName: string
	copyDirection: 'from' | 'to' | 'both'
	transformFunction?: string
}

// Новый улучшенный тип для простой настройки связанных полей
export interface SimpleLinkedField {
	sourceFieldName: string // Поле, из которого копировать
	sourceFieldLabel?: string // Название поля-источника (для отображения)
	sourceSectionName?: string // Секция, из которой копировать (опционально)
}

export interface LinkedFields {
	enabled: boolean
	mappings: LinkedFieldMapping[]
	// Новое: простая настройка - из какого поля копировать значение
	sourceField?: SimpleLinkedField
}

// Типы полей формы
export type FieldType =
	// Элементы оформления формы
	| 'header' // Заголовок раздела
	| 'divider' // Разделитель
	// Поля ввода
	| 'text' // Текстовое поле
	| 'number' // Числовое поле
	| 'textarea' // Многострочное поле
	| 'date' // Поле выбора даты/времени
	// Поля выбора
	| 'select' // Выпадающий список
	| 'autocomplete' // Автозаполнение
	| 'checkbox' // Флажок
	| 'radio' // Переключатель

export interface FormField {
	_id?: string
	id?: string
	name: string
	label: string
	type: FieldType
	required: boolean
	placeholder?: string
	bitrixFieldId: string
	bitrixFieldType: string
	formId?: string
	sectionId?: string // ID раздела к которому принадлежит поле
	options?: FormFieldOption[]
	dynamicSource?: DynamicSource
	linkedFields?: LinkedFields
	order: number
	// Данные для заголовков разделов
	headerData?: {
		label: string
		level?: number
	}
	createdAt?: string
	updatedAt?: string
}

// Типы для форм
export interface Form {
	_id?: string
	id?: string
	name: string
	title: string
	description: string
	isActive: boolean
	fields: FormField[] | string[]
	bitrixDealCategory?: string
	successMessage: string
	createdAt?: string
	updatedAt?: string
}

// Типы для запросов к Битрикс24
export interface BitrixDealField {
	title: string
	type: string
	isRequired: boolean
	isReadOnly: boolean
	isMultiple: boolean
	listLabel?: string
	items?: { ID: string; VALUE: string }[]
}

export interface BitrixDealCategory {
	ID: string
	NAME: string
}

export interface BitrixProduct {
	ID: string
	NAME: string
	PRICE: number
	CURRENCY_ID: string
	DESCRIPTION?: string
}

// Типы для отправки формы
export interface FormSubmission {
	formId: string
	formData: Record<string, any>
}

export interface FormSubmissionResponse {
	success: boolean
	message: string
	dealId?: string
}
