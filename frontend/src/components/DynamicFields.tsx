import React from 'react'
import {
	TextField,
	FormControl,
	InputLabel,
	Select,
	MenuItem,
	FormControlLabel,
	Checkbox,
	Grid,
	Typography,
	Box,
	CircularProgress,
	Button,
	useMediaQuery,
	SelectChangeEvent,
	ListItemText,
	FormHelperText,
} from '@mui/material'
import { Theme, alpha } from '@mui/material/styles'
import { useQuery } from '@tanstack/react-query'
import { adminApi, FieldMapping } from '../services/adminApi'
import { CompositeField } from './CompositeField'

interface DynamicFieldsProps {
	entityType: 'visit' | 'clinic' | 'doctor' | 'product'
	formData: any
	onChange: (name: string, value: any) => void
	gridSize?: { xs: number; md: number }
	disabledFields?: Record<string, boolean>
	isVisitCompleted?: boolean
}

export const DynamicFields: React.FC<DynamicFieldsProps> = ({
	entityType,
	formData,
	onChange,
	gridSize = { xs: 12, md: 6 },
	disabledFields = {},
	isVisitCompleted = false,
}) => {
	// Определяем маленький экран для адаптивного дизайна
	console.log('formData=', formData)
	const isSmallScreen = useMediaQuery((theme: Theme) =>
		theme.breakpoints.down('sm')
	)
	// Загрузка полей из API
	const {
		data: fieldMappings,
		isLoading,
	} = useQuery<FieldMapping[]>(
		['fieldMappings', entityType],
		() => adminApi.getPublicFieldMappings(entityType),
		{
			onError: error => {
				console.error('Ошибка загрузки полей:', error)
			},
			retry: 1,
			staleTime: 300000, // 5 минут
		}
	)
	console.log('fieldMappings=', fieldMappings)
	if (isLoading) {
		return (
			<Box display='flex' justifyContent='center' my={2}>
				<CircularProgress size={24} />
			</Box>
		)
	}

	if (!fieldMappings || fieldMappings.length === 0) {
		return null
	}



	// Проверка, является ли поле комментарием
	const isCommentField = (field: FieldMapping) => {
		const commentKeywords = [
			'comment',
			'comments',
			'комментарий',
			'коммент',
			// Bitrix поля комментариев определяются через display_name, не через хардкод ID
		]
		return commentKeywords.some(
			keyword =>
				field.app_field_name.toLowerCase().includes(keyword) ||
				field.display_name.toLowerCase().includes(keyword)
		)
	}

	// Функция для обработки множественных полей (crm_multifield)
	const renderMultiField = (
		field: FieldMapping,
		fieldName: string,
		fieldValue: any
	) => {
		// Проверяем, должно ли поле быть заблокировано
		const isDisabled = disabledFields[fieldName] === true
		console.log(`Рендеринг множественного поля ${fieldName}:`, fieldValue)

		// Проверяем, является ли значение массивом
		if (Array.isArray(fieldValue)) {
			return (
				<Box sx={{ mb: 2 }}>
					<Typography variant='subtitle2'>{field.display_name}</Typography>
					{fieldValue.map((item: any, index: number) => {
						// Проверяем формат данных для EMAIL и PHONE
						let displayValue = ''
						let valueType = ''

						if (typeof item === 'object' && item !== null) {
							// Формат для EMAIL и PHONE из Bitrix24
							if (item.VALUE && item.VALUE_TYPE) {
								displayValue = item.VALUE
								valueType = item.VALUE_TYPE

								console.log(
									`Обработка объекта с VALUE/VALUE_TYPE: ${displayValue} (${valueType})`
								)
							} else {
								// Другой формат объекта
								displayValue = JSON.stringify(item)
								console.log(`Обработка другого объекта:`, item)
							}
						} else if (typeof item === 'string') {
							displayValue = item
							console.log(`Обработка строкового значения: ${displayValue}`)
						} else {
							displayValue = String(item)
							console.log(`Обработка другого типа:`, item)
						}

						return (
							<TextField
								key={index}
								fullWidth
								label={
									valueType
										? `${valueType} ${index + 1}`
										: `Значение ${index + 1}`
								}
								value={displayValue}
								onChange={e => {
									// Создаем копию массива
									const newArray = [...fieldValue]

									// Обновляем значение в зависимости от формата
									if (
										typeof item === 'object' &&
										item !== null &&
										item.VALUE &&
										item.VALUE_TYPE
									) {
										// Сохраняем все поля объекта, обновляем только VALUE
										newArray[index] = { ...item, VALUE: e.target.value }
									} else {
										newArray[index] = e.target.value
									}

									console.log(
										`Обновлено значение в массиве ${fieldName}[${index}]:`,
										newArray[index]
									)
									onChange(fieldName, newArray)
								}}
								sx={{ mb: 1 }}
								disabled={isDisabled}
							/>
						)
					})}
					<Button
						variant='outlined'
						size='small'
						onClick={() => {
							// Добавляем новый элемент в массив
							const newArray = [...fieldValue]

							// Определяем формат нового элемента на основе существующих
							let newItem

							if (fieldName.includes('email')) {
								newItem = { VALUE: '', VALUE_TYPE: 'WORK', TYPE_ID: 'EMAIL' }
							} else if (fieldName.includes('phone')) {
								newItem = { VALUE: '', VALUE_TYPE: 'WORK', TYPE_ID: 'PHONE' }
							} else if (
								fieldValue.length > 0 &&
								typeof fieldValue[0] === 'object'
							) {
								// Копируем структуру первого элемента, но с пустым значением
								const template = fieldValue[0]
								newItem = { ...template, VALUE: '' }
							} else {
								newItem = ''
							}

							newArray.push(newItem)
							console.log(`Добавлен новый элемент в ${fieldName}:`, newItem)
							onChange(fieldName, newArray)
						}}
						sx={{ mt: 1 }}
					>
						Добавить
					</Button>
				</Box>
			)
		}

		// Если значение не массив, но это поле множественное, создаем пустой массив
		// Создаем начальный массив в зависимости от типа поля
		// Определяем тип для множественных полей
		type MultiFieldItem = {
			VALUE: string
			VALUE_TYPE?: string
			TYPE_ID?: string
		}



		return (
			<Box sx={{ mb: 2 }}>
				<Typography variant='subtitle2'>{field.display_name}</Typography>
				<TextField
					fullWidth
					label='Значение'
					value={fieldValue || ''}
					onChange={e => {
						// Создаем новый массив с текущим значением
						let newValue: MultiFieldItem[] | string[] = []

						if (fieldName.includes('email')) {
							newValue = [
								{ VALUE: e.target.value, VALUE_TYPE: 'WORK', TYPE_ID: 'EMAIL' },
							]
						} else if (fieldName.includes('phone')) {
							newValue = [
								{ VALUE: e.target.value, VALUE_TYPE: 'WORK', TYPE_ID: 'PHONE' },
							]
						} else {
							newValue = [e.target.value]
						}

						console.log(`Создание нового массива для ${fieldName}:`, newValue)
						onChange(fieldName, newValue)
					}}
					sx={{ mb: 1 }}
					disabled={isDisabled}
				/>
				<Button
					variant='outlined'
					size='small'
					onClick={() => {
						// Создаем новый массив с начальными значениями
						let newValue: MultiFieldItem[] | string[] = []

						if (fieldName.includes('email')) {
							newValue = [{ VALUE: '', VALUE_TYPE: 'WORK', TYPE_ID: 'EMAIL' }]
						} else if (fieldName.includes('phone')) {
							newValue = [{ VALUE: '', VALUE_TYPE: 'WORK', TYPE_ID: 'PHONE' }]
						} else {
							newValue = ['']
						}

						console.log(`Создание нового массива для ${fieldName}:`, newValue)
						onChange(fieldName, newValue)
					}}
					sx={{ mt: 1 }}
					disabled={isDisabled}
				>
					Добавить
				</Button>
			</Box>
		)
	}

	// Функция для рендеринга поля в зависимости от типа
	const renderField = (field: FieldMapping) => {
		const fieldName = `dynamic_${field.app_field_name}`
		const fieldValue = formData[fieldName] || ''
		// Проверка для блокировки полей даты визита (по типу поля, без хардкода field ID)
		const isDateField =
			field.field_type === 'date' ||
			field.field_type === 'datetime' ||
			field.app_field_name === '1732026275473' ||
			field.app_field_name === 'ufCrm18_1732026275473'
		const isVisitCompleted =
			entityType === 'visit' &&
			(formData['dynamic_status'] === 'completed' ||
				formData['dynamic_status'] === 'failed')

		// Проверяем, должно ли поле быть заблокировано
		const isDisabled =
			disabledFields[fieldName] === true || (isDateField && isVisitCompleted)

		// Стили для улучшения отступов полей
		const fieldStyles = {
			'& .MuiOutlinedInput-root': {
				'& .MuiOutlinedInput-input': {
					padding: isSmallScreen ? '16px 14px' : '14px 16px',
				},
				backgroundColor: 'background.paper',
				borderRadius: isSmallScreen ? '8px' : 1,
				'& fieldset': {
					borderWidth: 1,
					borderColor: (theme: Theme) => alpha(theme.palette.divider, 0.8),
				},
				'&:hover fieldset': {
					borderColor: (theme: Theme) => theme.palette.primary.main,
				},
				'&.Mui-focused fieldset': {
					borderWidth: 1.5,
				},
			},
			'& .MuiInputLabel-root': {
				marginLeft: isSmallScreen ? '8px' : '4px',
				fontWeight: 500,
				fontSize: isSmallScreen ? '0.85rem' : '0.9rem',
				color: (theme: Theme) => theme.palette.text.secondary,
			},
			'& .MuiFormHelperText-root': {
				marginLeft: '8px',
				fontSize: '0.75rem',
			},
			mb: isSmallScreen ? 3 : 2.5,
			// Симметричные отступы для полей ввода на мобильной версии
			...(isSmallScreen && {
				width: '100%', // Полная ширина в мобильной версии
				maxWidth: isSmallScreen ? '100%' : '500px', // Ограничение ширины для центрирования
			}),
		}


		// Дополнительная проверка для поля адреса
		const isAddressField =
			fieldName.includes('address') ||
			field.app_field_name.includes('address') ||
			field.display_name.toLowerCase().includes('адрес') ||
			field.bitrix_field_id === '6679726EB1750' ||
			field.bitrix_field_id === '6679726eb1750'

		// Проверяем, является ли поле множественным (crm_multifield)
		if (
			field.field_type === 'crm_multifield' ||
			fieldName.toLowerCase().includes('email') ||
			fieldName.toLowerCase().includes('phone')
		) {
			return renderMultiField(field, fieldName, fieldValue)
		}

		switch (field.field_type) {

			case 'composite':
				// Получаем настройки составного поля из value_options
				let compositeSettings = {
					field1_name: 'ФИО',
					field2_name: 'Инфо',
					separator: ':',
				}

				// Пробуем парсить настройки из value_options
				if (field.value_options) {
					try {
						const parsedSettings = JSON.parse(field.value_options)
						if (parsedSettings.field1_name)
							compositeSettings.field1_name = parsedSettings.field1_name
						if (parsedSettings.field2_name)
							compositeSettings.field2_name = parsedSettings.field2_name
						if (parsedSettings.separator)
							compositeSettings.separator = parsedSettings.separator
					} catch (e) {
						console.error('Ошибка парсинга настроек составного поля:', e)
					}
				}

				// Проверяем, является ли поле множественным
				if (field.is_multiple) {
					// Преобразуем значение в массив, если оно еще не массив
					const values: string[] = Array.isArray(fieldValue)
						? fieldValue
						: fieldValue
							? [fieldValue.toString()]
							: ['']
					return (
						<Box
							sx={{ display: 'flex', flexDirection: 'column', width: '100%' }}
						>
							{values.map((val, idx) => (
								<Box
									key={idx}
									sx={{
										display: 'flex',
										flexDirection: 'column',
										width: '100%',
										mb: 2,
									}}
								>
									<CompositeField
										fieldName={`${fieldName}_${idx}`}
										fieldValue={val}
										displayName={
											idx === 0
												? field.display_name
												: `${field.display_name} #${idx + 1}`
										}
										isRequired={field.is_required}
										isDisabled={isDisabled}
										onChange={(name, value) => {
											// Обновляем конкретный элемент в массиве
											const updatedValues = [...values]
											updatedValues[idx] = value
											onChange(fieldName, updatedValues)
										}}
										compositeSettings={compositeSettings}
									/>
									{values.length > 1 && (
										<Button
											variant='outlined'
											color='error'
											size='small'
											sx={{ mt: 1 }}
											onClick={() => {
												const updatedValues = values.filter((_, i) => i !== idx)
												onChange(fieldName, updatedValues)
											}}
										>
											Удалить
										</Button>
									)}
								</Box>
							))}
							<Button
								variant='outlined'
								size='small'
								sx={{ mt: 1 }}
								onClick={() => onChange(fieldName, [...values, ''])}
								startIcon={
									<svg width='18' height='18' viewBox='0 0 24 24'>
										<path
											fill='currentColor'
											d='M19 13H13V19H11V13H5V11H11V5H13V11H19V13Z'
										/>
									</svg>
								}
							>
								Добавить {field.display_name}
							</Button>
						</Box>
					)
				} else {
					// Для одиночного поля используем стандартный компонент
					return (
						<CompositeField
							fieldName={fieldName}
							fieldValue={fieldValue as string}
							displayName={field.display_name}
							isRequired={field.is_required}
							isDisabled={isDisabled}
							onChange={onChange}
							compositeSettings={compositeSettings}
						/>
					)
				}

			case 'string':
				// Проверяем, является ли поле множественным

				if (field.is_multiple) {
					// Преобразуем значение в массив, если оно еще не массив
					const values: string[] = Array.isArray(fieldValue)
						? fieldValue
						: fieldValue
							? [fieldValue.toString()]
							: ['']

					return (
						<Box
							sx={{ display: 'flex', flexDirection: 'column', width: '100%' }}
						>
							{values.map((value, idx) => (
								<Box
									key={idx}
									sx={{
										display: 'flex',
										alignItems: 'center',
										width: '100%',
										mb: 1,
									}}
								>
									<TextField
										type='text'
										label={idx === 0 ? field.display_name : undefined}
										placeholder={field.description || field.display_name}
										value={value}
										onChange={e => {
											const updated = [...values]
											updated[idx] = e.target.value
											onChange(fieldName, updated)
										}}
										required={field.is_required}
										sx={fieldStyles}
										disabled={isDisabled}
										inputProps={{
											'data-field-name': fieldName.replace('dynamic_', ''),
											'data-field-type': 'string',
											// Set autocomplete to on to allow browser's native address suggestions
											autoComplete: isAddressField ? 'street-address' : 'on',
										}}
									/>
									{values.length > 1 && (
										<Button
											size='small'
											color='error'
											variant='outlined'
											sx={{ ml: 1 }}
											onClick={() => {
												const updated = values.filter((_, i) => i !== idx)
												onChange(fieldName, updated)
											}}
										>
											Удалить
										</Button>
									)}
								</Box>
							))}
							<Button
								variant='outlined'
								size='small'
								sx={{ mt: 1 }}
								onClick={() => onChange(fieldName, [...values, ''])}
								startIcon={
									<svg width='18' height='18' viewBox='0 0 24 24'>
										<path
											fill='currentColor'
											d='M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z'
										/>
									</svg>
								}
							>
								Добавить
							</Button>
						</Box>
					)
				} else {
					// Проверка для особого отображения полей-комментариев и адресов
					const isComment =
						field.bitrix_field_id === 'COMMENTS' ||
						(field.bitrix_field_id &&
							field.bitrix_field_id.toLowerCase().includes('comment')) ||
						(field.display_name &&
							field.display_name.toLowerCase().includes('коммент'))
					const isAddressField = field.display_name
						.toLowerCase()
						.includes('адрес')
					console.log()


					return (
						<Box sx={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
							<TextField
								fullWidth
								type='text'
								id={`field-${field.bitrix_field_id}`}
								data-field-id={field.bitrix_field_id}
								name={fieldName}
								label={field.display_name}
								helperText={
									field.description
										? field.description
										: isComment
											? 'Ваши заметки'
											: undefined
								}
								value={fieldValue || ''}
								onChange={e => onChange(fieldName, e.target.value)}
								required={field.is_required}
								multiline={!!isComment}
								minRows={isComment ? 4 : 1}
								maxRows={isComment ? 10 : 1}
								sx={fieldStyles}
								disabled={isDisabled}
								inputProps={{
									'data-field-name': fieldName.replace('dynamic_', ''),
									'data-field-type': 'string',
									autoComplete: isAddressField ? 'street-address' : 'on',
								}}
							/>


						</Box>
					)

				}

			case 'number':
				return (
					<TextField
						fullWidth
						// Using text type instead of number to allow for comma decimals and leading zeros
						type='text'
						label={field.display_name}
						name={fieldName}
						value={fieldValue}
						onChange={e => {
							// Получаем новое значение из поля ввода
							const newValue = e.target.value

							// Явно разрешаем все специальные значения, которые нужно обрабатывать особым образом
							// 1. Пустые значения
							if (newValue === '') {
								onChange(fieldName, newValue)
								return
							}

							// 2. Одиночные символы: "0", ",", ".", "-"
							if (
								newValue === '0' ||
								newValue === ',' ||
								newValue === '.' ||
								newValue === '-'
							) {
								onChange(fieldName, newValue)
								return
							}

							// 3. Ведущие нули: "01", "05", "00", "001" и т.д.
							if (/^0\d+$/.test(newValue)) {
								// Если начинается с 0 и дальше идут цифры, разрешаем
								onChange(fieldName, newValue)
								return
							}

							// 4. Ведущие нули с дробной частью: "0.5", "01.5", "01,5"
							if (/^0\d*[.,]\d*$/.test(newValue)) {
								onChange(fieldName, newValue)
								return
							}

							// 5. Отрицательные значения с ведущими нулями: "-01", "-05"
							if (/^-0\d+$/.test(newValue)) {
								onChange(fieldName, newValue)
								return
							}

							// 6. Отрицательные значения с ведущими нулями и дробной частью: "-01.5"
							if (/^-0\d*[.,]\d*$/.test(newValue)) {
								onChange(fieldName, newValue)
								return
							}

							// 7. Дробные значения с разделителем в начале: ".5", ",5"
							if (/^[.,]\d+$/.test(newValue)) {
								onChange(fieldName, newValue)
								return
							}

							// 8. Стандартные числовые значения (целые и дробные)
							if (/^-?\d+$/.test(newValue) || /^-?\d+[.,]\d*$/.test(newValue)) {
								onChange(fieldName, newValue)
								return
							}

							// Если в процессе ввода (например, начал вводить отрицательное число)
							if (/^-$/.test(newValue) || /^-\d*[.,]?$/.test(newValue)) {
								onChange(fieldName, newValue)
								return
							}
						}}
						required={field.is_required}
						sx={fieldStyles}
						disabled={isDisabled}
						inputProps={{
							'data-field-name': fieldName.replace('dynamic_', ''),
							'data-field-type': 'number',
							// No pattern here, we're handling validation in onChange
						}}
					/>
				)

			case 'date':
				return (
					<TextField
						fullWidth
						type='date'
						label={field.display_name}
						name={fieldName}
						value={fieldValue || new Date().toISOString().split('T')[0]}
						onChange={e => onChange(fieldName, e.target.value)}
						required={field.is_required}
						InputLabelProps={{ shrink: true }}
						sx={fieldStyles}
						inputProps={{
							style: { cursor: isDisabled ? 'not-allowed' : 'pointer' },
							readOnly: isDisabled,
						}}
						helperText={
							isDisabled
								? isDateField && isVisitCompleted
									? 'Нельзя изменить дату завершенного визита'
									: 'Нельзя изменить дату'
								: 'Выберите дату'
						}
						disabled={isDisabled}
					/>
				)

			case "datetime": {
				return (
					<TextField
						fullWidth
						type="datetime-local"
						label={field.display_name}
						name={fieldName}
						value={formatDatetimeValue(fieldValue)} // Функция форматирования даты
						onChange={(e) => {
							if (isDisabled) {
								console.log(`Попытка изменить отключенное поле ${fieldName} - действие заблокировано`);
								return;
							}

							try {
								const newValue = e.target.value;

								if (!newValue) {
									console.warn(`Empty value for field ${fieldName}`);
									return;
								}

								// Преобразуем введенную дату в объект Date
								const dateValue = new Date(newValue);

								if (!isNaN(dateValue.getTime())) {
									const pad = (n: number) => n.toString().padStart(2, "0");
									const year = dateValue.getFullYear();
									const month = pad(dateValue.getMonth() + 1);
									const day = pad(dateValue.getDate());

									// Извлекаем время напрямую из введенного значения
									const timeMatch = newValue.match(/T(\d{2}):(\d{2})/);
									const hours = timeMatch ? timeMatch[1] : pad(dateValue.getHours());
									const minutes = timeMatch ? timeMatch[2] : pad(dateValue.getMinutes());
									const seconds = "00";

									// Формируем строку вручную
									const isoString = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
									console.log(`Manually formatted ISO string for ${fieldName}:`, isoString);

									// Обновляем состояние
									onChange(fieldName, isoString);
								} else {
									console.warn(`Invalid date entered for field ${fieldName}:`, newValue);
								}
							} catch (error) {
								console.error(`Error processing datetime change for field ${fieldName}:`, error);
							}
						}}
						required={field.is_required}
						InputLabelProps={{ shrink: true }}
						sx={fieldStyles}
						disabled={isDisabled}
						inputProps={{
							style: { cursor: isDisabled ? "not-allowed" : "pointer" },
							readOnly: isDisabled,
						}}
						helperText={
							isDisabled
								? isDateField && isVisitCompleted
									? "Нельзя изменить дату завершенного визита"
									: "Нельзя изменить дату и время"
								: "Выберите дату и время визита"
						}
					/>
				);
			}

			case 'boolean':
				// Правильная обработка булевых полей, учитывая что 0 должен быть false
				const boolValue =
					fieldValue === 1 ||
					fieldValue === '1' ||
					fieldValue === true ||
					fieldValue === 'true'
				console.log(
					`Обработка булевого поля ${fieldName}: исходное значение = ${fieldValue}, преобразованное = ${boolValue}`
				)

				return (
					<FormControlLabel
						control={
							<Checkbox
								name={fieldName}
								checked={boolValue}
								onChange={e => onChange(fieldName, e.target.checked ? 1 : 0)}
								disabled={isDisabled}
							/>
						}
						label={field.display_name}
						sx={fieldStyles}
						disabled={isDisabled}
					/>
				)

			case 'list':
			case 'enum':
				try {
					let options: { app_value: string; bitrix_value: string }[] = []

					if (field.value_options) {
						options = JSON.parse(field.value_options)
					}

					// Проверяем, является ли текущее значение массивом
					// Если нет, и оно не пустое, преобразуем его в массив с одним элементом
					// Всегда работаем с массивом для единообразия
					let currentValue: string[] = []

					if (Array.isArray(fieldValue)) {
						currentValue = fieldValue
					} else if (fieldValue) {
						currentValue = [fieldValue as string]
					}

					// Проверяем, есть ли флаг is_multiple в поле
					const isMultiple = field.is_multiple === true
					// console.log(
					// 	`Рендеринг списка ${fieldName}, isMultiple: ${isMultiple}, Текущее значение:`,
					// 	currentValue
					// )

					// Если поле поддерживает множественный выбор, рендерим выпадающий список с чекбоксами
					if (isMultiple) {
						// Обработчик изменения выбранных значений
						const handleMultiSelectChange = (
							event: SelectChangeEvent<string[]>
						) => {
							const value = event.target.value
							// Преобразуем в массив, если пришла строка
							const selectedValues =
								typeof value === 'string' ? value.split(',') : value
							onChange(fieldName, selectedValues)
						}

						return (
							<FormControl fullWidth sx={fieldStyles} disabled={isDisabled}>
								<InputLabel>{field.display_name}</InputLabel>
								<Select
									multiple
									name={fieldName}
									value={currentValue}
									onChange={handleMultiSelectChange}
									label={field.display_name}
									required={field.is_required}
									disabled={isDisabled}
									renderValue={selected => {
										// Если selected - массив, соединяем значения через запятую
										if (Array.isArray(selected)) {
											return selected.join(', ')
										}
										return selected as string
									}}
								>
									{options.map((option, index) => (
										<MenuItem key={index} value={option.app_value}>
											<Checkbox
												checked={
													Array.isArray(currentValue) &&
													currentValue.includes(option.app_value)
												}
											/>
											<ListItemText primary={option.app_value} />
										</MenuItem>
									))}
								</Select>
								{field.is_required && currentValue.length === 0 && (
									<FormHelperText error>
										Необходимо выбрать хотя бы одно значение
									</FormHelperText>
								)}
							</FormControl>
						)
					} else {
						// Для обычного выбора используем стандартный Select
						const handleSelectChange = (event: SelectChangeEvent<string>) => {
							const value = event.target.value
							onChange(fieldName, value)
						}

						// Для обычного выбора используем строковое значение
						const singleValue = currentValue.length > 0 ? currentValue[0] : ''

						return (
							<FormControl fullWidth sx={fieldStyles} disabled={isDisabled}>
								<InputLabel>{field.display_name}</InputLabel>
								<Select
									name={fieldName}
									value={singleValue}
									onChange={handleSelectChange}
									label={field.display_name}
									required={field.is_required}
									disabled={isDisabled}
								>
									{options.map((option, index) => (
										<MenuItem key={index} value={option.app_value}>
											{option.app_value}
										</MenuItem>
									))}
								</Select>
							</FormControl>
						)
					}
				} catch (e) {
					console.error('Ошибка парсинга value_options:', e)
					return (
						<TextField
							fullWidth
							label={field.display_name}
							name={fieldName}
							value={fieldValue}
							onChange={e => onChange(fieldName, e.target.value)}
							required={field.is_required}
							sx={fieldStyles}
							error
							helperText='Ошибка загрузки опций'
							disabled={isDisabled}
						/>
					)
				}

			default:
				return (
					<TextField
						fullWidth
						label={field.display_name}
						name={fieldName}
						value={fieldValue}
						onChange={e => onChange(fieldName, e.target.value)}
						required={field.is_required}
						sx={fieldStyles}
						disabled={isDisabled}
					/>
				)
		}
	}

	// Сортируем поля по порядку сортировки (sort_order)
	const sortFields = (fields: FieldMapping[]) => {
		return [...fields].sort((a, b) => {
			// Если поле sort_order не указано, используем значение по умолчанию 100
			const orderA = a.sort_order !== undefined ? a.sort_order : 100
			const orderB = b.sort_order !== undefined ? b.sort_order : 100
			return orderA - orderB
		})
	}

	const formatDatetimeValue = (value: string | number | Date) => {

		if (!value) {
			const date = new Date();
			const year = date.getFullYear();
			const month = String(date.getMonth() + 1).padStart(2, "0");
			const day = String(date.getDate()).padStart(2, "0");
			const hours = String(date.getHours()).padStart(2, "0");
			const minutes = String(date.getMinutes()).padStart(2, "0");

			return `${year}-${month}-${day}T${hours}:${minutes}`;
		}

		let dateObj;
		if (typeof value === "string") {
			dateObj = new Date(value);
		} else if (typeof value === "number") {
			dateObj = new Date(value); // Если значение — timestamp
		} else {
			dateObj = value; // Предполагаем, что это уже объект Date
		}

		if (isNaN(dateObj.getTime())) {
			console.warn(`Invalid date value:`, value);
			return ""; // Возвращаем пустую строку для невалидных дат
		}

		const pad = (n: number) => n.toString().padStart(2, "0");
		const year = dateObj.getFullYear();
		const month = pad(dateObj.getMonth() + 1);
		const day = pad(dateObj.getDate());
		const hours = pad(dateObj.getHours());
		const minutes = pad(dateObj.getMinutes());

		return `${year}-${month}-${day}T${hours}:${minutes}`;
	};

	// Разделяем поля на обычные и комментарии, сортируем каждую группу
	const regularFields = sortFields(
		fieldMappings.filter(field => !isCommentField(field))
	)
	const commentFields = sortFields(
		fieldMappings.filter(field => isCommentField(field))
	)

	return (
		<Grid
			container
			spacing={isSmallScreen ? 1 : 1}
			sx={{
				// Равномерные горизонтальные отступы в мобильной версии
				px: isSmallScreen ? 1 : 1, // Убираем отступы на уровне грида, т.к. они уже есть на уровне Paper
				...(isSmallScreen && {
					'& .MuiGrid-item': {
						py: 0.5, // Меньшие вертикальные отступы между полями
						px: 0, // Убираем горизонтальные отступы для элементов грида
					},
					// Добавляем равномерные отступы для всех полей ввода
					'& .MuiFormControl-root, & .MuiTextField-root, & .MuiSelect-root': {
						width: '100%', // Полная ширина полей формы
						px: 0, // Сбрасываем горизонтальные отступы
						margin: '0 !important', // Приоритетно убираем все margin
					},
					'& .MuiInputBase-root': {
						width: '100%',
					},
				}),
			}}
		>
			{/* Заголовок убран, чтобы не дублировать тот, что есть в VisitDetailsPage */}

			{/* Отображаем обычные поля */}
			{regularFields.map(field => (
				<Grid item key={field.id} xs={12} md={gridSize.md}>
					<Box
						sx={{
							p: isSmallScreen ? 1.5 : 2,
							flexGrow: 1,
							pb: '16px !important',
						}}
					>
						{renderField(field)}
					</Box>
				</Grid>
			))}

			{/* Отображаем поля комментариев внизу */}
			{commentFields.length > 0 && (
				<>
					<Grid item xs={12}>
						<Typography variant='h6' gutterBottom sx={{ mt: 2, px: 0 }}>
							Комментарии
						</Typography>
					</Grid>
					{commentFields.map(field => (
						<Grid item key={field.id} xs={12}>
							<Box sx={{ px: isSmallScreen ? 2 : 2 }}>{renderField(field)}</Box>
						</Grid>
					))}
				</>
			)}
		</Grid>
	)
}
