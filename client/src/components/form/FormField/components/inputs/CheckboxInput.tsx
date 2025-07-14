import React from 'react'
import { FormControlLabel, Checkbox } from '@mui/material'
import { FieldInputProps } from '../../types'

export const CheckboxInput: React.FC<FieldInputProps> = ({
	field,
	value,
	onChange,
	compact = false,
	isMobile = false,
}) => {
	return (
		<FormControlLabel
			control={
				<Checkbox
					checked={Boolean(value)}
					onChange={e => onChange(field.name, e.target.checked)}
					name={field.name}
					size={isMobile ? 'small' : compact ? 'small' : 'medium'}
				/>
			}
			label={field.label}
			sx={{
				'& .MuiFormControlLabel-label': {
					fontSize: isMobile ? '0.8rem' : compact ? '0.875rem' : '1rem',
				},
				margin: isMobile ? '4px 0' : compact ? '6px 0' : '8px 0',
			}}
		/>
	)
}
