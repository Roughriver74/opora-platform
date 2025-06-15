import React from 'react'
import { Box, Typography, Divider } from '@mui/material'
import FormField from '../../FormField'
import { FormSection as FormSectionType } from '../types'
import { FormField as FormFieldType } from '../../../../types'
import { FORM_CONSTANTS } from '../constants'

interface FormSectionProps {
	section: FormSectionType
	values: Record<string, any>
	onFieldChange: (name: string, value: any) => void
	getFieldError: (fieldName: string) => string | undefined
	compact?: boolean
	showTitle?: boolean
	preloadedOptions?: Record<string, any[]>
}

export const FormSection: React.FC<FormSectionProps> = ({
	section,
	values,
	onFieldChange,
	getFieldError,
	compact = false,
	showTitle = true,
	preloadedOptions,
}) => {
	if (!section || !section.fields || section.fields.length === 0) {
		return null
	}

	return (
		<Box sx={{ mb: FORM_CONSTANTS.SECTION_SPACING }}>
			{showTitle && (
				<>
					<Typography
						variant='h6'
						component='h3'
						gutterBottom
						sx={{
							mb: 2,
							color: 'primary.main',
							fontWeight: 600,
							backgroundColor: 'rgb(255, 0, 0)',
						}}
					>
						{section.title}
					</Typography>
					<Divider sx={{ mb: 3 }} />
				</>
			)}

			{section.fields
				.sort((a, b) => (a.order || 0) - (b.order || 0))
				.map((field: FormFieldType) => (
					<Box
						key={field._id || field.name}
						sx={{ mb: FORM_CONSTANTS.FIELD_SPACING }}
					>
						<FormField
							field={field}
							value={values[field.name]}
							onChange={onFieldChange}
							error={getFieldError(field.name)}
							compact={compact}
							preloadedOptions={preloadedOptions?.[field.name]}
						/>
					</Box>
				))}
		</Box>
	)
}
