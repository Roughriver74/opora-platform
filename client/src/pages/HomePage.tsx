import React, { useState, useEffect } from 'react'
import {
	Container,
	Typography,
	Box,
	CircularProgress,
	Alert,
} from '@mui/material'
import { useSearchParams } from 'react-router-dom'
import BetoneForm from '../components/form/BetoneForm'
import { Form, FormField } from '../types'
import { FormService } from '../services/formService'

const HomePage: React.FC = () => {
	const [searchParams] = useSearchParams()
	const [form, setForm] = useState<Form | null>(null)
	const [fields, setFields] = useState<FormField[]>([])
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)
	const [editData, setEditData] = useState<any>(null)

	// Проверяем режим редактирования
	useEffect(() => {
		const editId = searchParams.get('edit')
		if (editId) {
			const storedData = localStorage.getItem('editSubmissionData')
			if (storedData) {
				try {
					const parsedData = JSON.parse(storedData)
					setEditData(parsedData)
					// Очищаем localStorage после загрузки
					localStorage.removeItem('editSubmissionData')
				} catch (err) {
					console.error('Ошибка парсинга данных редактирования:', err)
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
					const editForm = forms.find((f: Form) => f._id === editData.formId)
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
					// Если поля загружены полностью
					if (activeForm.fields && typeof activeForm.fields[0] === 'object') {
						setFields(activeForm.fields as FormField[])
					}
				} else {
					setError('Нет активных форм для заказа бетона')
				}
			} catch (err: any) {
				setError(`Ошибка при загрузке формы: ${err.message}`)
			} finally {
				setLoading(false)
			}
		}

		loadForm()
	}, [editData])

	return (
		<Container maxWidth='md' sx={{ mt: 4 }}>
			{loading ? (
				<Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
					<CircularProgress />
				</Box>
			) : error ? (
				<Alert severity='error' sx={{ mb: 4 }}>
					{error}
				</Alert>
			) : form ? (
				<BetoneForm form={form} fields={fields} editData={editData} />
			) : (
				<Alert severity='info'>
					В данный момент формы заказа недоступны. Пожалуйста, попробуйте позже.
				</Alert>
			)}
		</Container>
	)
}

export default HomePage
