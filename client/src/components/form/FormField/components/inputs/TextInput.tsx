import React, { useState, useEffect } from 'react'
import { TextField } from '@mui/material'
import { FieldInputProps } from '../../types'
import { getFieldStyles } from '../../utils/fieldStyles'
import { useDebounce } from '../../hooks/useDebounce'
import { FIELD_CONSTANTS } from '../../constants'

export const TextInput: React.FC<FieldInputProps> = ({
	field,
	value,
	onChange,
	error,
	compact = false,
}) => {
	const styles = getFieldStyles(compact)

	// Локальное состояние для мгновенного отображения ввода
	const [localValue, setLocalValue] = useState(value || '')
	const [isTyping, setIsTyping] = useState(false)

	// Debounced значение для отправки в форму
	const debouncedValue = useDebounce(localValue, FIELD_CONSTANTS.DEBOUNCE_DELAY)

	// Синхронизируем с внешним value только если пользователь не печатает
	useEffect(() => {
		if (!isTyping) {
			setLocalValue(value || '')
		}
	}, [value, isTyping])

	// Отправляем изменения в форму с задержкой
	useEffect(() => {
		if (debouncedValue !== value && isTyping) {
			onChange(field.name, debouncedValue)
			setIsTyping(false)
		}
	}, [debouncedValue, value, field.name, onChange, isTyping])

	return (
		<TextField
			fullWidth
			id={field.name}
			name={field.name}
			label={field.label}
			type={field.type === 'number' ? 'number' : 'text'}
			margin={compact ? 'dense' : 'normal'}
			value={localValue}
			onChange={e => {
				setLocalValue(e.target.value)
				setIsTyping(true)
			}}
			required={field.required}
			error={!!error}
			helperText={error}
			placeholder={field.placeholder || ''}
			size={compact ? 'small' : 'medium'}
			sx={styles.textField}
		/>
	)
}
