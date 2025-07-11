import { useState, useEffect, useCallback } from 'react'
import { FormField } from '../../../../types'
import { FormFieldService } from '../../../../services/formFieldService'

interface UseSimpleFieldsReturn {
	fields: FormField[]
	loading: boolean
	error: string | null
	updateField: (
		fieldId: string,
		updates: Partial<FormField>
	) => Promise<boolean>
	getSections: () => FormField[]
	getSectionName: (field: FormField) => string
	reload: () => Promise<void>
}

export const useSimpleFields = (): UseSimpleFieldsReturn => {
	const [fields, setFields] = useState<FormField[]>([])
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)

	// Загрузка всех полей
	const loadFields = useCallback(async () => {
		try {
			setLoading(true)
			setError(null)

			const response = await FormFieldService.getAllFields()

			// Сортируем поля по порядку
			const sortedFields = response.sort(
				(a: FormField, b: FormField) => (a.order || 0) - (b.order || 0)
			)

			setFields(sortedFields)
		} catch (err: any) {
			console.error('Ошибка загрузки полей:', err)
			setError(err.message || 'Ошибка загрузки полей')
		} finally {
			setLoading(false)
		}
	}, [])

	// Обновление поля
	const updateField = useCallback(
		async (fieldId: string, updates: Partial<FormField>) => {
			try {
				await FormFieldService.updateField(fieldId, updates)

				// Обновляем локальное состояние
				setFields(prevFields =>
					prevFields.map(field =>
						field._id === fieldId ? { ...field, ...updates } : field
					)
				)

				return true
			} catch (err: any) {
				console.error('Ошибка обновления поля:', err)
				setError(err.message || 'Ошибка обновления поля')
				return false
			}
		},
		[]
	)

	// Получение секций (полей типа header)
	const getSections = useCallback(() => {
		return fields.filter(field => field.type === 'header')
	}, [fields])

	// Получение названия секции для поля
	const getSectionName = useCallback(
		(field: FormField) => {
			if (field.type === 'header') {
				return field.label || 'Без названия'
			}

			if (field.type === 'divider') {
				return 'Разделитель'
			}

			if (field.sectionId) {
				const section = fields.find(
					f => f._id === field.sectionId && f.type === 'header'
				)
				return section?.label || 'Неизвестная секция'
			}

			return 'Без секции'
		},
		[fields]
	)

	// Перезагрузка данных
	const reload = useCallback(async () => {
		await loadFields()
	}, [loadFields])

	// Первоначальная загрузка
	useEffect(() => {
		loadFields()
	}, [loadFields])

	return {
		fields,
		loading,
		error,
		updateField,
		getSections,
		getSectionName,
		reload,
	}
}
