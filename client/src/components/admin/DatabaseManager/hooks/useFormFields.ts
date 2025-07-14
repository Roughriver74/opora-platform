import { useState, useEffect } from 'react'
import { FormFieldService } from '../../../../services/formFieldService'
import { FormField } from '../../../../types'

export const useFormFields = (formId: string) => {
	const [fields, setFields] = useState<FormField[]>([])
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)

	const loadFields = async () => {
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
	}

	const updateField = async (id: string, updates: Partial<FormField>) => {
		try {
			const updatedField = await FormFieldService.updateField(id, updates)
			setFields(prev =>
				prev.map(field =>
					field._id === id ? { ...field, ...updatedField } : field
				)
			)
		} catch (error: any) {
			setError(error.message || 'Ошибка обновления поля')
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
	}, [formId])

	return {
		fields,
		loading,
		error,
		loadFields,
		updateField,
		deleteField,
	}
}
