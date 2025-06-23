import React from 'react'
import { Select, MenuItem, FormControl, SelectChangeEvent } from '@mui/material'
import { FormField } from '../../../../types'

interface SectionSelectorProps {
	field: FormField
	sections: FormField[]
	onSectionChange: (fieldId: string, sectionId: string | null) => void
}

export const SectionSelector: React.FC<SectionSelectorProps> = ({
	field,
	sections,
	onSectionChange,
}) => {
	const handleChange = (event: SelectChangeEvent<string>) => {
		const newSectionId = event.target.value || null
		onSectionChange(field._id!, newSectionId)
	}

	return (
		<FormControl size='small' fullWidth>
			<Select
				value={field.sectionId || ''}
				onChange={handleChange}
				displayEmpty
				variant='standard'
				sx={{
					fontSize: '0.875rem',
					'& .MuiSelect-select': {
						paddingY: 1,
					},
				}}
			>
				<MenuItem value=''>
					<em style={{ color: '#666' }}>Без раздела</em>
				</MenuItem>
				{sections.map(section => (
					<MenuItem key={section._id} value={section._id}>
						🏷️ {section.label || 'Без названия'}
					</MenuItem>
				))}
			</Select>
		</FormControl>
	)
}
