import React from 'react'
import {
	TextField,
	FormControlLabel,
	Switch,
	FormControl,
	InputLabel,
	Select,
	MenuItem,
	Stack,
	Alert,
	Typography,
	Box,
} from '@mui/material'
import { Form } from '../../../../types'

interface FormSettingsProps {
	formData: Partial<Form>
	dealCategories: any[]
	onFormChange: (name: string, value: any) => void
}

// Error Boundary для FormSettings
class FormSettingsErrorBoundary extends React.Component<
	{ children: React.ReactNode },
	{ hasError: boolean; error: any }
> {
	constructor(props: { children: React.ReactNode }) {
		super(props)
		this.state = { hasError: false, error: null }
	}

	static getDerivedStateFromError(error: any) {
		return { hasError: true, error }
	}

	componentDidCatch(error: any, errorInfo: any) {
		console.error('FormSettings Error:', error, errorInfo)
	}

	render() {
		if (this.state.hasError) {
			return (
				<Box sx={{ p: 2 }}>
					<Alert severity='error'>
						<Typography variant='h6'>Ошибка в настройках формы</Typography>
						<Typography variant='body2'>
							Произошла ошибка при загрузке настроек формы. Перезагрузите
							страницу.
						</Typography>
						<Typography variant='caption' sx={{ mt: 1, display: 'block' }}>
							{this.state.error?.message || 'Неизвестная ошибка'}
						</Typography>
					</Alert>
				</Box>
			)
		}

		return this.props.children
	}
}

const FormSettingsCore: React.FC<FormSettingsProps> = ({
	formData,
	dealCategories,
	onFormChange,
}) => {
	// Безопасная обработка dealCategories
	const safeDealCategories = React.useMemo(() => {
		if (!dealCategories) {
			return []
		}
		if (!Array.isArray(dealCategories)) {
			return []
		}
		return dealCategories.filter(category => {
			// Фильтруем только валидные категории
			return (
				category &&
				(category.ID || category.id) &&
				(category.NAME || category.name)
			)
		})
	}, [dealCategories])

	return (
		<Stack spacing={2}>
			<Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
				<TextField
					fullWidth
					label='Идентификатор формы'
					value={formData.name || ''}
					onChange={e => onFormChange('name', e.target.value)}
					required
					helperText='Уникальный идентификатор (без пробелов)'
					error={!formData.name}
					size='small'
					margin='dense'
				/>

				<TextField
					fullWidth
					label='Заголовок формы'
					value={formData.title || ''}
					onChange={e => onFormChange('title', e.target.value)}
					required
					error={!formData.title}
					size='small'
					margin='dense'
				/>
			</Stack>

			<TextField
				fullWidth
				label='Описание формы'
				value={formData.description || ''}
				onChange={e => onFormChange('description', e.target.value)}
				multiline
				rows={2}
				size='small'
				margin='dense'
			/>

			<Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
				<FormControl fullWidth size='small' margin='dense'>
					<InputLabel>Категория сделки в Битрикс24</InputLabel>
					<Select
						value={formData.bitrixDealCategory || ''}
						onChange={e => onFormChange('bitrixDealCategory', e.target.value)}
						label='Категория сделки в Битрикс24'
						size='small'
					>
						<MenuItem value=''>По умолчанию</MenuItem>
						{safeDealCategories.map((category, index) => {
							const key = category.ID || category.id || `category-${index}`
							const value = category.ID || category.id || ''
							const label = category.NAME || category.name || 'Без названия'

							return (
								<MenuItem key={key} value={value}>
									{label}
								</MenuItem>
							)
						})}
					</Select>
				</FormControl>

				<FormControlLabel
					control={
						<Switch
							checked={formData.isActive || false}
							onChange={e => onFormChange('isActive', e.target.checked)}
							size='small'
						/>
					}
					label='Форма активна'
					sx={{
						minWidth: 'fit-content',
						'& .MuiFormControlLabel-label': {
							fontSize: '0.875rem',
						},
					}}
				/>
			</Stack>

			<TextField
				fullWidth
				label='Сообщение об успешной отправке'
				value={
					formData.successMessage || 'Спасибо! Ваша заявка успешно отправлена.'
				}
				onChange={e => onFormChange('successMessage', e.target.value)}
				size='small'
				margin='dense'
			/>
		</Stack>
	)
}

// Экспортируем обернутый в Error Boundary компонент
export const FormSettings: React.FC<FormSettingsProps> = props => {
	return (
		<FormSettingsErrorBoundary>
			<FormSettingsCore {...props} />
		</FormSettingsErrorBoundary>
	)
}
