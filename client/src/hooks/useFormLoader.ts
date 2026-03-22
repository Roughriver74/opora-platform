import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { FormService } from '../services/formService'
import { Form, FormField } from '../types'

interface UseFormLoaderResult {
	form: Form | null
	fields: FormField[]
	loading: boolean
	error: string | null
	editData: any
	setFields: React.Dispatch<React.SetStateAction<FormField[]>>
}

export const useFormLoader = (): UseFormLoaderResult => {
	const [searchParams] = useSearchParams()
	const [form, setForm] = useState<Form | null>(null)
	const [fields, setFields] = useState<FormField[]>([])
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)
	const [editData, setEditData] = useState<any>(null)

	// Проверяем режим редактирования и копирования
	useEffect(() => {
		const editId = searchParams.get('edit')
		const copyId = searchParams.get('copy')

		if (editId) {
			const storedData = localStorage.getItem('editSubmissionData')
			if (storedData) {
				try {
					const parsedData = JSON.parse(storedData)
					setEditData(parsedData)
					localStorage.removeItem('editSubmissionData')
				} catch (err) {
					console.error('Ошибка парсинга данных редактирования:', err)
				}
			}
		} else if (copyId) {
			const storedData = sessionStorage.getItem('copyFormData')
			if (storedData) {
				try {
					const parsedData = JSON.parse(storedData)
					setEditData({
						formId: parsedData.formId,
						formData: parsedData.formData,
						preloadedOptions: parsedData.preloadedOptions || {},
						isCopy: true,
						originalTitle: parsedData.originalTitle,
						originalSubmissionNumber: parsedData.originalSubmissionNumber,
					})
					sessionStorage.removeItem('copyFormData')
				} catch (err) {
					console.error('Ошибка парсинга данных копирования:', err)
				}
			}
		}
	}, [searchParams])

	// Загрузка активной формы
	useEffect(() => {
		const loadForm = async () => {
			try {
				const forms = await FormService.getAllForms()

				// Если есть данные для редактирования, загружаем нужную форму
				if (editData && editData.formId) {
					const editForm = forms.find((f: Form) => f.id === editData.formId)
					if (editForm) {
						setForm(editForm)
						if (editForm.fields && typeof editForm.fields[0] === 'object') {
							setFields(editForm.fields as FormField[])
						}
						return
					}
				}

				// Находим первую активную форму
				const activeForm = forms.find((f: Form) => f.isActive)

				if (activeForm) {
					setForm(activeForm)
					if (activeForm.fields && typeof activeForm.fields[0] === 'object') {
						setFields(activeForm.fields as FormField[])
					}
				} else {
					setError('Нет активных форм')
				}
			} catch (err: any) {
				setError(`Ошибка при загрузке формы: ${err.message}`)
			} finally {
				setLoading(false)
			}
		}

		loadForm()
	}, [editData])

	return { form, fields, loading, error, editData, setFields }
}
