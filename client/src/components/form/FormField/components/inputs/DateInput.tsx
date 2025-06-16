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
} from '@mui/material'
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
		if (!dateValue) return { date: '', time: '12:00' }

		try {
			const date = new Date(dateValue)
			if (isNaN(date.getTime())) return { date: '', time: '12:00' }

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
			return { date: '', time: '12:00' }
		}
	}

	const { date, time } = parseValue(value || '')
	const [selectedTime, setSelectedTime] = useState(time)

	// Комбинируем дату и время
	const combineDateTime = (dateStr: string, timeStr: string) => {
		if (!dateStr) return ''

		if (includeTime && timeStr) {
			return new Date(`${dateStr}T${timeStr}`).toISOString()
		} else {
			// Только дата - устанавливаем время 12:00
			return new Date(`${dateStr}T12:00`).toISOString()
		}
	}

	// Генерируем опции времени (каждые 15 минут в рабочее время, каждый час в остальное)
	const generateTimeOptions = () => {
		const options = []

		// Популярные варианты времени для доставки
		const popularTimes = [
			'08:00',
			'08:30',
			'09:00',
			'09:30',
			'10:00',
			'10:30',
			'11:00',
			'11:30',
			'12:00',
			'12:30',
			'13:00',
			'13:30',
			'14:00',
			'14:30',
			'15:00',
			'15:30',
			'16:00',
			'16:30',
			'17:00',
			'17:30',
			'18:00',
		]

		// Добавляем популярные времена
		popularTimes.forEach(time => {
			options.push({ value: time, label: time })
		})

		// Добавляем остальные часы (менее популярные)
		for (let hour = 0; hour < 24; hour++) {
			const h = String(hour).padStart(2, '0')
			const timeValue = `${h}:00`

			// Добавляем только если еще нет в популярных
			if (!popularTimes.includes(timeValue)) {
				options.push({ value: timeValue, label: timeValue })
			}
		}

		// Сортируем по времени
		return options.sort((a, b) => a.value.localeCompare(b.value))
	}

	if (isMobile && includeTime) {
		// На мобильных устройствах для полей с временем показываем отдельные поля
		return (
			<Box sx={{ display: 'flex', gap: 1, flexDirection: 'column' }}>
				<TextField
					fullWidth
					id={`${field.name}_date`}
					name={`${field.name}_date`}
					label={`${field.label} (дата)`}
					type='date'
					margin={compact ? 'dense' : 'normal'}
					value={date}
					onChange={e => {
						const newValue = combineDateTime(e.target.value, selectedTime)
						onChange(field.name, newValue)
					}}
					required={field.required}
					error={!!error}
					size={compact ? 'small' : 'medium'}
					InputLabelProps={{
						shrink: true,
					}}
					inputProps={{
						// Отключаем автозаполнение
						autoComplete: 'off',
						// Минимальная дата - сегодня
						min: new Date().toISOString().split('T')[0],
					}}
					sx={styles.textField}
				/>

				<FormControl
					fullWidth
					margin={compact ? 'dense' : 'normal'}
					size={compact ? 'small' : 'medium'}
					error={!!error}
				>
					<InputLabel shrink>{`${field.label} (время)`}</InputLabel>
					<Select
						value={selectedTime}
						onChange={e => {
							const newTime = e.target.value as string
							setSelectedTime(newTime)
							if (date) {
								const newValue = combineDateTime(date, newTime)
								onChange(field.name, newValue)
							}
						}}
						displayEmpty
						MenuProps={{
							PaperProps: {
								style: {
									maxHeight: 200,
								},
							},
						}}
					>
						{generateTimeOptions().map(option => (
							<MenuItem key={option.value} value={option.value}>
								{option.label}
							</MenuItem>
						))}
					</Select>
					{error && <FormHelperText>{error}</FormHelperText>}
				</FormControl>
			</Box>
		)
	}

	// Для десктопа или полей только с датой
	return (
		<TextField
			fullWidth
			id={field.name}
			name={field.name}
			label={field.label}
			type={includeTime ? 'datetime-local' : 'date'}
			margin={compact ? 'dense' : 'normal'}
			value={
				includeTime
					? date && selectedTime
						? `${date}T${selectedTime}`
						: ''
					: date
			}
			onChange={e => {
				if (includeTime) {
					// datetime-local
					if (e.target.value) {
						const date = new Date(e.target.value)
						onChange(field.name, date.toISOString())
					} else {
						onChange(field.name, '')
					}
				} else {
					// date only
					const newValue = combineDateTime(e.target.value, '12:00')
					onChange(field.name, newValue)
				}
			}}
			required={field.required}
			error={!!error}
			helperText={error}
			size={compact ? 'small' : 'medium'}
			InputLabelProps={{
				shrink: true,
			}}
			inputProps={{
				step: includeTime ? 60 : undefined,
				// Отключаем автозаполнение для лучшего контроля
				autoComplete: 'off',
				// Минимальная дата - сегодня
				min: new Date().toISOString().split('T')[0],
			}}
			sx={styles.textField}
		/>
	)
}
