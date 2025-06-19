import { FormField } from '../../../../types'

/**
 * Утилиты для управления порядком полей и разделов
 *
 * Система порядка:
 * - Разделы: 100, 200, 300, 400, ...
 * - Поля внутри разделов: 101, 102, 103, ... (для раздела 100)
 *                         201, 202, 203, ... (для раздела 200)
 */

export const ORDER_CONSTANTS = {
	SECTION_STEP: 100, // Шаг между разделами
	FIELD_START_OFFSET: 1, // Начальное смещение для полей в разделе
	FIELD_STEP: 1, // Шаг между полями в разделе
} as const

/**
 * Получить порядок для нового раздела
 */
export function getNextSectionOrder(existingFields: FormField[]): number {
	const sectionOrders = existingFields
		.filter(field => field.type === 'header')
		.map(field => field.order || 0)
		.filter(order => order % ORDER_CONSTANTS.SECTION_STEP === 0)

	if (sectionOrders.length === 0) {
		return ORDER_CONSTANTS.SECTION_STEP // Первый раздел: 100
	}

	const maxSection = Math.max(...sectionOrders)
	return maxSection + ORDER_CONSTANTS.SECTION_STEP
}

/**
 * Получить порядок для нового поля в конкретном разделе
 */
export function getNextFieldOrderInSection(
	existingFields: FormField[],
	sectionOrder: number
): number {
	const sectionFields = existingFields.filter(
		field =>
			field.type !== 'header' &&
			field.order > sectionOrder &&
			field.order < sectionOrder + ORDER_CONSTANTS.SECTION_STEP
	)

	if (sectionFields.length === 0) {
		return sectionOrder + ORDER_CONSTANTS.FIELD_START_OFFSET // Первое поле: 101, 201, etc.
	}

	const maxFieldOrder = Math.max(...sectionFields.map(f => f.order || 0))
	return maxFieldOrder + ORDER_CONSTANTS.FIELD_STEP
}

/**
 * Получить порядок для нового поля (в последнем разделе или создать новый)
 */
export function getNextFieldOrder(existingFields: FormField[]): number {
	const sections = existingFields
		.filter(field => field.type === 'header')
		.sort((a, b) => (a.order || 0) - (b.order || 0))

	if (sections.length === 0) {
		// Нет разделов - создаем первый раздел и поле в нём
		return ORDER_CONSTANTS.SECTION_STEP + ORDER_CONSTANTS.FIELD_START_OFFSET // 101
	}

	// Добавляем в последний раздел
	const lastSection = sections[sections.length - 1]
	return getNextFieldOrderInSection(existingFields, lastSection.order || 0)
}

/**
 * Определить к какому разделу принадлежит поле
 */
export function getFieldSection(fieldOrder: number): number {
	return (
		Math.floor(fieldOrder / ORDER_CONSTANTS.SECTION_STEP) *
		ORDER_CONSTANTS.SECTION_STEP
	)
}

/**
 * Проверить является ли поле разделом
 */
export function isSection(field: FormField): boolean {
	return (
		field.type === 'header' &&
		(field.order || 0) % ORDER_CONSTANTS.SECTION_STEP === 0
	)
}

/**
 * Получить все поля раздела
 */
export function getSectionFields(
	fields: FormField[],
	sectionOrder: number
): FormField[] {
	return fields
		.filter(
			field =>
				field.type !== 'header' &&
				field.order > sectionOrder &&
				field.order < sectionOrder + ORDER_CONSTANTS.SECTION_STEP
		)
		.sort((a, b) => (a.order || 0) - (b.order || 0))
}

/**
 * Получить все разделы
 */
export function getSections(fields: FormField[]): FormField[] {
	return fields
		.filter(field => isSection(field))
		.sort((a, b) => (a.order || 0) - (b.order || 0))
}

/**
 * Переупорядочить все поля согласно стандарту
 */
