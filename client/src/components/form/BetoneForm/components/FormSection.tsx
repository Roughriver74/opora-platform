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

			{/* Рендеринг полей с группировкой числовых */}
			{(() => {
				const sortedFields = section.fields.sort((a, b) => (a.order || 0) - (b.order || 0))
				const groupedElements: React.ReactNode[] = []
				let i = 0

				while (i < sortedFields.length) {
					const currentField = sortedFields[i]
					
					// Если текущее поле числовое, собираем все подряд идущие числовые поля
					if (currentField.type === 'number') {
						const consecutiveNumberFields: FormFieldType[] = []
						let j = i
						
						// Собираем все подряд идущие числовые поля
						while (j < sortedFields.length && sortedFields[j].type === 'number') {
							consecutiveNumberFields.push(sortedFields[j])
							j++
						}
						
						// Группируем числовые поля по 2 в ряд
						for (let k = 0; k < consecutiveNumberFields.length; k += 2) {
							const field1 = consecutiveNumberFields[k]
							const field2 = consecutiveNumberFields[k + 1]
							
							if (field2) {
								// Пара числовых полей
								groupedElements.push(
									<Box
										key={`number-group-${k}`}
										sx={{
											mb: FORM_CONSTANTS.FIELD_SPACING,
											display: 'flex',
											gap: 1.5,
											'& > div': {
												flex: '0 1 calc(50% - 6px)',
												minWidth: 0,
											},
										}}
									>
										<Box>
											<FormField
												field={field1}
												value={values[field1.name]}
												onChange={onFieldChange}
												error={getFieldError(field1.name)}
												compact={true}
												preloadedOptions={preloadedOptions?.[field1.name]}
											/>
										</Box>
										<Box>
											<FormField
												field={field2}
												value={values[field2.name]}
												onChange={onFieldChange}
												error={getFieldError(field2.name)}
												compact={true}
												preloadedOptions={preloadedOptions?.[field2.name]}
											/>
										</Box>
									</Box>
								)
							} else {
								// Одиночное числовое поле (нечетное)
								groupedElements.push(
									<Box
										key={field1._id || field1.name}
										sx={{
											mb: FORM_CONSTANTS.FIELD_SPACING,
											maxWidth: '300px',
										}}
									>
										<FormField
											field={field1}
											value={values[field1.name]}
											onChange={onFieldChange}
											error={getFieldError(field1.name)}
											compact={true}
											preloadedOptions={preloadedOptions?.[field1.name]}
										/>
									</Box>
								)
							}
						}
						
						// Переходим к следующему не-числовому полю
						i = j
					} else {
						// Обычное не-числовое поле
						groupedElements.push(
							<Box
								key={currentField._id || currentField.name}
								sx={{ mb: FORM_CONSTANTS.FIELD_SPACING }}
							>
								<FormField
									field={currentField}
									value={values[currentField.name]}
									onChange={onFieldChange}
									error={getFieldError(currentField.name)}
									compact={compact}
									preloadedOptions={preloadedOptions?.[currentField.name]}
								/>
							</Box>
						)
						i += 1
					}
				}

				return groupedElements
			})()}
		</Box>
	)
}
