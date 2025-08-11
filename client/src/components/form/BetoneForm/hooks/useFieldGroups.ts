import { useState, useMemo, useCallback } from 'react'
import { FormField as FormFieldType } from '../../../../types'
import { groupFieldsByDividers } from '../utils/sectionHelpers'

interface FieldGroup {
	id: string
	title: string
	fields: FormFieldType[]
	divider?: FormFieldType
}

/**
 * Хук для управления группами полей разделенными по divider полям
 */
export const useFieldGroups = (fields: FormFieldType[]) => {
	// Состояние развернутых групп - по умолчанию все свернуты
	const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())

	// Группируем поля по разделителям
	const fieldGroups = useMemo<FieldGroup[]>(() => {
		const sections = groupFieldsByDividers(fields)
		return sections.map(section => ({
			id: section.id || `section-${Math.random()}`,
			title: section.title,
			fields: section.fields,
			divider: section.divider,
		}))
	}, [fields])

	// Проверяем есть ли разделители
	const hasDividers = useMemo(() => {
		return fields.some(field => field.type === 'divider')
	}, [fields])

	// Проверяем развернута ли группа
	const isGroupExpanded = useCallback(
		(groupId: string) => {
			return expandedGroups.has(groupId)
		},
		[expandedGroups]
	)

	// Переключаем состояние группы
	const toggleGroup = useCallback((groupId: string) => {
		setExpandedGroups(prev => {
			const newExpanded = new Set(prev)
			if (newExpanded.has(groupId)) {
				newExpanded.delete(groupId)
			} else {
				newExpanded.add(groupId)
			}
			return newExpanded
		})
	}, [])

	// Разворачиваем все группы
	const expandAllGroups = useCallback(() => {
		const allGroupIds = new Set(fieldGroups.map(group => group.id))
		setExpandedGroups(allGroupIds)
	}, [fieldGroups])

	// Сворачиваем все группы
	const collapseAllGroups = useCallback(() => {
		setExpandedGroups(new Set())
	}, [])

	// Подсчет статистики
	const groupsStats = useMemo(() => {
		const totalGroups = fieldGroups.length
		const expandedCount = expandedGroups.size
		const collapsedCount = totalGroups - expandedCount
		const totalFields = fieldGroups.reduce(
			(sum, group) => sum + group.fields.length,
			0
		)

		return {
			totalGroups,
			expandedCount,
			collapsedCount,
			totalFields,
			allExpanded: expandedCount === totalGroups,
			allCollapsed: expandedCount === 0,
		}
	}, [fieldGroups, expandedGroups])

	// Автоматически раскрываем группы без разделителей
	useMemo(() => {
		if (!hasDividers && fieldGroups.length > 0) {
			// Если нет разделителей, автоматически раскрываем все группы
			const allGroupIds = new Set(fieldGroups.map(group => group.id))
			setExpandedGroups(allGroupIds)
		}
	}, [hasDividers, fieldGroups])

	return {
		// Основные данные
		fieldGroups,
		hasDividers,

		// Управление состоянием
		expandedGroups,
		isGroupExpanded,
		toggleGroup,
		expandAllGroups,
		collapseAllGroups,

		// Статистика
		groupsStats,
	}
}
