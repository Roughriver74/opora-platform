import React, { useState, useEffect } from 'react'
import { TextField } from '@mui/material'
import { FieldInputProps } from '../../types'
import { getFieldStyles } from '../../utils/fieldStyles'
import { useDebounce } from '../../hooks/useDebounce'
import { FIELD_CONSTANTS } from '../../constants'

export const NumberInput: React.FC<FieldInputProps> = ({
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

	// Специальные стили для числового поля (более компактное)
	const numberFieldStyles = {
		...styles.textField,
		'& .MuiOutlinedInput-root': {
			minHeight: '48px', // Значительно меньше обычного (было 56px)
			maxWidth: '100%',
		},
		'& .MuiInputBase-input': {
			padding: '10px 12px', // Еще более уменьшенные отступы
			fontSize: '0.9rem', // Меньший шрифт
			textAlign: 'left', // Выравнивание по левому краю
		},
		'& .MuiInputLabel-root': {
			fontSize: '0.85rem', // Еще меньший размер label
			transform: 'translate(12px, 14px) scale(1)', // Корректируем позицию
			'&.Mui-focused, &.MuiFormLabel-filled': {
				transform: 'translate(12px, -9px) scale(0.75)',
			},
		},
		'& .MuiFormHelperText-root': {
			fontSize: '0.75rem', // Меньший размер текста помощи
			marginTop: '4px',
		},
		// Дополнительное сжатие для compact режима
		...(compact && {
			'& .MuiOutlinedInput-root': {
				minHeight: '42px', // Еще меньше в compact режиме
			},
			'& .MuiInputBase-input': {
				padding: '8px 10px', // Минимальные отступы
				fontSize: '0.85rem',
			},
		}),
	}

	return (
		<TextField
			fullWidth
			id={field.name}
			name={field.name}
			label={field.label}
			type='number'
			margin='dense' // Всегда используем dense для числовых полей
			value={localValue}
			onChange={e => {
				setLocalValue(e.target.value)
				setIsTyping(true)
			}}
			required={field.required}
			error={!!error}
			helperText={error}
			placeholder={field.placeholder || ''}
			size='small' // Всегда используем размер small для числовых полей
			sx={numberFieldStyles}
			variant='outlined'
		/>
	)
}