export function normalizeFieldOrders(fields: FormField[]): FormField[] {
	const sections = getSections(fields)
	const normalizedFields: FormField[] = []

	sections.forEach((section, sectionIndex) => {
		// Устанавливаем правильный order для раздела
		const normalizedSection = {
			...section,
			order: (sectionIndex + 1) * ORDER_CONSTANTS.SECTION_STEP,
		}
		normalizedFields.push(normalizedSection)

		// Получаем поля этого раздела
		const sectionFields = getSectionFields(fields, section.order || 0)

		// Переупорядочиваем поля внутри раздела
		sectionFields.forEach((field, fieldIndex) => {
			const normalizedField = {
				...field,
				order:
					normalizedSection.order +
					ORDER_CONSTANTS.FIELD_START_OFFSET +
					fieldIndex,
			}
			normalizedFields.push(normalizedField)
		})
	})

	// Добавляем поля без раздела (если есть)
	const orphanFields = fields.filter(
		field =>
			field.type !== 'header' &&
			!sections.some(
				section =>
					field.order > (section.order || 0) &&
					field.order < (section.order || 0) + ORDER_CONSTANTS.SECTION_STEP
			)
	)

	if (orphanFields.length > 0) {
		console.warn(
			'⚠️ Найдены поля без раздела:',
			orphanFields.map(f => f.name)
		)
		// Можно добавить логику для размещения их в последнем разделе
	}

	return normalizedFields.sort((a, b) => (a.order || 0) - (b.order || 0))
}

/**
 * Проверить корректность порядка полей
 */
export function validateFieldOrders(fields: FormField[]): {
	isValid: boolean
	issues: string[]
} {
	const issues: string[] = []

	// Проверяем разделы
	const sections = getSections(fields)
	sections.forEach((section, index) => {
		const expectedOrder = (index + 1) * ORDER_CONSTANTS.SECTION_STEP
		if (section.order !== expectedOrder) {
			issues.push(
				`Раздел "${section.label}" имеет order ${section.order}, ожидается ${expectedOrder}`
			)
		}
	})

	// Проверяем поля в разделах
	sections.forEach(section => {
		const sectionFields = getSectionFields(fields, section.order || 0)
		sectionFields.forEach((field, index) => {
			const expectedOrder =
				(section.order || 0) + ORDER_CONSTANTS.FIELD_START_OFFSET + index
			if (field.order !== expectedOrder) {
				issues.push(
					`Поле "${field.label}" в разделе "${section.label}" имеет order ${field.order}, ожидается ${expectedOrder}`
				)
			}
		})
	})

	return {
		isValid: issues.length === 0,
		issues,
	}
}

/**
 * Переместить поле в определенную позицию в разделе
 */
export function moveFieldToPosition(
	fields: FormField[],
	fieldId: string,
	targetSectionOrder: number,
	position: number
): FormField[] {
	const updatedFields = [...fields]
	const fieldIndex = updatedFields.findIndex(f => f._id === fieldId)

	if (fieldIndex === -1) {
		console.error('Поле не найдено:', fieldId)
		return fields
	}

	const field = updatedFields[fieldIndex]
	const newOrder =
		targetSectionOrder + ORDER_CONSTANTS.FIELD_START_OFFSET + position

	// Обновляем order поля
	updatedFields[fieldIndex] = { ...field, order: newOrder }

	// Перенумеровываем другие поля в разделе
	const sectionFields = getSectionFields(updatedFields, targetSectionOrder)
	sectionFields.forEach((sectionField, index) => {
		if (sectionField._id !== fieldId) {
			const fieldIdx = updatedFields.findIndex(f => f._id === sectionField._id)
			if (fieldIdx !== -1) {
				updatedFields[fieldIdx] = {
					...updatedFields[fieldIdx],
					order:
						targetSectionOrder +
						ORDER_CONSTANTS.FIELD_START_OFFSET +
						index +
						(index >= position ? 1 : 0),
				}
			}
		}
	})

	return updatedFields.sort((a, b) => (a.order || 0) - (b.order || 0))
}
