import React from 'react'
import { FormControl, InputLabel, Select, MenuItem, Box } from '@mui/material'

interface SectionSelectorProps {
	sections: string[]
	selectedSection: string
	onSectionChange: (section: string) => void
}

export const SectionSelector: React.FC<SectionSelectorProps> = ({
	sections,
	selectedSection,
	onSectionChange,
}) => {
	return (
		<Box sx={{ mb: 3 }}>
			<FormControl size='small' sx={{ minWidth: 200 }}>
				<InputLabel>Фильтр по секции</InputLabel>
				<Select
					value={selectedSection}
					onChange={e => onSectionChange(e.target.value)}
					label='Фильтр по секции'
				>
					<MenuItem value=''>
						<em>Все секции</em>
					</MenuItem>
					{sections.map(section => (
						<MenuItem key={section} value={section}>
							{section}
						</MenuItem>
					))}
				</Select>
			</FormControl>
		</Box>
	)
}
