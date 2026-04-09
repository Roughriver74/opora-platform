import React from 'react'
import { Box, Grid, TextField, Typography } from '@mui/material'

interface CompositeFieldProps {
	fieldName: string
	fieldValue: string
	displayName: string
	isRequired?: boolean
	isDisabled?: boolean
	onChange: (fieldName: string, value: any) => void
	compositeSettings?: {
		field1_name: string
		field2_name: string
		separator: string
	}
}

/**
 * Компонент для отображения составного поля, разделенного на две части
 */
export const CompositeField: React.FC<CompositeFieldProps> = ({
	fieldName,
	fieldValue,
	displayName,
	isRequired = false,
	isDisabled = false,
	onChange,
	compositeSettings = {
		field1_name: 'ФИО',
		field2_name: 'Инфо',
		separator: ':',
	},
}) => {
	// Удаляем ведущий '>' для отображения в полях ввода
	let field1Value = ''
	let field2Value = ''

	if (fieldValue && typeof fieldValue === 'string') {
		const cleanValue = fieldValue.startsWith('>')
			? fieldValue.slice(1)
			: fieldValue
		const parts = cleanValue.split(compositeSettings.separator)
		field1Value = parts[0] || ''
		field2Value = parts[1] || ''
	}

	// Функция для объединения значений и обновления формы с добавлением ровно одного '>'
	const updateCompositeValue = (part1: string, part2: string) => {
		let combinedValue = `${part1}${compositeSettings.separator}${part2}`
		// Удаляем все ведущие '>' и добавляем ровно один
		combinedValue = '>' + combinedValue.replace(/^>+/, '')
		onChange(fieldName, combinedValue)
	}

	return (
		<Box sx={{ mb: 2 }}>
			<Typography variant='subtitle2' sx={{ mb: 2 }}></Typography>
			<Grid container spacing={2}>
				<Grid item xs={12} md={6}>
					<TextField
						fullWidth
						label={compositeSettings.field1_name}
						name={`${fieldName}_part1`}
						value={field1Value}
						onChange={e => updateCompositeValue(e.target.value, field2Value)}
						required={isRequired}
						size='small'
						disabled={isDisabled}
					/>
				</Grid>
				<Grid item xs={12} md={6}>
					<TextField
						fullWidth
						label={compositeSettings.field2_name}
						name={`${fieldName}_part2`}
						value={field2Value}
						onChange={e => updateCompositeValue(field1Value, e.target.value)}
						size='small'
						disabled={isDisabled}
					/>
				</Grid>
			</Grid>
		</Box>
	)
}
