import React from 'react'
import {
	FormControl,
	InputLabel,
	Select,
	MenuItem,
	FormHelperText,
	Box,
} from '@mui/material'
import { FieldInputProps } from '../../types'
import { getFieldStyles } from '../../utils/fieldStyles'
import { CopyButton } from '../CopyButton'

export const SelectInput: React.FC<FieldInputProps> = ({
	field,
	value,
	onChange,
	error,
	compact = false,
	isMobile = false,
	options = [],
	showCopyButton = false,
}) => {
	const styles = getFieldStyles(compact, isMobile)

	return (
		<Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
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
			{showCopyButton && (
				<CopyButton value={value} compact={compact} isMobile={isMobile} />
			)}
		</Box>
	)
}
