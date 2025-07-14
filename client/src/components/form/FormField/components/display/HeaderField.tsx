import React from 'react'
import { Typography } from '@mui/material'
import { FormField as FormFieldType } from '../../../../../types'

interface HeaderFieldProps {
	field: FormFieldType
	compact?: boolean
}

export const HeaderField: React.FC<HeaderFieldProps> = ({
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
				fontWeight: 'bold',
			}}
		>
			{field.label}
		</Typography>
	)
}
