import React, { useState } from 'react'
import {
	Box,
	Typography,
	Divider,
	IconButton,
	TextField,
	Tooltip,
	useTheme,
	useMediaQuery,
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
	const theme = useTheme()
	const isMobile = useMediaQuery(theme.breakpoints.down('sm'))

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
			tempTitle.trim() !== section.title
		) {
			onSectionTitleChange(section.id, tempTitle.trim())
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

	// Определяем отступы для полей
	const getFieldSpacing = () => {
		if (isMobile) {
			return FORM_CONSTANTS.MOBILE_FIELD_SPACING.xs
		}
		return compact
			? FORM_CONSTANTS.FIELD_SPACING.xs
			: FORM_CONSTANTS.FIELD_SPACING.sm
	}

	return (
		<Box>
			{/* Заголовок секции */}
			{showTitle && (
				<Box sx={{ mb: isMobile ? 1 : 2 }}>
					{isEditingTitle ? (
						<Box
							sx={{
								display: 'flex',
								alignItems: 'center',
								gap: 1,
								mb: 1,
							}}
						>
							<TextField
								value={tempTitle}
								onChange={e => setTempTitle(e.target.value)}
								onKeyDown={handleKeyPress}
								size='small'
								fullWidth
								autoFocus
								variant='outlined'
								sx={{
									'& .MuiOutlinedInput-root': {
										fontSize: isMobile ? '0.95rem' : '1.1rem',
									},
								}}
							/>
							<Tooltip title='Сохранить'>
								<IconButton
									onClick={handleSaveTitle}
									size='small'
									color='primary'
								>
									<Save />
								</IconButton>
							</Tooltip>
							<Tooltip title='Отменить'>
								<IconButton
									onClick={handleCancelEditing}
									size='small'
									color='secondary'
								>
									<Cancel />
								</IconButton>
							</Tooltip>
						</Box>
					) : (
						<Box
							sx={{
								display: 'flex',
								alignItems: 'center',
								gap: 1,
								mb: isMobile ? 1 : 2,
							}}
						>
							<Typography
								variant={isMobile ? 'h6' : 'h5'}
								component='h2'
								sx={{
									fontWeight: 600,
									color: 'text.primary',
									flex: 1,
									fontSize: isMobile ? '1rem' : '1.25rem',
								}}
							>
								{section.title}
							</Typography>
							{isAdminMode && (
								<Tooltip title='Редактировать название секции'>
									<IconButton
										onClick={handleStartEditing}
										size='small'
										color='primary'
									>
										<Edit />
									</IconButton>
								</Tooltip>
							)}
						</Box>
					)}
					<Divider sx={{ mb: isMobile ? 1.5 : 2 }} />
				</Box>
			)}

			{/* Поля секции */}
			{(() => {
				const groupedElements: React.ReactNode[] = []
				const fields = section.fields || []
				let i = 0

				while (i < fields.length) {
					const currentField = fields[i]

					// Проверяем, является ли поле числовым
					if (currentField.type === 'number') {
						// Собираем все подряд идущие числовые поля
						const numberFields = []
						let j = i
						while (j < fields.length && fields[j].type === 'number') {
							numberFields.push(fields[j])
							j++
						}

						// Группируем числовые поля по 2 в ряд только на десктопе
						if (!isMobile && numberFields.length > 1) {
							for (let k = 0; k < numberFields.length; k += 2) {
								const field1 = numberFields[k]
								const field2 = numberFields[k + 1]

								if (field2) {
									// Пара числовых полей
									groupedElements.push(
										<Box
											key={`${field1._id}-${field2._id}`}
											sx={{
												display: 'flex',
												gap: 2,
												mb: getFieldSpacing(),
											}}
										>
											<Box sx={{ flex: 1 }}>
												<FormField
													field={field1}
													value={values[field1.name]}
													onChange={onFieldChange}
													error={getFieldError(field1.name)}
													compact={true}
													isMobile={isMobile}
													preloadedOptions={preloadedOptions?.[field1.name]}
												/>
											</Box>
											<Box sx={{ flex: 1 }}>
												<FormField
													field={field2}
													value={values[field2.name]}
													onChange={onFieldChange}
													error={getFieldError(field2.name)}
													compact={true}
													isMobile={isMobile}
													preloadedOptions={preloadedOptions?.[field2.name]}
												/>
											</Box>
										</Box>
									)
								} else {
									// Одиночное числовое поле
									groupedElements.push(
										<Box
											key={field1._id || field1.name}
											sx={{
												mb: getFieldSpacing(),
												maxWidth: isMobile ? '100%' : '300px',
											}}
										>
											<FormField
												field={field1}
												value={values[field1.name]}
												onChange={onFieldChange}
												error={getFieldError(field1.name)}
												compact={true}
												isMobile={isMobile}
												preloadedOptions={preloadedOptions?.[field1.name]}
											/>
										</Box>
									)
								}
							}
						} else {
							// На мобильных все поля в одну колонку
							numberFields.forEach(field => {
								groupedElements.push(
									<Box
										key={field._id || field.name}
										sx={{
											mb: getFieldSpacing(),
											maxWidth: isMobile ? '100%' : '300px',
										}}
									>
										<FormField
											field={field}
											value={values[field.name]}
											onChange={onFieldChange}
											error={getFieldError(field.name)}
											compact={true}
											isMobile={isMobile}
											preloadedOptions={preloadedOptions?.[field.name]}
										/>
									</Box>
								)
							})
						}

						// Переходим к следующему не-числовому полю
						i = j
					} else {
						// Обычное не-числовое поле
						groupedElements.push(
							<Box
								key={currentField._id || currentField.name}
								sx={{ mb: getFieldSpacing() }}
							>
								<FormField
									field={currentField}
									value={values[currentField.name]}
									onChange={onFieldChange}
									error={getFieldError(currentField.name)}
									compact={compact}
									isMobile={isMobile}
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
