import React, { useState, useEffect, useCallback } from 'react'
import {
	Dialog,
	DialogTitle,
	DialogContent,
	DialogActions,
	Button,
	TextField,
	FormControl,
	InputLabel,
	Select,
	MenuItem,
	FormControlLabel,
	Checkbox,
	Box,
	Typography,
	IconButton,
	Alert,
	Grid,
	Divider,
	Autocomplete,
	Chip,
} from '@mui/material'
import { Close as CloseIcon } from '@mui/icons-material'
import { FormField } from '../../../../types'
import { FormFieldService } from '../../../../services/formFieldService'

interface FormFieldModalProps {
	open: boolean
	onClose: () => void
	field?: FormField
	onSave: (field: FormField) => void
	formId: string
}

export const FormFieldModal: React.FC<FormFieldModalProps> = ({
	open,
	onClose,
	field,
	onSave,
	formId,
}) => {
	const [formData, setFormData] = useState<Partial<FormField>>({
		name: '',
		label: '',
		type: 'text',
		required: false,
		order: 0,
		options: [],
		formId: formId,
	})

	const [bitrixFields, setBitrixFields] = useState<any[]>([])
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)

	// Загрузка данных поля при открытии модального окна
	useEffect(() => {
		if (field && open) {
			setFormData({
				...field,
				formId: formId,
			})
		} else if (open) {
			setFormData({
				name: '',
				label: '',
				type: 'text',
				required: false,
				order: 0,
				options: [],
				formId: formId,
			})
		}
	}, [field, open, formId])

	// Обработка изменений в форме
	const handleChange = (name: string, value: any) => {
		setFormData(prev => ({
			...prev,
			[name]: value,
		}))
	}

	// Сохранение поля
	const handleSave = async () => {
		if (!formData.name || !formData.label) {
			setError('Заполните все обязательные поля')
			return
		}

		setLoading(true)
		setError(null)

		try {
			const fieldToSave = {
				...formData,
				formId: formId,
			} as FormField

			onSave(fieldToSave)
			onClose()
		} catch (error: any) {
			setError(error.message || 'Ошибка при сохранении поля')
		} finally {
			setLoading(false)
		}
	}

	// Закрытие модального окна
	const handleClose = () => {
		setFormData({
			name: '',
			label: '',
			type: 'text',
			required: false,
			order: 0,
			options: [],
			formId: formId,
		})
		setError(null)
		onClose()
	}

	return (
		<Dialog open={open} onClose={handleClose} maxWidth='md' fullWidth>
			<DialogTitle>
				<Box display='flex' justifyContent='space-between' alignItems='center'>
					<Typography variant='h6'>
						{field ? 'Редактировать поле' : 'Создать новое поле'}
					</Typography>
					<IconButton onClick={handleClose} size='small'>
						<CloseIcon />
					</IconButton>
				</Box>
			</DialogTitle>

			<DialogContent>
				{error && (
					<Alert severity='error' sx={{ mb: 2 }}>
						{error}
					</Alert>
				)}

				<Grid container spacing={2}>
					<Grid item xs={12} sm={6}>
						<TextField
							fullWidth
							label='Название поля'
							value={formData.name || ''}
							onChange={e => handleChange('name', e.target.value)}
							required
							margin='normal'
						/>
					</Grid>

					<Grid item xs={12} sm={6}>
						<TextField
							fullWidth
							label='Подпись поля'
							value={formData.label || ''}
							onChange={e => handleChange('label', e.target.value)}
							required
							margin='normal'
						/>
					</Grid>

					<Grid item xs={12} sm={6}>
						<FormControl fullWidth margin='normal'>
							<InputLabel>Тип поля</InputLabel>
							<Select
								value={formData.type || 'text'}
								onChange={e => handleChange('type', e.target.value)}
								label='Тип поля'
							>
								<MenuItem value='text'>Текст</MenuItem>
								<MenuItem value='number'>Число</MenuItem>
								<MenuItem value='select'>Выбор</MenuItem>
								<MenuItem value='checkbox'>Флажок</MenuItem>
								<MenuItem value='textarea'>Текстовая область</MenuItem>
								<MenuItem value='date'>Дата</MenuItem>
								<MenuItem value='autocomplete'>Автозаполнение</MenuItem>
								<MenuItem value='divider'>Разделитель</MenuItem>
								<MenuItem value='header'>Заголовок</MenuItem>
							</Select>
						</FormControl>
					</Grid>

					<Grid item xs={12} sm={6}>
						<TextField
							fullWidth
							label='Порядок'
							type='number'
							value={formData.order || 0}
							onChange={e => handleChange('order', parseInt(e.target.value))}
							margin='normal'
						/>
					</Grid>

					<Grid item xs={12}>
						<FormControlLabel
							control={
								<Checkbox
									checked={formData.required || false}
									onChange={e => handleChange('required', e.target.checked)}
								/>
							}
							label='Обязательное поле'
						/>
					</Grid>

					{/* Опции для select и radio полей */}
					{(formData.type === 'select' || formData.type === 'radio') && (
						<Grid item xs={12}>
							<Typography variant='subtitle1' gutterBottom>
								Опции
							</Typography>
							{/* Здесь можно добавить управление опциями */}
						</Grid>
					)}
				</Grid>
			</DialogContent>

			<DialogActions>
				<Button onClick={handleClose} color='secondary'>
					Отменить
				</Button>
				<Button
					onClick={handleSave}
					color='primary'
					variant='contained'
					disabled={loading}
				>
					{loading ? 'Сохранение...' : 'Сохранить'}
				</Button>
			</DialogActions>
		</Dialog>
	)
}
