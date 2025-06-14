import React from 'react'
import { Typography } from '@mui/material'
import { FieldInputProps } from '../../types'

export const HeaderField: React.FC<FieldInputProps> = ({
	field,
	compact = false,
}) => {
	return (
		<Typography
			variant={compact ? 'h6' : 'h5'}
			component='h3'
			gutterBottom
			style={{
				marginTop: compact ? '12px' : '16px',
				marginBottom: compact ? '8px' : '12px',
				fontWeight: 'bold'
				
			}}
		>
			{field.label}
		</Typography>
	)
}
