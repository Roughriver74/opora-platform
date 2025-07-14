import React from 'react'
import {
	FormControl,
	InputLabel,
	Select,
	MenuItem,
	FormHelperText,
} from '@mui/material'
import { FieldInputProps } from '../../types'
import { getFieldStyles } from '../../utils/fieldStyles'

export const SelectInput: React.FC<FieldInputProps> = ({
	field,
	value,
	onChange,
	error,
	compact = false,
	isMobile = false,
	options = [],
}) => {
	const styles = getFieldStyles(compact, isMobile)

	return (
		<FormControl
			fullWidth
			margin={compact || isMobile ? 'dense' : 'normal'}
			size={isMobile ? 'small' : compact ? 'small' : 'medium'}
			error={!!error}
			sx={styles.textField}
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
