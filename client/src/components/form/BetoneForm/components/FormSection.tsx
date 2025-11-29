import React, { useState, useMemo } from 'react'
import {
	Box,
	Typography,
	Divider,
	IconButton,
	TextField,
	Tooltip,
	useTheme,
	useMediaQuery,
	Dialog,
	DialogTitle,
	DialogContent,
	DialogActions,
	Button,
} from '@mui/material'
import { Edit, Save, Cancel, ClearAll } from '@mui/icons-material'
import FormField from '../../FormField'
import { FormSection as FormSectionType } from '../types'
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
	showCopyButton?: boolean
	onClearSection?: (sectionIndex: number) => void
	sectionIndex?: number
}

export const FormSection: React.FC<FormSectionProps> = React.memo(
	({
		section,
		values,
		onFieldChange,
		getFieldError,
		compact = false,
		showTitle = true,
		preloadedOptions,
		isAdminMode = false,
		onSectionTitleChange,
		showCopyButton = false,
		onClearSection,
		sectionIndex,
	}) => {
		const theme = useTheme()
		const isMobile = useMediaQuery(theme.breakpoints.down('sm'))

		const [isEditingTitle, setIsEditingTitle] = useState(false)
		const [tempTitle, setTempTitle] = useState(section.title)
		const [showClearConfirm, setShowClearConfirm] = useState(false)

		const handleStartEditing = () => {
			setTempTitle(section.title)
			setIsEditingTitle(true)
		}

		const handleSaveTitle = () => {
			if (
				onSectionTitleChange &&
				section.id &&
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

		const handleClearSection = () => {
			if (onClearSection && sectionIndex !== undefined) {
				onClearSection(sectionIndex)
				setShowClearConfirm(false)
			}
		}

		const handleClearConfirm = () => {
			setShowClearConfirm(true)
		}

		const handleClearCancel = () => {
			setShowClearConfirm(false)
		}

		// Мемоизированные отступы для полей
		const fieldSpacing = useMemo(() => {
			if (isMobile) {
				return FORM_CONSTANTS.MOBILE_FIELD_SPACING.xs
			}
			return compact
				? FORM_CONSTANTS.FIELD_SPACING.xs
				: FORM_CONSTANTS.FIELD_SPACING.sm
		}, [isMobile, compact])

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
								{onClearSection && sectionIndex !== undefined && (
									<Tooltip title='Очистить раздел'>
										<IconButton
											onClick={handleClearConfirm}
											size='small'
											color='warning'
										>
											<ClearAll />
										</IconButton>
									</Tooltip>
								)}
							</Box>
						)}
						<Divider sx={{ mb: isMobile ? 1.5 : 2 }} />
					</Box>
				)}

				{/* Поля секции */}
				{section.fields?.map(field => (
					<Box
						key={field._id || field.name}
						sx={{
							mb: fieldSpacing,
						}}
					>
						<FormField
							field={field}
							value={values[field.name]}
							onChange={onFieldChange}
							error={getFieldError(field.name)}
							compact={compact || isMobile}
							isMobile={isMobile}
							preloadedOptions={preloadedOptions?.[field.name]}
							showCopyButton={showCopyButton}
						/>
					</Box>
				))}

				{/* Диалог подтверждения очистки */}
				<Dialog
					open={showClearConfirm}
					onClose={handleClearCancel}
					maxWidth='sm'
					fullWidth
				>
					<DialogTitle>Подтверждение очистки</DialogTitle>
					<DialogContent>
						<Typography>
							Вы уверены, что хотите очистить все поля в разделе "
							{section.title}"? Это действие нельзя отменить.
						</Typography>
					</DialogContent>
					<DialogActions>
						<Button onClick={handleClearCancel} color='primary'>
							Отмена
						</Button>
						<Button
							onClick={handleClearSection}
							color='warning'
							variant='contained'
						>
							Очистить
						</Button>
					</DialogActions>
				</Dialog>
			</Box>
		)
	},
	(prevProps, nextProps) => {
		// Кастомная функция сравнения для оптимизации React.memo
		return (
			prevProps.section.title === nextProps.section.title &&
			JSON.stringify(prevProps.values) === JSON.stringify(nextProps.values) &&
			prevProps.compact === nextProps.compact &&
			prevProps.showTitle === nextProps.showTitle &&
			prevProps.isAdminMode === nextProps.isAdminMode &&
			prevProps.showCopyButton === nextProps.showCopyButton &&
			prevProps.sectionIndex === nextProps.sectionIndex &&
			prevProps.onClearSection === nextProps.onClearSection &&
			JSON.stringify(prevProps.preloadedOptions) ===
				JSON.stringify(nextProps.preloadedOptions)
		)
	}
)
