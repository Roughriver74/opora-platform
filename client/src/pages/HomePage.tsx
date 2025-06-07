import React, { useState, useEffect } from 'react'
import {
	Container,
	Typography,
	Box,
	CircularProgress,
	Alert,
} from '@mui/material'
import BetonForm from '../components/form/BetoneForm'
import { Form, FormField } from '../types'
import { FormService } from '../services/formService'

const HomePage: React.FC = () => {
	const [form, setForm] = useState<Form | null>(null)
	const [fields, setFields] = useState<FormField[]>([])
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)

	// Загрузка активной формы
	useEffect(() => {
		const loadForm = async () => {
			try {
				const forms = await FormService.getAllForms()

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
	}, [])

	return (
		<Container maxWidth='md' sx={{ mt: 4 }}>
			<Box sx={{ textAlign: 'center', mb: 4 }}>
				<Typography variant='h3' component='h1' gutterBottom>
					Заказ бетона
				</Typography>
			</Box>

			{loading ? (
				<Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
					<CircularProgress />
				</Box>
			) : error ? (
				<Alert severity='error' sx={{ mb: 4 }}>
					{error}
				</Alert>
			) : form ? (
				<BetonForm form={form} fields={fields} />
			) : (
				<Alert severity='info'>
					В данный момент формы заказа недоступны. Пожалуйста, попробуйте позже.
				</Alert>
			)}
		</Container>
	)
}

export default HomePage
