import { useState, useEffect, useCallback } from 'react'
import { FormFieldService } from '../../../../services/formFieldService'
import { FormField } from '../../../../types'

export const useSimpleFields = () => {
	const [fields, setFields] = useState<FormField[]>([])
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)

	// Загрузка полей
	const loadFields = useCallback(async () => {
		try {
			setLoading(true)
			setError(null)
			const response = await FormFieldService.getAllFields()
			setFields(response || [])
		} catch (err: any) {
			setError(err.message || 'Ошибка загрузки полей')
			console.error('Ошибка загрузки полей:', err)
		} finally {
			setLoading(false)
		}
	}, [])

	// Обновление поля
	const updateField = useCallback(
		async (fieldId: string, updates: Partial<FormField>) => {
			try {
				setError(null)
				console.log('🔄 Обновляем поле:', fieldId, 'с данными:', updates)

				const result = await FormFieldService.updateField(fieldId, updates)
				console.log('✅ Поле обновлено на сервере:', result)

				// Обновляем локальное состояние
				setFields(prevFields => {
					const newFields = prevFields.map(field =>
						field._id! === fieldId ? { ...field, ...updates } : field
					)
					console.log('📝 Локальное состояние обновлено')
					return newFields
				})

				return true
			} catch (err: any) {
				setError(err.message || 'Ошибка обновления поля')
				console.error('❌ Ошибка обновления поля:', err)
				return false
			}
		},
		[]
	)

	// Получение разделов
	const getSections = useCallback(() => {
		return fields
			.filter(field => field.type === 'header')
			.sort((a, b) => (a.order || 0) - (b.order || 0))
	}, [fields])

	// Получение названия раздела для поля
	const getSectionName = useCallback(
		(field: FormField) => {
			if (field.type === 'header') {
				return `🏷️ РАЗДЕЛ: ${field.label || 'Без названия'}`
			}

			if (field.type === 'divider') {
				return '➖ РАЗДЕЛИТЕЛЬ'
			}

			if (field.sectionId) {
				const section = fields.find(
					f => f._id! === field.sectionId && f.type === 'header'
				)
				if (section) {
					return section.label || 'Без названия'
				}
			}

			return 'Без раздела'
		},
		[fields]
	)

	// Загрузка при монтировании
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
		reload: loadFields,
	}
}
