import React, { useCallback } from 'react'
import { TextField, Box } from '@mui/material'
import { FieldInputProps } from '../../types'
import { getFieldStyles } from '../../utils/fieldStyles'
import { CopyButton } from '../CopyButton'

export const NumberInput: React.FC<FieldInputProps> = React.memo(
	({
		field,
		value,
		onChange,
		error,
		compact = false,
		isMobile = false,
		showCopyButton = false,
	}) => {
		const styles = getFieldStyles(compact, isMobile)

		// Оптимизированный обработчик изменений - без debounce для мгновенного отклика
		const handleChange = useCallback(
			(e: React.ChangeEvent<HTMLInputElement>) => {
				const numValue =
					e.target.value === '' ? '' : parseFloat(e.target.value) || 0
				onChange(field.name, numValue)
			},
			[field.name, onChange]
		)

		return (
			<Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
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
				{showCopyButton && (
					<CopyButton value={value} compact={compact} isMobile={isMobile} />
				)}
			</Box>
		)
	}
)
