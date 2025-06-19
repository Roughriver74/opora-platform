import { Types } from 'mongoose'

/**
 * Строгие типы для обеспечения консистентности данных
 */

// Базовый тип для ID в MongoDB - всегда строка
export type MongoStringId = string

// Интерфейс для связи между формой и полями
export interface FormFieldRelation {
	formId: MongoStringId
	fieldId: MongoStringId
}

// Типы для валидации связей
export interface RelationValidation {
	isValid: boolean
	formExists: boolean
	fieldExists: boolean
	relationExists: boolean
}

// Утилиты для работы с ID
export class DatabaseIdUtils {
	/**
	 * Приводит MongoDB ObjectId к строке
	 */
	static toString(id: Types.ObjectId | string): MongoStringId {
		return id.toString()
	}

	/**
	 * Проверяет валидность ObjectId
	 */
	static isValidObjectId(id: string): boolean {
		return Types.ObjectId.isValid(id)
	}

	/**
	 * Создает строгую связь между формой и полем
	 */
	static createRelation(
		formId: Types.ObjectId | string,
		fieldId: Types.ObjectId | string
	): FormFieldRelation {
		return {
			formId: this.toString(formId),
			fieldId: this.toString(fieldId),
		}
	}
}

// Константы для валидации
export const DB_VALIDATION_RULES = {
	// Все formId должны быть строками
	FORM_ID_TYPE: 'string' as const,

	// Максимальное количество полей без formId (должно быть 0)
	MAX_ORPHAN_FIELDS: 0,

	// Минимальное количество полей на форму
	MIN_FIELDS_PER_FORM: 1,
} as const
