import { FormField } from '../../../../types'

// Логика нумерации
export const SECTION_STEP = 100 // Разделы: 100, 200, 300...
export const FIELD_OFFSET = 1 // Поля внутри разделов: 101, 102, 103...

// Определяет, является ли поле разделом
export const isSection = (field: FormField): boolean => {
	return field.type === 'header'
}

// Определяет, является ли поле разделителем
export const isDivider = (field: FormField): boolean => {
	return field.type === 'divider'
}

// Получает номер раздела из порядка поля
export const getSectionNumber = (order: number): number => {
	return Math.floor(order / SECTION_STEP) * SECTION_STEP
}

// Получает следующий доступный номер раздела
export const getNextSectionOrder = (fields: FormField[]): number => {
	const sections = fields
		.filter(isSection)
		.map(f => f.order || 0)
		.sort((a, b) => a - b)

	if (sections.length === 0) return SECTION_STEP

	const lastSection = sections[sections.length - 1]
	return getSectionNumber(lastSection) + SECTION_STEP
}

// Получает следующий доступный номер поля в разделе
export const getNextFieldOrderInSection = (
	fields: FormField[],
	sectionOrder: number
): number => {
	const fieldsInSection = fields
		.filter(f => !isSection(f) && !isDivider(f))
		.filter(f => getSectionNumber(f.order || 0) === sectionOrder)
		.map(f => f.order || 0)
		.sort((a, b) => a - b)

	if (fieldsInSection.length === 0) {
		return sectionOrder + FIELD_OFFSET
	}

	const lastField = fieldsInSection[fieldsInSection.length - 1]
	return lastField + 1
}

// Определяет к какому разделу принадлежит поле
export const getFieldSection = (
	field: FormField,
	allFields: FormField[]
): FormField | null => {
	if (isSection(field) || isDivider(field)) return null

	const fieldOrder = field.order || 0

	// Получаем все разделы, отсортированные по порядку
	// const sections = allFields.filter(isSection).sort((a, b) => (a.order || 0) - (b.order || 0))

	// Если порядок поля меньше 100, то оно не принадлежит к разделу
	if (fieldOrder < SECTION_STEP) {
		return null
	}

	// Поля с порядком >= 100 принадлежат разделам
	// Используем старую логику: поле принадлежит разделу если его порядок попадает в диапазон раздела
	const sectionOrder = getSectionNumber(fieldOrder)

	// Ищем заголовок раздела с таким порядком
	const targetSection = allFields.find(
		f => isSection(f) && (f.order || 0) === sectionOrder
	)

	return targetSection || null
}

// Получает название раздела для поля
export const getFieldSectionName = (
	field: FormField,
	allFields: FormField[]
): string => {
	// Проверим что у нас есть данные
	if (!field || !allFields || allFields.length === 0) {
		return 'Загрузка...'
	}

	if (isSection(field)) {
		return `РАЗДЕЛ: ${field.label}`
	}

	if (isDivider(field)) {
		return 'РАЗДЕЛИТЕЛЬ'
	}

	// Сначала пробуем найти раздел по sectionId (прямая связь)
	if (field.sectionId) {
		const section = allFields.find(
			f => f._id === field.sectionId && isSection(f)
		)

		if (section) {
			return section.label || 'Без названия'
		}
	}

	// Если sectionId нет или не найден раздел, используем старую логику по порядку
	const section = getFieldSection(field, allFields)

	if (section) {
		return section.label || 'Без названия'
	}

	return 'Без раздела'
}

// Валидирует порядок поля согласно правилам
export const validateFieldOrder = (
	field: FormField,
	newOrder: number,
	allFields: FormField[]
): {
	isValid: boolean
	suggestedOrder?: number
	message?: string
} => {
	if (isSection(field)) {
		// Для разделов: должно быть кратно 100
		if (newOrder % SECTION_STEP !== 0) {
			const suggested = Math.round(newOrder / SECTION_STEP) * SECTION_STEP
			return {
				isValid: false,
				suggestedOrder: suggested,
				message: `Разделы должны иметь порядок кратный ${SECTION_STEP}. Предлагается: ${suggested}`,
			}
		}
	} else if (!isDivider(field)) {
		// Для обычных полей: должно находиться в пределах раздела
		const sectionOrder = getSectionNumber(newOrder)
		const nextSectionOrder = sectionOrder + SECTION_STEP

		if (newOrder >= nextSectionOrder) {
			const suggested = getNextFieldOrderInSection(allFields, sectionOrder)
			return {
				isValid: false,
				suggestedOrder: suggested,
				message: `Поле должно быть в пределах раздела (${sectionOrder + 1}-${
					nextSectionOrder - 1
				}). Предлагается: ${suggested}`,
			}
		}
	}

	return { isValid: true }
}

// Группирует поля по разделам для отображения
export interface FieldGroup {
	section: FormField | null
	fields: FormField[]
	sectionOrder: number
}

export const groupFieldsBySection = (fields: FormField[]): FieldGroup[] => {
	const sections = fields
		.filter(isSection)
		.sort((a, b) => (a.order || 0) - (b.order || 0))
	const regularFields = fields.filter(f => !isSection(f) && !isDivider(f))

	const groups: FieldGroup[] = []

	// Поля без раздела (order < 100)
	const fieldsWithoutSection = regularFields.filter(
		f => (f.order || 0) < SECTION_STEP
	)
	if (fieldsWithoutSection.length > 0) {
		groups.push({
			section: null,
			fields: fieldsWithoutSection.sort(
				(a, b) => (a.order || 0) - (b.order || 0)
			),
			sectionOrder: 0,
		})
	}

	// Поля по разделам
	sections.forEach(section => {
		const sectionOrder = section.order || 0
		const fieldsInSection = regularFields
			.filter(f => getSectionNumber(f.order || 0) === sectionOrder)
			.sort((a, b) => (a.order || 0) - (b.order || 0))

		groups.push({
			section,
			fields: fieldsInSection,
			sectionOrder,
		})
	})

	return groups
}
