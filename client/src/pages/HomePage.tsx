import React, { useState, useEffect } from 'react'
import {
	Container,
	Typography,
	Box,
	CircularProgress,
	Alert,
	Stack,
	useTheme,
	useMediaQuery,
} from '@mui/material'
import { useSearchParams } from 'react-router-dom'
import BetoneForm from '../components/form/BetoneForm'

// import QuickActions from '../components/home/QuickActions'
import { Form, FormField } from '../types'
import { FormService } from '../services/formService'
import { useAuth } from '../contexts/auth'

const HomePage: React.FC = () => {
	const [searchParams] = useSearchParams()
	const { user, isAuthenticated } = useAuth()
	const theme = useTheme()
	const isMobile = useMediaQuery(theme.breakpoints.down('md'))

	const [form, setForm] = useState<Form | null>(null)
	const [fields, setFields] = useState<FormField[]>([])
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)
	const [editData, setEditData] = useState<any>(null)

	// Проверяем, является ли пользователь администратором
	const isAdminMode = user?.role === 'admin'

	// Функция для обновления полей локально
	const handleFieldUpdate = (fieldId: string, updates: Partial<FormField>) => {
		setFields(prevFields =>
			prevFields.map(field =>
				field.id === fieldId ? { ...field, ...updates } : field
			)
		)
	}

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
					// Очищаем localStorage после загрузки
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

					// Устанавливаем данные как для нового создания (без submissionId)
					setEditData({
						formId: parsedData.formId,
						formData: parsedData.formData,
						preloadedOptions: parsedData.preloadedOptions || {},
						isCopy: true,
						originalTitle: parsedData.originalTitle,
						originalSubmissionNumber: parsedData.originalSubmissionNumber,
						// НЕ указываем submissionId - это новая заявка
					})

					// Очищаем sessionStorage после загрузки
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
		<Container maxWidth='xl' sx={{ mt: 4 }}>
			{loading ? (
				<Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
					<CircularProgress />
				</Box>
			) : error ? (
				<Alert severity='error' sx={{ mb: 4 }}>
					{error}
				</Alert>
			) : (
				<Box
					sx={{
						display: 'flex',
						flexDirection: { xs: 'column', lg: 'row' },
						gap: 3,
					}}
				>
					{/* Левая колонка - Форма заказа */}
					<Box sx={{ flex: isAuthenticated ? 2 : 1 }}>
						<Typography variant='h4' component='h1' gutterBottom>
							Заказ бетона
						</Typography>
						<Typography variant='body1' color='text.secondary' sx={{ mb: 3 }}>
							Заполните форму для создания новой заявки на поставку бетона
						</Typography>

						{form ? (
							<BetoneForm
								form={form}
								fields={fields}
								editData={editData}
								preloadedOptions={editData?.preloadedOptions}
								isAdminMode={isAdminMode}
								onFieldUpdate={handleFieldUpdate}
							/>
						) : (
							<Alert severity='info'>
								В данный момент формы заказа недоступны. Пожалуйста, попробуйте
								позже.
							</Alert>
						)}
					</Box>

					{/* Правая колонка - Мои заявки (только для авторизованных пользователей) */}
					{isAuthenticated && (
						<Box sx={{ flex: 1, minWidth: { lg: '300px' } }}>
							<Stack spacing={3}>
								{/* Быстрые действия - компонент QuickActions временно отключен */}

							
							</Stack>
						</Box>
					)}
				</Box>
			)}
		</Container>
	)
}

export default HomePage
