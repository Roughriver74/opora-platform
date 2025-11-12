import React, { useState } from 'react'
import {
	TextField,
	Box,
	FormControl,
	InputLabel,
	Select,
	MenuItem,
	FormHelperText,
	useMediaQuery,
	useTheme,
	Button,
	ButtonGroup,
	Chip,
	ListSubheader,
	Typography,
	InputAdornment,
	IconButton,
} from '@mui/material'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import WbSunnyIcon from '@mui/icons-material/WbSunny'
import Brightness5Icon from '@mui/icons-material/Brightness5'
import Brightness3Icon from '@mui/icons-material/Brightness3'
import ClearIcon from '@mui/icons-material/Clear'
import { FieldInputProps } from '../../types'
import { getFieldStyles } from '../../utils/fieldStyles'

export const DateInput: React.FC<FieldInputProps> = ({
	field,
	value,
	onChange,
	error,
	compact = false,
}) => {
	const styles = getFieldStyles(compact)
	const theme = useTheme()
	const isMobile = useMediaQuery(theme.breakpoints.down('sm'))

	// Определяем включает ли поле время на основе метки
	const includeTime =
		field.label?.toLowerCase().includes('время') ||
		field.name?.toLowerCase().includes('time') ||
		field.name?.toLowerCase().includes('datetime')

	// Разбираем существующее значение
	const parseValue = (dateValue: string) => {
		if (!dateValue) return { date: '', time: '' }

		try {
			const date = new Date(dateValue)
			if (isNaN(date.getTime())) return { date: '', time: '' }

			const year = date.getFullYear()
			const month = String(date.getMonth() + 1).padStart(2, '0')
			const day = String(date.getDate()).padStart(2, '0')
			const hours = String(date.getHours()).padStart(2, '0')
			const minutes = String(date.getMinutes()).padStart(2, '0')

			return {
				date: `${year}-${month}-${day}`,
				time: `${hours}:${minutes}`,
			}
		} catch {
			return { date: '', time: '' }
		}
	}

	const { date, time } = parseValue(value || '')
	const [selectedTime, setSelectedTime] = useState(time || '')

	// Больше НЕ загружаем сохраненные предпочтения времени автоматически
	// useEffect(() => {
	// 	const savedTime = localStorage.getItem('preferredDeliveryTime')
	// 	if (savedTime && !value) {
	// 		setSelectedTime(savedTime)
	// 	}
	// }, [value])

	// Больше НЕ сохраняем предпочтения времени автоматически
	const saveTimePreference = (timeStr: string) => {
		// localStorage.setItem('preferredDeliveryTime', timeStr)
		// Функция оставлена для совместимости, но ничего не делает
	}

	// Комбинируем дату и время
	const combineDateTime = (dateStr: string, timeStr: string) => {
		if (!dateStr) return ''

		// Если поле требует время, но время не выбрано - возвращаем пустую строку
		if (includeTime && !timeStr) {
			return ''
		}

		if (includeTime && timeStr) {
			return new Date(`${dateStr}T${timeStr}`).toISOString()
		} else {
			// Только дата без времени - устанавливаем полдень для корректной обработки часовых поясов
			return new Date(`${dateStr}T12:00`).toISOString()
		}
	}

	// Генерируем опции времени с группировкой по времени суток
	const generateTimeOptions = () => {
		const groups = {
			morning: { label: 'Утро (6:00 - 12:00)', icon: '🌅', times: [] as any[] },
			afternoon: { label: 'День (12:00 - 18:00)', icon: '☀️', times: [] as any[] },
			evening: { label: 'Вечер (18:00 - 22:00)', icon: '🌆', times: [] as any[] },
			night: { label: 'Ночь (22:00 - 6:00)', icon: '🌙', times: [] as any[] }
		}

		// Генерируем времена с шагом 15 минут для рабочего времени
		for (let hour = 6; hour <= 18; hour++) {
			for (let minute = 0; minute < 60; minute += 15) {
				const h = String(hour).padStart(2, '0')
				const m = String(minute).padStart(2, '0')
				const timeValue = `${h}:${m}`
				
				if (hour < 12) {
					groups.morning.times.push({ value: timeValue, label: timeValue })
				} else if (hour < 18 || (hour === 18 && minute === 0)) {
					groups.afternoon.times.push({ value: timeValue, label: timeValue })
				}
			}
		}

		// Вечернее время с шагом 30 минут
		for (let hour = 18; hour <= 22; hour++) {
			for (let minute = hour === 18 ? 30 : 0; minute < 60; minute += 30) {
				if (hour === 22 && minute > 0) break
				const h = String(hour).padStart(2, '0')
				const m = String(minute).padStart(2, '0')
				const timeValue = `${h}:${m}`
				groups.evening.times.push({ value: timeValue, label: timeValue })
			}
		}

		// Ночное время - только целые часы
		for (let hour = 22; hour < 24; hour++) {
			const h = String(hour).padStart(2, '0')
			groups.night.times.push({ value: `${h}:00`, label: `${h}:00` })
		}
		for (let hour = 0; hour < 6; hour++) {
			const h = String(hour).padStart(2, '0')
			groups.night.times.push({ value: `${h}:00`, label: `${h}:00` })
		}

		return groups
	}

	// Кнопки быстрого выбора времени
	const quickTimeButtons = [
		{ label: 'Пусто', value: '' },
		{ label: 'Утром', value: '09:00', icon: <WbSunnyIcon fontSize='small' /> },
		{
			label: 'Днем',
			value: '14:00',
			icon: <Brightness5Icon fontSize='small' />,
		},
		{
			label: 'Вечером',
			value: '18:00',
			icon: <Brightness3Icon fontSize='small' />,
		},
	]

	// Обработчик быстрого выбора времени
	const handleQuickTimeSelect = (timeValue: string) => {
		setSelectedTime(timeValue)
		saveTimePreference(timeValue)
		if (date) {
			const newValue = combineDateTime(date, timeValue)
			onChange(field.name, newValue)
		}
	}

	// Обработчик очистки даты
	const handleClearDate = () => {
		onChange(field.name, '')
		setSelectedTime('')
	}

	// Обработчик очистки времени
	const handleClearTime = () => {
		setSelectedTime('')
		if (date) {
			// Если дата есть, устанавливаем только дату без времени
			const newValue = combineDateTime(date, '')
			onChange(field.name, newValue)
		}
	}

	// Используем раздельные поля для всех устройств при включенном времени
	if (includeTime) {
		const timeGroups = generateTimeOptions()

		return (
			<Box sx={{ display: 'flex', gap: 2, flexDirection: 'column' }}>
				{/* Поле даты */}
				<TextField
					fullWidth
					id={`${field.name}_date`}
					name={`${field.name}_date`}
					label={field.label ? `${field.label} - Дата` : 'Дата'}
					type='date'
					margin={compact ? 'dense' : 'normal'}
					value={date || ''}
					onChange={e => {
						const newValue = combineDateTime(e.target.value, selectedTime)
						onChange(field.name, newValue)
					}}
					placeholder=""
					required={false}
					error={!!error}
					size={compact ? 'small' : 'medium'}
					InputLabelProps={{
						shrink: true,
					}}
					InputProps={{
						endAdornment: date ? (
							<InputAdornment position="end">
								<IconButton
									aria-label="очистить дату"
									onClick={handleClearDate}
									edge="end"
									size="small"
									sx={{ mr: 0.5 }}
								>
									<ClearIcon fontSize="small" />
								</IconButton>
							</InputAdornment>
						) : null,
					}}
					inputProps={{
						autoComplete: 'new-password',
						autoCorrect: 'off',
						autoCapitalize: 'off',
						spellCheck: 'false',
						'data-form-type': 'other',
						'data-lpignore': 'true',
						'data-1p-ignore': 'true',
					}}
					sx={styles.textField}
				/>

		 		{/* Кнопки быстрого выбора времени */}
		{/*		<Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
					<Typography variant="body2" color="text.secondary">
						Быстрый выбор:
					</Typography>
					<ButtonGroup size="small" variant="outlined">
						{quickTimeButtons.map(btn => (
							<Button
								key={btn.value}
								onClick={() => handleQuickTimeSelect(btn.value)}
								startIcon={btn.icon}
								variant={selectedTime === btn.value ? 'contained' : 'outlined'}
								color={selectedTime === btn.value ? 'primary' : 'inherit'}
							>
								{btn.label}
							</Button>
						))}
					</ButtonGroup>
				</Box>*/}

				{/* Поле времени с группировкой */}
				<FormControl
					fullWidth
					margin={compact ? 'dense' : 'normal'}
					size={compact ? 'small' : 'medium'}
					error={!!error}
					required={field.required}
				>
					<InputLabel shrink id={`${field.name}_time_label`}>
						Время доставки
					</InputLabel>
					<Select
						labelId={`${field.name}_time_label`}
						id={`${field.name}_time`}
						name={`${field.name}_time`}
						value={selectedTime || ''}
						onChange={e => {
							const newTime = e.target.value as string
							setSelectedTime(newTime)
							saveTimePreference(newTime)
							if (date) {
								const newValue = combineDateTime(date, newTime)
								onChange(field.name, newValue)
							}
						}}
						required={field.required}
						displayEmpty
						startAdornment={
							<InputAdornment position="start">
								<AccessTimeIcon fontSize="small" color="action" />
							</InputAdornment>
						}
						endAdornment={
							selectedTime ? (
								<InputAdornment position="end" sx={{ mr: 1 }}>
									<IconButton
										aria-label="очистить время"
										onClick={(e) => {
											e.stopPropagation()
											handleClearTime()
										}}
										edge="end"
										size="small"
									>
										<ClearIcon fontSize="small" />
									</IconButton>
								</InputAdornment>
							) : null
						}
						MenuProps={{
							PaperProps: {
								style: {
									maxHeight: 400,
								},
							},
						}}
						inputProps={{
							autoComplete: 'new-password',
							'data-lpignore': 'true',
							'data-1p-ignore': 'true',
						}}
					>
						{/* Группа "Утро" */}
						<ListSubheader sx={{ backgroundColor: 'background.paper', lineHeight: '36px' }}>
							{timeGroups.morning.icon} {timeGroups.morning.label}
						</ListSubheader>
						{timeGroups.morning.times.map(option => (
							<MenuItem key={`morning-${option.value}`} value={option.value} sx={{ pl: 4 }}>
								{option.label}
							</MenuItem>
						))}
						
						{/* Группа "День" */}
						<ListSubheader sx={{ backgroundColor: 'background.paper', lineHeight: '36px' }}>
							{timeGroups.afternoon.icon} {timeGroups.afternoon.label}
						</ListSubheader>
						{timeGroups.afternoon.times.map(option => (
							<MenuItem key={`afternoon-${option.value}`} value={option.value} sx={{ pl: 4 }}>
								{option.label}
							</MenuItem>
						))}
						
						{/* Группа "Вечер" */}
						<ListSubheader sx={{ backgroundColor: 'background.paper', lineHeight: '36px' }}>
							{timeGroups.evening.icon} {timeGroups.evening.label}
						</ListSubheader>
						{timeGroups.evening.times.map(option => (
							<MenuItem key={`evening-${option.value}`} value={option.value} sx={{ pl: 4 }}>
								{option.label}
							</MenuItem>
						))}
						
						{/* Группа "Ночь" */}
						<ListSubheader sx={{ backgroundColor: 'background.paper', lineHeight: '36px' }}>
							{timeGroups.night.icon} {timeGroups.night.label}
						</ListSubheader>
						{timeGroups.night.times.map(option => (
							<MenuItem key={`night-${option.value}`} value={option.value} sx={{ pl: 4 }}>
								{option.label}
							</MenuItem>
						))}
					</Select>
					{error && <FormHelperText>{error}</FormHelperText>}
					{selectedTime && (
						<FormHelperText>
							Выбрано время: {selectedTime}
						</FormHelperText>
					)}
				</FormControl>
			</Box>
		)
	}

	// Для полей только с датой (без времени)
	return (
		<TextField
			fullWidth
			id={field.name}
			name={field.name}
			label={field.label}
			type='date'
			margin={compact ? 'dense' : 'normal'}
			value={date || ''}
			onChange={e => {
				const newValue = combineDateTime(e.target.value, '12:00')
				onChange(field.name, newValue)
			}}
			placeholder=""
			required={field.required}
			error={!!error}
			helperText={error}
			size={compact ? 'small' : 'medium'}
			InputLabelProps={{
				shrink: true,
			}}
			InputProps={{
				endAdornment: date ? (
					<InputAdornment position="end">
						<IconButton
							aria-label="очистить дату"
							onClick={handleClearDate}
							edge="end"
							size="small"
							sx={{ mr: 0.5 }}
						>
							<ClearIcon fontSize="small" />
						</IconButton>
					</InputAdornment>
				) : null,
			}}
			inputProps={{
				autoComplete: 'new-password',
				autoCorrect: 'off',
				autoCapitalize: 'off',
				spellCheck: 'false',
				'data-form-type': 'other',
				'data-lpignore': 'true',
				'data-1p-ignore': 'true',
			}}
			sx={styles.textField}
		/>
	)
}
