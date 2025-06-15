import React, { useState } from 'react'
import {
	Box,
	Typography,
	Divider,
	IconButton,
	TextField,
	Tooltip,
} from '@mui/material'
import { Edit, Save, Cancel } from '@mui/icons-material'
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
	isAdminMode?: boolean
	onSectionTitleChange?: (sectionId: string, newTitle: string) => void
}

export const FormSection: React.FC<FormSectionProps> = ({
	section,
	values,
	onFieldChange,
	getFieldError,
	compact = false,
	showTitle = true,
	preloadedOptions,
	isAdminMode = false,
	onSectionTitleChange,
}) => {
	const [isEditingTitle, setIsEditingTitle] = useState(false)
	const [tempTitle, setTempTitle] = useState(section.title)

	const handleStartEditing = () => {
		setTempTitle(section.title)
		setIsEditingTitle(true)
	}

	const handleSaveTitle = () => {
		if (
			onSectionTitleChange &&
			tempTitle.trim() &&
			tempTitle !== section.title
		) {
			onSectionTitleChange(section.id || '', tempTitle.trim())
		}
		setIsEditingTitle(false)
	}

	const handleCancelEditing = () => {
		setTempTitle(section.title)
		setIsEditingTitle(false)
	}

	const handleKeyPress = (event: React.KeyboardEvent) => {
		if (event.key === 'Enter') {
			handleSaveTitle()
		} else if (event.key === 'Escape') {
			handleCancelEditing()
		}
	}

	if (!section || !section.fields || section.fields.length === 0) {
		return null
	}

	return (
		<Box sx={{ mb: FORM_CONSTANTS.SECTION_SPACING }}>
			{showTitle && (
				<>
					<Box
						sx={{
							display: 'flex',
							alignItems: 'center',
							mb: 2,
							gap: 1,
						}}
					>
						{isEditingTitle && isAdminMode ? (
							<Box
								sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}
							>
								<TextField
									value={tempTitle}
									onChange={e => setTempTitle(e.target.value)}
									onKeyDown={handleKeyPress}
									variant='outlined'
									size='small'
									autoFocus
									fullWidth
									sx={{
										'& .MuiOutlinedInput-root': {
											fontSize: '1.25rem',
											fontWeight: 600,
											color: 'primary.main',
										},
									}}
								/>
								<Tooltip title='Сохранить'>
									<IconButton
										onClick={handleSaveTitle}
										color='primary'
										size='small'
									>
										<Save />
									</IconButton>
								</Tooltip>
								<Tooltip title='Отменить'>
									<IconButton
										onClick={handleCancelEditing}
										color='secondary'
										size='small'
									>
										<Cancel />
									</IconButton>
								</Tooltip>
							</Box>
						) : (
							<>
								<Typography
									variant='h6'
									component='h3'
									sx={{
										color: 'primary.main',
										fontWeight: 600,
										flex: 1,
									}}
								>
									{section.title}
								</Typography>
								{isAdminMode && (
									<Tooltip title='Редактировать название раздела'>
										<IconButton
											onClick={handleStartEditing}
											size='small'
											sx={{
												opacity: 0.7,
												'&:hover': { opacity: 1 },
											}}
										>
											<Edit fontSize='small' />
										</IconButton>
									</Tooltip>
								)}
							</>
						)}
					</Box>
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
