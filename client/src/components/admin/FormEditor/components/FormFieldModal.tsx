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
	Stack,
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
	availableBitrixFields?: Record<string, any>
}

export const FormFieldModal: React.FC<FormFieldModalProps> = ({
	open,
	onClose,
	field,
	onSave,
	formId,
	availableBitrixFields = {},
}) => {
	const [formData, setFormData] = useState<Partial<FormField>>({
		name: '',
		label: '',
		type: 'text',
		required: false,
		order: 0,
		options: [],
		formId: formId,
		bitrixFieldId: '',
		bitrixFieldType: '',
	})

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
				bitrixFieldId: '',
				bitrixFieldType: '',
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

	// Обработка выбора поля Битрикс
	const handleBitrixFieldChange = (selectedField: any) => {
		if (selectedField) {
			setFormData(prev => ({
				...prev,
				bitrixFieldId: selectedField.id,
				bitrixFieldType: selectedField.field?.type || '',
				label: selectedField.name, // Автозаполнение названия
			}))
		} else {
			setFormData(prev => ({
				...prev,
				bitrixFieldId: '',
				bitrixFieldType: '',
			}))
		}
	}

	// Преобразование объекта полей Битрикс в массив для Autocomplete
	const bitrixFieldsArray = Object.entries(availableBitrixFields).map(
		([fieldId, field]: [string, any]) => ({
			id: fieldId,
			name: field.name || field.title || fieldId,
			field,
		})
	)

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
			bitrixFieldId: '',
			bitrixFieldType: '',
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

				<Stack spacing={2}>
					<Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
						<TextField
							fullWidth
							label='Название поля'
							value={formData.name || ''}
							onChange={e => handleChange('name', e.target.value)}
							required
						/>

						<TextField
							fullWidth
							label='Подпись поля'
							value={formData.label || ''}
							onChange={e => handleChange('label', e.target.value)}
							required
						/>
					</Stack>

					<Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
						<FormControl fullWidth>
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

						<TextField
							fullWidth
							label='Порядок'
							type='number'
							value={formData.order || 0}
							onChange={e => handleChange('order', parseInt(e.target.value))}
						/>
					</Stack>

					<FormControlLabel
						control={
							<Checkbox
								checked={formData.required || false}
								onChange={e => handleChange('required', e.target.checked)}
							/>
						}
						label='Обязательное поле'
					/>

					{/* Поля Битрикс24 */}
					{Object.keys(availableBitrixFields).length > 0 && (
						<>
							<Divider sx={{ my: 1 }} />
							<Typography variant='subtitle1' gutterBottom>
								Связь с Битрикс24
							</Typography>

							<FormControl fullWidth>
								<Autocomplete
									options={bitrixFieldsArray}
									getOptionLabel={option => option.name}
									value={
										formData.bitrixFieldId
											? bitrixFieldsArray.find(
													item => item.id === formData.bitrixFieldId
											  ) || null
											: null
									}
									onChange={(event, newValue) =>
										handleBitrixFieldChange(newValue)
									}
									renderInput={params => (
										<TextField
											{...params}
											label='Поле Битрикс24'
											placeholder='Начните вводить для поиска...'
										/>
									)}
									renderOption={(props, option) => (
										<li {...props}>
											<Box sx={{ display: 'flex', flexDirection: 'column' }}>
												<Typography variant='body1'>{option.name}</Typography>
												<Typography variant='caption' color='text.secondary'>
													ID: {option.id}
												</Typography>
											</Box>
										</li>
									)}
									filterOptions={(options, state) => {
										const inputValue = state.inputValue.toLowerCase().trim()
										if (!inputValue) return options

										return options.filter(
											option =>
												option.name.toLowerCase().includes(inputValue) ||
												option.id.toLowerCase().includes(inputValue)
										)
									}}
									fullWidth
								/>
							</FormControl>

							{formData.bitrixFieldId && (
								<Alert severity='info' sx={{ mt: 1 }}>
									Выбрано поле: {formData.bitrixFieldId} (
									{formData.bitrixFieldType})
								</Alert>
							)}
						</>
					)}

					{/* Опции для select и radio полей */}
					{(formData.type === 'select' || formData.type === 'radio') && (
						<Box>
							<Typography variant='subtitle1' gutterBottom>
								Опции
							</Typography>
							{/* Здесь можно добавить управление опциями */}
						</Box>
					)}
				</Stack>
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
