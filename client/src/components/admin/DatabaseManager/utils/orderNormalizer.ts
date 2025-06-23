import { FormField } from '../../../../types'
import {
	isSection,
	isDivider,
	SECTION_STEP,
	FIELD_OFFSET,
} from './sectionUtils'

export interface NormalizationResult {
	updates: Array<{
		id: string
		field: FormField
		oldOrder: number
		newOrder: number
	}>
	summary: {
		sectionsFixed: number
		fieldsFixed: number
		totalChanges: number
	}
}

export const calculateNormalizedOrder = (
	fields: FormField[]
): NormalizationResult => {
	const updates: NormalizationResult['updates'] = []

	// Сортируем поля по текущему порядку
	const sortedFields = [...fields].sort(
		(a, b) => (a.order || 0) - (b.order || 0)
	)

	// Разделяем поля по типам
	const sections = sortedFields.filter(isSection)
	const dividers = sortedFields.filter(isDivider)
	const regularFields = sortedFields.filter(f => !isSection(f) && !isDivider(f))

	let sectionsFixed = 0
	let fieldsFixed = 0

	// 1. Нормализуем разделы (100, 200, 300...)
	sections.forEach((section, index) => {
		const correctOrder = (index + 1) * SECTION_STEP
		const currentOrder = section.order || 0

		if (currentOrder !== correctOrder && section._id) {
			updates.push({
				id: section._id,
				field: section,
				oldOrder: currentOrder,
				newOrder: correctOrder,
			})
			sectionsFixed++
		}
	})

	// 2. Нормализуем обычные поля по разделам
	// Группируем поля по их "предполагаемому" разделу на основе порядка
	const fieldsBySection = new Map<number, FormField[]>()

	regularFields.forEach(field => {
		const fieldOrder = field.order || 0
		let targetSection = 0 // По умолчанию "без раздела"

		// Находим подходящий раздел для поля
		for (let i = 0; i < sections.length; i++) {
			const sectionOrder = (i + 1) * SECTION_STEP
			const nextSectionOrder = (i + 2) * SECTION_STEP

			if (fieldOrder >= sectionOrder && fieldOrder < nextSectionOrder) {
				targetSection = sectionOrder
				break
			}
		}

		if (!fieldsBySection.has(targetSection)) {
			fieldsBySection.set(targetSection, [])
		}
		fieldsBySection.get(targetSection)!.push(field)
	})

	// 3. Назначаем правильные номера полям в каждом разделе
	fieldsBySection.forEach((fields, sectionOrder) => {
		fields.forEach((field, index) => {
			let correctOrder: number

			if (sectionOrder === 0) {
				// Поля без раздела: 1, 2, 3...
				correctOrder = index + 1
			} else {
				// Поля в разделе: sectionOrder + 1, sectionOrder + 2...
				correctOrder = sectionOrder + FIELD_OFFSET + index
			}

			const currentOrder = field.order || 0

			if (currentOrder !== correctOrder && field._id) {
				updates.push({
					id: field._id,
					field: field,
					oldOrder: currentOrder,
					newOrder: correctOrder,
				})
				fieldsFixed++
			}
		})
	})

	return {
		updates,
		summary: {
			sectionsFixed,
			fieldsFixed,
			totalChanges: updates.length,
		},
	}
}

export const generateNormalizationReport = (
	result: NormalizationResult
): string => {
	const { updates, summary } = result

	if (summary.totalChanges === 0) {
		return '✅ Порядок полей уже соответствует правилам. Изменения не требуются.'
	}

	let report = `📊 План нормализации порядка полей:\n\n`

	report += `📈 Статистика:\n`
	report += `- Разделов исправлено: ${summary.sectionsFixed}\n`
	report += `- Полей исправлено: ${summary.fieldsFixed}\n`
	report += `- Всего изменений: ${summary.totalChanges}\n\n`

	if (updates.length > 0) {
		report += `🔄 Планируемые изменения:\n`
		updates.forEach(update => {
			const typeLabel = isSection(update.field)
				? '📁 РАЗДЕЛ'
				: isDivider(update.field)
				? '➖ РАЗДЕЛИТЕЛЬ'
				: '📄 ПОЛЕ'
			report += `${typeLabel}: "${update.field.label || update.field.name}" `
			report += `${update.oldOrder} → ${update.newOrder}\n`
		})
	}

	return report
}
