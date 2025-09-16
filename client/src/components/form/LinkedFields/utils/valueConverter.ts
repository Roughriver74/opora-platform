import { FieldType, FormField } from '../../../../types'
import {
	copyAutocompleteValue,
	areAutocompleteFieldsCompatible,
	AutocompleteValue,
	createTemporaryOption,
} from './autocompleteHandler'

/**
 * Конвертирует значение из одного типа поля в другой
 */
export const convertFieldValue = (
	value: any,
	sourceType: FieldType,
	targetType: FieldType
): any => {
	// Если значение пустое, возвращаем его как есть
	if (value === null || value === undefined || value === '') {
		return value
	}

	// Если типы одинаковые, возвращаем значение как есть
	if (sourceType === targetType) {
		return value
	}

	try {
		return convertValue(value, sourceType, targetType)
	} catch (error) {
		console.warn(
			`Ошибка конвертации значения ${value} из ${sourceType} в ${targetType}:`,
			error
		)
		return value // Возвращаем исходное значение в случае ошибки
	}
}

/**
 * Улучшенная конвертация с поддержкой полей формы и автозаполнения
 */
export const convertFieldValueAdvanced = async (
	value: any,
	sourceField: FormField,
	targetField: FormField,
	sourceOptions: AutocompleteValue[] = [],
	targetOptions: AutocompleteValue[] = []
): Promise<{
	value: any
	needsOptionsUpdate?: boolean
	newOption?: AutocompleteValue
}> => {
	// Если значение пустое, возвращаем его как есть
	if (value === null || value === undefined || value === '') {
		return { value }
	}

	// Специальная обработка для автозаполнения
	if (targetField.type === 'autocomplete') {
		if (sourceField.type === 'autocomplete') {
			// Автозаполнение -> Автозаполнение
			if (areAutocompleteFieldsCompatible(sourceField, targetField)) {
				const result = await copyAutocompleteValue(
					sourceField,
					targetField,
					value,
					sourceOptions,
					targetOptions
				)
				return result
			}
		} else {
			// Другое поле -> Автозаполнение
			// Создаем временную опцию с текстовым значением
			const textValue = convertFieldValue(value, sourceField.type, 'text')
			return {
				value: String(textValue),
				needsOptionsUpdate: true,
				newOption: createTemporaryOption(String(textValue)),
			}
		}
	}

	// Для остальных случаев используем обычную конвертацию
	const convertedValue = convertFieldValue(
		value,
		sourceField.type,
		targetField.type
	)
	return { value: convertedValue }
}

/**
 * Основная логика конвертации значений
 */
const convertValue = (
	value: any,
	sourceType: FieldType,
	targetType: FieldType
): any => {
	// Конвертация в текстовые поля
	if (targetType === 'text' || targetType === 'textarea') {
		return convertToText(value, sourceType)
	}

	// Конвертация в числовые поля
	if (targetType === 'number') {
		return convertToNumber(value, sourceType)
	}

	// Конвертация в поля выбора
	if (
		targetType === 'select' ||
		targetType === 'autocomplete' ||
		targetType === 'radio'
	) {
		return convertToSelection(value, sourceType)
	}

	// Конвертация в дату
	if (targetType === 'date') {
		return convertToDate(value, sourceType)
	}

	// Конвертация в checkbox
	if (targetType === 'checkbox') {
		return convertToBoolean(value, sourceType)
	}

	return value
}

/**
 * Конвертация в текстовый формат
 */
const convertToText = (value: any, sourceType: FieldType): string => {
	if (typeof value === 'string') {
		return value
	}

	if (Array.isArray(value)) {
		return value.join(', ')
	}

	if (typeof value === 'boolean') {
		return value ? 'Да' : 'Нет'
	}

	if (sourceType === 'date') {
		return formatDate(value)
	}

	return String(value)
}

/**
 * Конвертация в числовой формат
 */
const convertToNumber = (
	value: any,
	sourceType: FieldType
): number | string => {
	if (typeof value === 'number') {
		return value
	}

	if (typeof value === 'string') {
		// Извлекаем числа из строки
		const match = value.match(/[\d.,]+/)
		if (match) {
			const numStr = match[0].replace(',', '.')
			const num = parseFloat(numStr)
			if (!isNaN(num)) {
				return num
			}
		}
	}

	return value // Возвращаем как есть, если не удалось конвертировать
}

/**
 * Конвертация в поля выбора
 */
const convertToSelection = (value: any, sourceType: FieldType): string => {
	if (Array.isArray(value)) {
		return value[0] || ''
	}

	if (typeof value === 'boolean') {
		return value ? 'yes' : 'no'
	}

	// Для автозаполнения возвращаем значение как есть
	// Компонент сам найдет соответствующий label в options
	return String(value)
}

/**
 * Конвертация в дату
 */
const convertToDate = (value: any, sourceType: FieldType): string => {
	if (typeof value === 'string') {
		// Пытаемся распарсить различные форматы даты
		const date = parseDate(value)
		if (date) {
			return formatDateForInput(date)
		}
	}

	if (value instanceof Date) {
		return formatDateForInput(value)
	}

	return value
}

/**
 * Конвертация в boolean
 */
const convertToBoolean = (value: any, sourceType: FieldType): boolean => {
	if (typeof value === 'boolean') {
		return value
	}

	if (typeof value === 'string') {
		const lowerValue = value.toLowerCase().trim()
		return ['да', 'yes', 'true', '1', 'включено', 'активно'].includes(
			lowerValue
		)
	}

	if (typeof value === 'number') {
		return value !== 0
	}

	return Boolean(value)
}

/**
 * Форматирует дату для отображения
 */
const formatDate = (value: any): string => {
	try {
		const date = new Date(value)
		if (isNaN(date.getTime())) {
			return String(value)
		}
		return date.toLocaleDateString('ru-RU')
	} catch {
		return String(value)
	}
}

/**
 * Форматирует дату для input[type="date"]
 */
const formatDateForInput = (date: Date): string => {
	return date.toISOString().split('T')[0]
}

/**
 * Парсит дату из строки
 */
const parseDate = (dateStr: string): Date | null => {
	// Попытка парсинга различных форматов
	const patterns = [
		/(\d{1,2})\.(\d{1,2})\.(\d{4})/, // dd.mm.yyyy
		/(\d{4})-(\d{1,2})-(\d{1,2})/, // yyyy-mm-dd
		/(\d{1,2})\/(\d{1,2})\/(\d{4})/, // dd/mm/yyyy
	]

	for (const pattern of patterns) {
		const match = dateStr.match(pattern)
		if (match) {
			let day, month, year

			if (pattern.source.includes('\\.')) {
				// dd.mm.yyyy format
				;[, day, month, year] = match
			} else if (pattern.source.includes('-')) {
				// yyyy-mm-dd format
				;[, year, month, day] = match
			} else {
				// dd/mm/yyyy format
				;[, day, month, year] = match
			}

			const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
			if (!isNaN(date.getTime())) {
				return date
			}
		}
	}

	// Попытка стандартного парсинга
	const date = new Date(dateStr)
	return isNaN(date.getTime()) ? null : date
}

/**
 * Проверяет, можно ли конвертировать значение из одного типа в другой
 */
export const canConvertValue = (
	value: any,
	sourceType: FieldType,
	targetType: FieldType
): boolean => {
	if (value === null || value === undefined || value === '') {
		return true
	}

	if (sourceType === targetType) {
		return true
	}

	try {
		const converted = convertValue(value, sourceType, targetType)
		return converted !== undefined
	} catch {
		return false
	}
}
