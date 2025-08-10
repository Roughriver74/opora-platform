import React, { useState, useEffect, useMemo } from 'react'
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
	Switch,
	Chip,
	FormHelperText,
} from '@mui/material'
import { Close as CloseIcon, Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material'
import { FormField, FormFieldOption, FieldType } from '../../../../types'
import BitrixOptionsLoader from '../../BitrixOptionsLoader'
import { LinkedFieldsSettings } from '../../FormFieldEditor/components/LinkedFieldsSettings'

interface FormFieldModalProps {
	open: boolean
	onClose: () => void
	field?: FormField
	onSave: (field: FormField) => void
	formId: string
	availableBitrixFields?: Record<string, any>
	allFields?: FormField[]
}

export const FormFieldModal: React.FC<FormFieldModalProps> = ({
	open,
	onClose,
	field,
	onSave,
	formId,
	availableBitrixFields = {},
	allFields = [],
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
		placeholder: '',
		dynamicSource: {
			enabled: false,
			source: 'catalog',
		},
		linkedFields: {
			enabled: false,
			mappings: [],
		},
	})

	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [options, setOptions] = useState<FormFieldOption[]>([])
	const [selectedSection, setSelectedSection] = useState<string>('')

	// Загрузка данных поля при открытии модального окна
	useEffect(() => {
		if (field && open) {
			setFormData({
				...field,
				formId: formId,
			})
			setOptions(field.options || [])
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
				placeholder: '',
				dynamicSource: {
					enabled: false,
					source: 'catalog',
				},
				linkedFields: {
					enabled: false,
					mappings: [],
				},
			})
			setOptions([])
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

	// Обработка загруженных опций из Битрикс24
	const handleBitrixOptionsLoaded = (bitrixOptions: FormFieldOption[]) => {
		setOptions(bitrixOptions)
		setFormData(prev => ({ ...prev, options: bitrixOptions }))
	}

	// Добавление новой опции
	const addOption = (newOption: FormFieldOption) => {
		if (newOption.value && newOption.label) {
			const updatedOptions = [...options, newOption]
			setOptions(updatedOptions)
			setFormData(prev => ({ ...prev, options: updatedOptions }))
		}
	}

	// Удаление опции
	const removeOption = (index: number) => {
		const updatedOptions = options.filter((_, i) => i !== index)
		setOptions(updatedOptions)
		setFormData(prev => ({ ...prev, options: updatedOptions }))
	}

	// Получаем доступные разделы из всех полей формы
	const existingSections = useMemo(() => {
		// Добавляем вариант без раздела
		const sections = [
			{
				id: '',
				name: 'Без раздела',
				order: 0,
				sectionNumber: 0, // Секция 000 для полей без раздела
			},
		]

		// Собираем все существующие заголовки с их номерами секций
		const headerFields = allFields.filter(field => field.type === 'header')

		// Получаем существующие номера секций или создаем новые
		headerFields.forEach(header => {
			// Пытаемся определить номер секции из order
			let sectionNumber = Math.floor(header.order / 100)

			// Если номер секции не соответствует формату (100, 200, и т.д.),
			// то назначаем новый
			if (
				sectionNumber < 1 ||
				sectionNumber * 100 !== Math.floor(header.order)
			) {
				// Находим максимальный номер секции среди существующих
				sectionNumber =
					sections.length > 0
						? Math.max(...sections.map(s => s.sectionNumber || 0)) + 1
						: 1
			}

			sections.push({
				id: header._id || '',
				name: header.label,
				order: header.order,
				sectionNumber: sectionNumber,
			})
		})

		// Сортировка разделов по номеру секции
		return sections.sort(
			(a, b) => (a.sectionNumber || 0) - (b.sectionNumber || 0)
		)
	}, [allFields])

	// Обработчик выбора раздела
	const handleSectionChange = (sectionId: string) => {
		setSelectedSection(sectionId)

		if (sectionId) {
			// Находим раздел
			const section = existingSections.find(s => s.id === sectionId)
			if (section) {
				// Получаем номер секции или используем 0 для полей без раздела
				const sectionNumber = section.sectionNumber || 0

				// Фильтруем поля текущей секции, основываясь на первой цифре порядка
				const fieldsInSection = allFields.filter(field => {
					// Для заголовка и без id пропускаем
					if (field.type === 'header' || !field._id) return false
					// Пропускаем текущее редактируемое поле
					if (formData._id && field._id === formData._id) return false

					// Получаем номер секции из порядка поля
					const fieldSectionNumber = Math.floor(field.order / 100)
					return fieldSectionNumber === sectionNumber
				})

				// Сортируем поля в секции по порядку
				fieldsInSection.sort((a, b) => (a.order || 0) - (b.order || 0))

				// Вычисляем новый порядок в новой трехзначной системе
				let newOrder

				// Базовый порядок для секции - sectionNumber * 100
				const baseSectionOrder = sectionNumber * 100

				if (fieldsInSection.length === 0) {
					// Если в секции нет полей, первое поле получает порядок baseSectionOrder + 1
					newOrder = baseSectionOrder + 1
				} else {
					// Находим максимальное значение порядка в секции
					const maxOrderInSection = Math.max(
						...fieldsInSection.map(f => f.order || 0)
					)

					// Убеждаемся, что не выходим за пределы секции (не превышаем следующие 100)
					const nextValue = maxOrderInSection + 1
					if (Math.floor(nextValue / 100) > sectionNumber) {
						// Если превышаем границу секции, то просто увеличиваем последнюю цифру
						const lastDigit = maxOrderInSection % 10
						newOrder =
							baseSectionOrder + (lastDigit + 1 > 9 ? 9 : lastDigit + 1)
					} else {
						newOrder = nextValue
					}
				}

				// Проверяем, чтобы порядок всегда имел правильную первую цифру (номер секции)
				if (Math.floor(newOrder / 100) !== sectionNumber) {
					newOrder = baseSectionOrder + (newOrder % 100)
				}

				// Если больше 99 полей, ограничиваем до 99
				if (newOrder % 100 > 99) {
					newOrder = baseSectionOrder + 99
				}

					`Установка порядка для поля в разделе ${sectionNumber}: ${newOrder}`
				)
				handleChange('order', newOrder)
			}
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
				options: options,
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
			placeholder: '',
			dynamicSource: {
				enabled: false,
				source: 'catalog',
			},
			linkedFields: {
				enabled: false,
				mappings: [],
			},
		})
		setOptions([])
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
								{/* Элементы оформления */}
								<MenuItem 
									disabled 
									sx={{ 
										fontWeight: 'bold', 
										opacity: 0.7, 
										backgroundColor: '#f5f5f5' 
									}}
								>
									Элементы оформления
								</MenuItem>
								<MenuItem value='header' sx={{ pl: 4 }}>
									Заголовок раздела
								</MenuItem>
								<MenuItem value='divider' sx={{ pl: 4 }}>
									Разделитель
								</MenuItem>

								{/* Поля ввода */}
								<MenuItem 
									disabled 
									sx={{ 
										fontWeight: 'bold', 
										opacity: 0.7, 
										backgroundColor: '#f5f5f5' 
									}}
								>
									Поля ввода
								</MenuItem>
								<MenuItem value='text' sx={{ pl: 4 }}>
									Текстовое поле
								</MenuItem>
								<MenuItem value='number' sx={{ pl: 4 }}>
									Числовое поле
								</MenuItem>
								<MenuItem value='textarea' sx={{ pl: 4 }}>
									Многострочное поле
								</MenuItem>
								<MenuItem value='date' sx={{ pl: 4 }}>
									Дата/время
								</MenuItem>

								{/* Выбор значений */}
								<MenuItem 
									disabled 
									sx={{ 
										fontWeight: 'bold', 
										opacity: 0.7, 
										backgroundColor: '#f5f5f5' 
									}}
								>
									Выбор значений
								</MenuItem>
								<MenuItem value='select' sx={{ pl: 4 }}>
									Выпадающий список
								</MenuItem>
								<MenuItem value='autocomplete' sx={{ pl: 4 }}>
									Автозаполнение
								</MenuItem>
								<MenuItem value='checkbox' sx={{ pl: 4 }}>
									Флажок
								</MenuItem>
								<MenuItem value='radio' sx={{ pl: 4 }}>
									Переключатель
								</MenuItem>
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

					{/* Выбор раздела (не для заголовков) */}
					{formData.type !== 'header' && (
						<FormControl fullWidth sx={{ mt: 2 }}>
							<InputLabel>Раздел</InputLabel>
							<Select
								value={selectedSection}
								onChange={e => handleSectionChange(e.target.value)}
								label='Раздел'
							>
								<MenuItem value=''>
									<em>Не выбрано</em>
								</MenuItem>
								{existingSections.map(section => (
									<MenuItem key={section.id || 'no-section'} value={section.id}>
										{section.name} (раздел: {section.sectionNumber}00)
									</MenuItem>
								))}
							</Select>
							<FormHelperText>
								Выберите раздел, чтобы автоматически установить порядок поля
							</FormHelperText>
						</FormControl>
					)}

					{/* Поле для placeholder (подсказки) */}
					{formData.type !== 'header' && formData.type !== 'divider' && (
						<TextField
							fullWidth
							label='Подсказка (placeholder)'
							value={formData.placeholder || ''}
							onChange={e => handleChange('placeholder', e.target.value)}
							helperText='Текст-подсказка, отображаемый в пустом поле'
							sx={{ mb: 2 }}
						/>
					)}

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

					{/* Настройки динамического источника данных */}
					{(formData.type === 'select' || formData.type === 'autocomplete') && (
						<>
							<Divider sx={{ my: 2 }} />
							<Typography variant='subtitle1' gutterBottom>
								Динамический источник данных
							</Typography>
							
							<FormControlLabel
								control={
									<Switch
										checked={formData.dynamicSource?.enabled || false}
										onChange={e => handleChange('dynamicSource', {
											...formData.dynamicSource,
											enabled: e.target.checked
										})}
									/>
								}
								label='Использовать динамические данные из Битрикс24'
								sx={{ mb: 1 }}
							/>

							{formData.dynamicSource?.enabled && (
								<FormControl fullWidth sx={{ mb: 2 }}>
									<InputLabel>Источник данных</InputLabel>
									<Select
										value={formData.dynamicSource?.source || 'catalog'}
										onChange={e => handleChange('dynamicSource', {
											...formData.dynamicSource,
											source: e.target.value
										})}
										label='Источник данных'
									>
										<MenuItem value='catalog'>Каталог товаров</MenuItem>
										<MenuItem value='companies'>Компании</MenuItem>
										<MenuItem value='contacts'>Контакты</MenuItem>
									</Select>
									<FormHelperText>
										Данные будут загружаться из Битрикс24 при вводе
									</FormHelperText>
								</FormControl>
							)}
						</>
					)}

					{/* Опции для select и radio полей */}
					{(formData.type === 'select' || formData.type === 'radio') && !formData.dynamicSource?.enabled && (
						<Box>
							<Divider sx={{ my: 2 }} />
							<Typography variant='subtitle1' gutterBottom>
								Опции для выбора
							</Typography>
							
							{/* Битрикс опции */}
							{formData.bitrixFieldId && (
								<BitrixOptionsLoader 
									onOptionsLoaded={handleBitrixOptionsLoaded} 
								/>
							)}
							
							{/* Список текущих опций */}
							{options.length > 0 && (
								<Box sx={{ mt: 2 }}>
									<Typography variant='body2' color='text.secondary' sx={{ mb: 1 }}>
										Текущие опции ({options.length}):
									</Typography>
									<Stack spacing={1}>
										{options.map((option, index) => (
											<Box
												key={index}
												sx={{
													display: 'flex',
													alignItems: 'center',
													gap: 1,
													p: 1,
													border: 1,
													borderColor: 'divider',
													borderRadius: 1,
													bgcolor: 'grey.50',
												}}
											>
												<Box sx={{ flex: 1 }}>
													<Typography variant='body2' fontWeight='medium'>
														{option.label}
													</Typography>
													<Typography variant='caption' color='text.secondary'>
														Значение: {option.value}
													</Typography>
												</Box>
												<IconButton
													size='small'
													color='error'
													onClick={() => removeOption(index)}
												>
													<DeleteIcon fontSize='small' />
												</IconButton>
											</Box>
										))}
									</Stack>
								</Box>
							)}
							
							{!formData.bitrixFieldId && options.length === 0 && (
								<Alert severity='info' sx={{ mt: 1 }}>
									Выберите поле Битрикс24 или используйте динамический источник данных для автоматической загрузки опций
								</Alert>
							)}
						</Box>
					)}

					{/* Настройки связанных полей */}
					{formData.type !== 'header' && formData.type !== 'divider' && (
						<>
							<Divider sx={{ my: 2 }} />
							<LinkedFieldsSettings
								formField={formData as FormField}
								availableFields={allFields}
								onChange={(updatedField) => {
									setFormData(updatedField)
								}}
							/>
						</>
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
