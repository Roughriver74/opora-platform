import { useState, useEffect, useCallback } from 'react'
import { FormFieldService } from '../../../../services/formFieldService'
import { FormService } from '../../../../services/formService'
import { FormField } from '../../../../types'

export const useFormData = (formId: string) => {
	const [form, setForm] = useState<any>(null)
	const [fields, setFields] = useState<FormField[]>([])
	const [isLoading, setIsLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)

	const reloadFormData = useCallback(async () => {
		if (!formId) {
			// Если нет formId, сбрасываем состояние
			setForm(null)
			setFields([])
			return
		}

		setIsLoading(true)
		setError(null)

		try {
			const [formData, fieldsData] = await Promise.all([
				FormService.getFormById(formId),
				FormFieldService.getFormFields(formId, true), // includeInactive = true для админки
			])

			setForm(formData)
			setFields(fieldsData)
		} catch (error: any) {
			setError(error.message || 'Ошибка загрузки данных')
		} finally {
			setIsLoading(false)
		}
	}, [formId])

	const loadFields = useCallback(async () => {
		if (!formId) return

		setIsLoading(true)
		setError(null)

		try {
			const fieldsData = await FormFieldService.getFormFields(formId, true) // includeInactive = true для админки
			setFields(fieldsData)
		} catch (error: any) {
			setError(error.message || 'Ошибка загрузки полей')
		} finally {
			setIsLoading(false)
		}
	}, [formId])

	useEffect(() => {
		// Всегда вызываем reloadFormData, даже если formId пустой
		// чтобы корректно сбросить состояние
		reloadFormData()
	}, [formId, reloadFormData])

	return {
		form,
		fields,
		isLoading,
		error,
		reloadFormData,
		loadFields,
		setForm,
		setFields,
	}
}
