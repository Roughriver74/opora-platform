import React, { useCallback } from 'react'
import { TextField } from '@mui/material'
import { FieldInputProps } from '../../types'
import { getFieldStyles } from '../../utils/fieldStyles'

export const NumberInput: React.FC<FieldInputProps> = React.memo(({
	field,
	value,
	onChange,
	error,
	compact = false,
	isMobile = false,
}) => {
	const styles = getFieldStyles(compact, isMobile)

	// Оптимизированный обработчик изменений - без debounce для мгновенного отклика
	const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
		const numValue = e.target.value === '' ? '' : parseFloat(e.target.value) || 0
		onChange(field.name, numValue)
	}, [field.name, onChange])

	return (
		<TextField
			fullWidth
			id={field.name}
			name={field.name}
			label={field.label}
			type='number'
			margin={compact || isMobile ? 'dense' : 'normal'}
			size={isMobile ? 'small' : compact ? 'small' : 'medium'}
			value={value || ''}
			onChange={handleChange}
			error={!!error}
			helperText={error}
			required={field.required}
			sx={styles.textField}
		/>
	)
})
