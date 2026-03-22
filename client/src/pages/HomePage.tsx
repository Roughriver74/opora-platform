import React from 'react'
import {
	Container,
	Typography,
	Box,
	CircularProgress,
	Alert,
} from '@mui/material'
import BetoneForm from '../components/form/BetoneForm'
import { FormField } from '../types'
import { useAuth } from '../contexts/auth'
import { useFormLoader } from '../hooks/useFormLoader'

const HomePage: React.FC = () => {
	const { user } = useAuth()
	const { form, fields, loading, error, editData, setFields } = useFormLoader()

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
			) : (
				<Box
					sx={{
						display: 'flex',
						flexDirection: 'column',
						alignItems: 'center',
					}}
				>
					{/* Форма заказа */}
					<Box sx={{ width: '100%', maxWidth: '800px' }}>
						<Typography variant='h4' component='h1' gutterBottom>
							Новая заявка
						</Typography>
						<Typography variant='body1' color='text.secondary' sx={{ mb: 3 }}>
							Заполните форму для создания новой заявки
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
				</Box>
			)}
		</Container>
	)
}

export default HomePage

