import { useState, useEffect, useCallback } from 'react'
import { FormFieldService } from '../../../../services/formFieldService'
import { FormField } from '../../../../types'
import { getSections as getFieldSections } from '../../FormEditor/utils/orderUtils'

export const useSimpleFields = (formId?: string) => {
	const [fields, setFields] = useState<FormField[]>([])
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)

	const loadFields = useCallback(async () => {
		if (!formId) return

		setLoading(true)
		setError(null)

		try {
			const fieldsData = await FormFieldService.getFormFields(formId)
			setFields(fieldsData)
		} catch (error: any) {
			setError(error.message || 'Ошибка загрузки полей')
		} finally {
			setLoading(false)
		}
	}, [formId])

	const updateField = async (
		id: string,
		updates: Partial<FormField>
	): Promise<boolean> => {
		try {
			const updatedField = await FormFieldService.updateField(id, updates)
			setFields(prev =>
				prev.map(field =>
					field._id === id ? { ...field, ...updatedField } : field
				)
			)
			return true
		} catch (error: any) {
			setError(error.message || 'Ошибка обновления поля')
			return false
		}
	}

	const deleteField = async (id: string) => {
		try {
			await FormFieldService.deleteFormField(id)
			setFields(prev => prev.filter(field => field._id !== id))
		} catch (error: any) {
			setError(error.message || 'Ошибка удаления поля')
		}
	}

	useEffect(() => {
		if (formId) {
			loadFields()
		}
	}, [formId, loadFields])

	const getSections = useCallback(() => {
		return getFieldSections(fields)
	}, [fields])

	const getSectionName = useCallback(
		(field: FormField) => {
			if (field.type === 'header') {
				return field.label || `Раздел ${field.order}`
			}
			// Для обычных полей находим их секцию
			const sectionOrder = Math.floor((field.order || 0) / 100) * 100
			const section = fields.find(
				f => f.order === sectionOrder && f.type === 'header'
			)
			return section?.label || `Раздел ${sectionOrder}`
		},
		[fields]
	)

	return {
		fields,
		loading,
		error,
		loadFields,
		updateField,
		deleteField,
		getSections,
		getSectionName,
		reload: loadFields,
	}
}
