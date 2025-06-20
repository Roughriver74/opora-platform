import React from 'react'
import {
	FormControl,
	InputLabel,
	Select,
	MenuItem,
	FormHelperText,
} from '@mui/material'
import { FieldInputProps } from '../../types'

export const SelectInput: React.FC<FieldInputProps> = ({
	field,
	value,
	onChange,
	error,
	compact = false,
	options = [],
}) => {
	return (
		<FormControl
			fullWidth
			margin={compact ? 'dense' : 'normal'}
			error={!!error}
			size={compact ? 'small' : 'medium'}
		>
			<InputLabel id={`${field.name}-label`}>{field.label}</InputLabel>
			<Select
				labelId={`${field.name}-label`}
				id={field.name}
				name={field.name}
				value={value || ''}
				onChange={e => onChange(field.name, e.target.value)}
				label={field.label}
				required={field.required}
			>
				<MenuItem value=''>
					<em>Не выбрано</em>
				</MenuItem>
				{options.map(option => (
					<MenuItem key={option.value} value={option.value}>
						{option.label}
					</MenuItem>
				))}
			</Select>
			{error && <FormHelperText>{error}</FormHelperText>}
		</FormControl>
	)
}
