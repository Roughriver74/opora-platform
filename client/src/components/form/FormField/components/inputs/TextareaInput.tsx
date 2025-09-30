import React, { useCallback, useMemo } from 'react'
import { TextField, Box } from '@mui/material'
import { FieldInputProps } from '../../types'
import { getFieldStyles } from '../../utils/fieldStyles'
import { FIELD_CONSTANTS } from '../../constants'
import { CopyButton } from '../CopyButton'

export const TextareaInput: React.FC<FieldInputProps> = React.memo(
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
				onChange(field.name, e.target.value)
			},
			[field.name, onChange]
		)

		// Мемоизируем количество строк
		const rows = useMemo(() => {
			if (isMobile) {
				return FIELD_CONSTANTS.MOBILE_TEXTAREA_ROWS
			}
			return compact
				? FIELD_CONSTANTS.COMPACT_TEXTAREA_ROWS
				: FIELD_CONSTANTS.DEFAULT_TEXTAREA_ROWS
		}, [isMobile, compact])

		return (
			<Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
				<TextField
					fullWidth
					id={field.name}
					name={field.name}
					label={field.label}
					multiline
					rows={rows}
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
