import React, { useState, useEffect } from 'react'
import { TextField } from '@mui/material'
import { FieldInputProps } from '../../types'
import { getFieldStyles } from '../../utils/fieldStyles'
import { useDebounce } from '../../hooks/useDebounce'
import { FIELD_CONSTANTS } from '../../constants'

export const TextareaInput: React.FC<FieldInputProps> = ({
	field,
	value,
	onChange,
	error,
	compact = false,
	isMobile = false,
}) => {
	const styles = getFieldStyles(compact, isMobile)

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

	// Определяем количество строк в зависимости от режима
	const getRows = () => {
		if (isMobile) {
			return FIELD_CONSTANTS.MOBILE_TEXTAREA_ROWS
		}
		return compact
			? FIELD_CONSTANTS.COMPACT_TEXTAREA_ROWS
			: FIELD_CONSTANTS.DEFAULT_TEXTAREA_ROWS
	}

	return (
		<TextField
			fullWidth
			id={field.name}
			name={field.name}
			label={field.label}
			multiline
			rows={getRows()}
			margin={compact || isMobile ? 'dense' : 'normal'}
			size={isMobile ? 'small' : compact ? 'small' : 'medium'}
			value={localValue}
			onChange={e => {
				setLocalValue(e.target.value)
				setIsTyping(true)
			}}
			error={!!error}
			helperText={error}
			required={field.required}
			sx={styles.textField}
		/>
	)
}
