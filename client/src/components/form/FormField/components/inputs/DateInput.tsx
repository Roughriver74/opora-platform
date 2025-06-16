import React from 'react'
import { TextField } from '@mui/material'
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

	// Форматируем значение для datetime-local input
	const formatDateTimeForInput = (dateValue: string): string => {
		if (!dateValue) return ''

		try {
			const date = new Date(dateValue)
			if (isNaN(date.getTime())) return ''

			// Преобразуем в локальный часовой пояс и форматируем для datetime-local
			const year = date.getFullYear()
			const month = String(date.getMonth() + 1).padStart(2, '0')
			const day = String(date.getDate()).padStart(2, '0')
			const hours = String(date.getHours()).padStart(2, '0')
			const minutes = String(date.getMinutes()).padStart(2, '0')

			return `${year}-${month}-${day}T${hours}:${minutes}`
		} catch {
			return ''
		}
	}

	const formattedValue = formatDateTimeForInput(value || '')

	return (
		<TextField
			fullWidth
			id={field.name}
			name={field.name}
			label={field.label}
			type='datetime-local'
			margin={compact ? 'dense' : 'normal'}
			value={formattedValue}
			onChange={e => {
				// Преобразуем значение обратно в ISO формат для хранения
				if (e.target.value) {
					const date = new Date(e.target.value)
					onChange(field.name, date.toISOString())
				} else {
					onChange(field.name, '')
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
				step: 60, // Шаг в секундах для поля времени (1 минута)
			}}
			sx={styles.textField}
		/>
	)
}
