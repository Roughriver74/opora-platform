import { FormField } from '../../../../types'

/**
 * Специальный обработчик для копирования значений автозаполнения
 */

export interface AutocompleteValue {
	value: string
	label: string
	id?: string
	isBitrixId?: boolean // Флаг для Bitrix ID, чтобы предотвратить поиск в Elastic
}

/**
 * Извлекает информацию об опции из поля автозаполнения
 */
export const extractAutocompleteOption = (
	field: FormField,
	value: any,
	currentOptions: AutocompleteValue[] = []
): AutocompleteValue | null => {
	if (!value) return null

	// Если value уже объект с label
	if (typeof value === 'object' && value.label && value.value) {
		return {
			value: value.value,
			label: value.label,
			id: value.id || value.value,
		}
	}

	// Ищем в текущих опциях поля
	const foundOption = currentOptions.find(
		opt => opt.value === value || opt.id === value
	)

	if (foundOption) {
		return foundOption
	}

	// Если это Битрикс поле, попробуем найти по типу
	if (field.bitrixFieldId) {
		return handleBitrixAutocomplete(field, value)
	}

	// Если не нашли, создаем опцию с value как label
	return {
		value: String(value),
		label: String(value),
		id: String(value),
	}
}

/**
 * Обрабатывает автозаполнение для полей Битрикс24
 */
const handleBitrixAutocomplete = (
	field: FormField,
	value: any
): AutocompleteValue | null => {
	if (!field.bitrixFieldId || !value) return null

	// Проверяем, является ли значение числовым ID (Bitrix ID)
	const isNumericId = /^\d+$/.test(String(value))

	// Для разных типов Битрикс полей
	switch (field.bitrixFieldId) {
		case 'COMPANY_ID':
			return {
				value: String(value),
				label: isNumericId ? `Компания #${value}` : String(value),
				id: String(value),
				// Добавляем флаг, что это Bitrix ID для предотвращения поиска
				isBitrixId: isNumericId,
			}

		case 'CONTACT_ID':
			return {
				value: String(value),
				label: isNumericId ? `Контакт #${value}` : String(value),
				id: String(value),
				isBitrixId: isNumericId,
			}

		case 'UF_CRM_PRODUCT':
			return {
				value: String(value),
				label: isNumericId ? `Продукт #${value}` : String(value),
				id: String(value),
				isBitrixId: isNumericId,
			}

		default:
			return {
				value: String(value),
				label: String(value),
				id: String(value),
				isBitrixId: isNumericId,
			}
	}
}

/**
 * Копирует значение автозаполнения с сохранением опции
 */
export const copyAutocompleteValue = async (
	sourceField: FormField,
	targetField: FormField,
	sourceValue: any,
	sourceOptions: AutocompleteValue[] = [],
	targetOptions: AutocompleteValue[] = []
): Promise<{
	value: any
	needsOptionsUpdate: boolean
	newOption?: AutocompleteValue
}> => {
	// Извлекаем опцию из исходного поля
	const sourceOption = extractAutocompleteOption(
		sourceField,
		sourceValue,
		sourceOptions
	)

	if (!sourceOption) {
		return { value: null, needsOptionsUpdate: false }
	}

	// Проверяем, есть ли такая опция в целевом поле
	const existingOption = targetOptions.find(
		opt =>
			opt.value === sourceOption.value ||
			opt.id === sourceOption.id ||
			opt.label === sourceOption.label
	)

	if (existingOption) {
		// Опция уже есть, просто используем её value
		return {
			value: existingOption.value,
			needsOptionsUpdate: false,
		}
	}

	// Если оба поля связаны с Битрикс24 и имеют одинаковый тип
	if (sourceField.bitrixFieldId && targetField.bitrixFieldId) {
		if (sourceField.bitrixFieldId === targetField.bitrixFieldId) {
			// Одинаковые типы - можем копировать напрямую
			return {
				value: sourceOption.value,
				needsOptionsUpdate: true,
				newOption: sourceOption,
			}
		}

		// Разные типы Битрикс полей - нужна конвертация
		const convertedOption = await convertBitrixAutocomplete(
			sourceField.bitrixFieldId,
			targetField.bitrixFieldId,
			sourceOption
		)

		if (convertedOption) {
			return {
				value: convertedOption.value,
				needsOptionsUpdate: true,
				newOption: convertedOption,
			}
		}
	}

	// В остальных случаях добавляем новую опцию в целевое поле
	return {
		value: sourceOption.value,
		needsOptionsUpdate: true,
		newOption: {
			value: sourceOption.value,
			label: sourceOption.label,
			id: sourceOption.id || sourceOption.value,
			isBitrixId: sourceOption.isBitrixId, // Сохраняем флаг Bitrix ID
		},
	}
}

/**
 * Конвертирует значение между разными типами Битрикс полей
 */
const convertBitrixAutocomplete = async (
	sourceType: string,
	targetType: string,
	sourceOption: AutocompleteValue
): Promise<AutocompleteValue | null> => {
	// Примеры конвертации между типами Битрикс полей
	const conversions: Record<
		string,
		Record<string, (option: AutocompleteValue) => AutocompleteValue>
	> = {
		COMPANY_ID: {
			CONTACT_ID: option => ({
				value: option.value,
				label: `Контакт из компании ${option.label}`,
				id: option.id,
			}),
		},
		CONTACT_ID: {
			COMPANY_ID: option => ({
				value: option.value,
				label: `Компания контакта ${option.label}`,
				id: option.id,
			}),
		},
		// Можно добавить больше конвертаций
	}

	const converter = conversions[sourceType]?.[targetType]
	if (converter) {
		return converter(sourceOption)
	}

	// Если прямой конвертации нет, возвращаем как есть
	return sourceOption
}

/**
 * Проверяет, совместимы ли два поля автозаполнения для копирования
 */
export const areAutocompleteFieldsCompatible = (
	sourceField: FormField,
	targetField: FormField
): boolean => {
	// Оба должны быть автозаполнением
	if (
		sourceField.type !== 'autocomplete' ||
		targetField.type !== 'autocomplete'
	) {
		return false
	}

	// Если оба связаны с Битрикс24
	if (sourceField.bitrixFieldId && targetField.bitrixFieldId) {
		// Одинаковые типы всегда совместимы
		if (sourceField.bitrixFieldId === targetField.bitrixFieldId) {
			return true
		}

		// Проверяем, есть ли конвертация между типами
		const compatibleTypes = [
			['COMPANY_ID', 'CONTACT_ID'],
			['UF_CRM_PRODUCT', 'UF_CRM_PRODUCT_VARIANT'],
		]

		return compatibleTypes.some(
			([type1, type2]) =>
				(sourceField.bitrixFieldId === type1 &&
					targetField.bitrixFieldId === type2) ||
				(sourceField.bitrixFieldId === type2 &&
					targetField.bitrixFieldId === type1)
		)
	}

	// Если нет связи с Битрикс24, считаем совместимыми
	return true
}

/**
 * Создает временную опцию для поля автозаполнения
 */
export const createTemporaryOption = (
	value: string,
	label?: string
): AutocompleteValue => {
	const isNumericId = /^\d+$/.test(value)
	return {
		value,
		label: label || value,
		id: value,
		isBitrixId: isNumericId, // Автоматически определяем Bitrix ID
	}
}
