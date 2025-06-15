import { FormField as FormFieldType } from '../../../../types'
import { FormSection, SectionMap } from '../types'
import { FORM_CONSTANTS } from '../constants'

/**
 * Группирует поля по секциям на основе заголовков (header полей)
 * @param fields - массив полей формы
 * @returns массив секций с полями
 */
export const groupFieldsBySection = (
	fields: FormFieldType[]
): FormSection[] => {
	// Сортируем поля по порядку
	const sortedFields = [...fields].sort(
		(a, b) => (a.order || 0) - (b.order || 0)
	)

	const sections: FormSection[] = []
	// Инициализируем currentSection как определенный тип FormSection с пустыми полями
	let currentSection: FormSection = {
		title: FORM_CONSTANTS.DEFAULT_SECTION_TITLE,
		fields: [],
	}

	// Флаг для отслеживания, содержит ли секция поля
	let hasSectionFields = false

	// Проходим по всем полям и группируем их по секциям
	sortedFields.forEach(field => {
		if (field.type === 'header') {
			// Если встречаем заголовок, создаем новую секцию
			if (currentSection.fields.length > 0) {
				// Сохраняем предыдущую секцию, если в ней есть поля
				sections.push(currentSection)
				hasSectionFields = false
			}

			// Создаем новую секцию с ID заголовка
			currentSection = {
				id: field._id, // Сохраняем ID заголовка для возможности редактирования
				title: field.label || 'Без названия',
				fields: [],
			}
		} else {
			// Добавляем поле в текущую секцию
			currentSection.fields.push(field)
			hasSectionFields = true
		}
	})

	// Добавляем последнюю секцию, если она содержит поля
	if (currentSection.fields.length > 0) {
		sections.push(currentSection)
	}

	// Если секций нет, создаем одну дефолтную со всеми полями
	if (sections.length === 0) {
		const nonHeaderFields = sortedFields.filter(
			field => field.type !== 'header'
		)
		if (nonHeaderFields.length > 0) {
			sections.push({
				title: FORM_CONSTANTS.DEFAULT_FORM_TITLE,
				fields: nonHeaderFields,
			})
		}
	}

	return sections
}

/**
 * Определяет, нужно ли использовать секционный режим
 * @param fields - массив полей формы
 * @returns true, если нужен секционный режим
 */
export const shouldUseSectionMode = (fields: FormFieldType[]): boolean => {
	// Проверяем наличие заголовков (header полей)
	const hasHeaders = fields.some(field => field.type === 'header')

	// Если есть заголовки, то нужен секционный режим
	if (hasHeaders) {
		return true
	}

	// Если заголовков нет, проверяем количество полей
	return fields.length > FORM_CONSTANTS.SECTION_THRESHOLD
}

/**
 * Получает отсортированные поля по порядку
 * @param fields - массив полей формы
 * @returns отсортированный массив полей
 */
export const getSortedFields = (fields: FormFieldType[]): FormFieldType[] => {
	return [...fields].sort((a, b) => (a.order || 0) - (b.order || 0))
}
