import React, { useRef, useState, useMemo, useCallback } from 'react'
import {
	Box,
	Paper,
	Typography,
	Button,
	Alert,
	Snackbar,
	IconButton,
	Tooltip,
	Chip,
	Stack,
	Collapse,
	useTheme,
	useMediaQuery,
	Fade,
} from '@mui/material'
import {
	ExpandMore as ExpandMoreIcon,
	ExpandLess as ExpandLessIcon,
	Edit,
	Save,
	Cancel,
	TouchApp as TouchIcon,
	Speed as SpeedIcon,
} from '@mui/icons-material'
import { BetoneFormProps } from '../types'
import { useBetoneForm } from '../hooks/useBetoneForm'
import { getSortedFields } from '../utils/sectionHelpers'
import { FormSection } from './FormSection'
import { SubmitButton } from './SubmitButton'
import { ScrollToTopButton } from './ScrollToTopButton'
import { FormResult } from './FormResult'

import { LinkedFields } from '../../LinkedFields'
import { FormFieldService } from '../../../../services/formFieldService'

// Мобильные константы
const MOBILE_CONSTANTS = {
	HEADER_HEIGHT: 56,
	FORM_PADDING: { xs: 2, sm: 3 },
	SECTION_SPACING: { xs: 1, sm: 2 },
	COMPACT_BREAKPOINT: 'sm',
	TOUCH_TARGET_SIZE: 44, // минимальный размер для touch
	ANIMATION_DURATION: 200,
}

const MobileBetoneForm: React.FC<BetoneFormProps> = ({
	form,
	fields,
	editData,
	preloadedOptions,
	isAdminMode = false,
	onFieldUpdate,
}) => {
	const theme = useTheme()
	const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
	const isTablet = useMediaQuery(theme.breakpoints.down('md'))
	const formRef = useRef<HTMLDivElement>(null)

	const [snackbar, setSnackbar] = useState<{
		open: boolean
		message: string
		severity?: 'success' | 'error'
	}>({
		open: false,
		message: '',
	})

	// Состояние для редактирования заголовков
	const [editingSection, setEditingSection] = useState<number | null>(null)
	const [tempTitle, setTempTitle] = useState('')

	// Хук основной логики формы
	const {
		formik,
		submitting,
		submitResult,
		fieldSections,
		useSectionMode,
		expandedSections,
		showScrollTop,
		isSectionExpanded,
		toggleSectionExpanded,
		expandAllSections,
		collapseAllSections,
		scrollToTop,
		resetForm,
		getFieldError,
		handleFieldChange,
	} = useBetoneForm(form._id ?? '', fields, editData, preloadedOptions)

	// Мемоизированные вычисления для производительности
	const sortedFields = useMemo(() => getSortedFields(fields), [fields])

	const mobileBreakpoints = useMemo(
		() => ({
			padding: isMobile ? 1 : isTablet ? 2 : 3,
			spacing: isMobile ? 1 : 2,
			fontSize: isMobile ? 'body2' : 'body1',
		}),
		[isMobile, isTablet]
	)

	// Оптимизированные обработчики событий
	const handleSectionTitleChange = useCallback(
		async (sectionId: string, newTitle: string) => {
			try {
				// Находим поле-заголовок и обновляем его
				const headerField = fields.find(
					f => f.type === 'header' && f._id === sectionId
				)

				if (headerField && headerField._id) {
					await FormFieldService.updateField(headerField._id, {
						...headerField,
						label: newTitle,
					})

					setSnackbar({
						open: true,
						message: 'Заголовок раздела обновлен',
						severity: 'success',
					})
				}
			} catch (error) {
				setSnackbar({
					open: true,
					message: 'Ошибка при обновлении заголовка',
					severity: 'error',
				})
			}
		},
		[fields]
	)

	const handleStartEditingAccordion = useCallback(
		(index: number, currentTitle: string, event: React.MouseEvent) => {
			event.stopPropagation()
			setEditingSection(index)
			setTempTitle(currentTitle)
		},
		[]
	)

	const handleSaveAccordionTitle = useCallback(
		async (section: any, index: number, event?: React.MouseEvent) => {
			if (event) event.stopPropagation()

			if (tempTitle.trim() && tempTitle !== section.title) {
				const headerField = section.fields.find((f: any) => f.type === 'header')
				if (headerField?._id) {
					await handleSectionTitleChange(headerField._id, tempTitle.trim())
				}
			}

			setEditingSection(null)
			setTempTitle('')
		},
		[tempTitle, handleSectionTitleChange]
	)

	const handleCancelEditingAccordion = useCallback(
		(event?: React.MouseEvent) => {
			if (event) event.stopPropagation()
			setEditingSection(null)
			setTempTitle('')
		},
		[]
	)

	// Мобильная версия секционных кнопок
	const renderMobileSectionControls = useCallback(
		() => (
			<Stack
				direction={isMobile ? 'column' : 'row'}
				spacing={1}
				sx={{ mb: mobileBreakpoints.spacing }}
			>
				<Button
					size={isMobile ? 'medium' : 'small'}
					variant='outlined'
					onClick={expandAllSections}
					fullWidth={isMobile}
					startIcon={<ExpandMoreIcon />}
					sx={{
						minHeight: MOBILE_CONSTANTS.TOUCH_TARGET_SIZE,
						fontSize: mobileBreakpoints.fontSize,
					}}
				>
					Развернуть все
				</Button>
				<Button
					size={isMobile ? 'medium' : 'small'}
					variant='outlined'
					onClick={collapseAllSections}
					fullWidth={isMobile}
					startIcon={<ExpandLessIcon />}
					sx={{
						minHeight: MOBILE_CONSTANTS.TOUCH_TARGET_SIZE,
						fontSize: mobileBreakpoints.fontSize,
					}}
				>
					Свернуть все
				</Button>
			</Stack>
		),
		[isMobile, mobileBreakpoints, expandAllSections, collapseAllSections]
	)

	// Мобильная версия секций
	const renderMobileSections = useCallback(
		() => (
			<Box sx={{ p: mobileBreakpoints.padding }}>
				{renderMobileSectionControls()}

				{fieldSections.map((section, index) => {
					const isExpanded = isSectionExpanded(index)
					const isEditing = editingSection === index

					return (
						<Paper
							key={index}
							elevation={isMobile ? 1 : 2}
							sx={{
								mb: mobileBreakpoints.spacing,
								overflow: 'hidden',
								borderRadius: isMobile ? 1 : 2,
							}}
						>
							{/* Заголовок секции */}
							<Box
								onClick={() => !isEditing && toggleSectionExpanded(index)}
								sx={{
									p: mobileBreakpoints.padding,
									bgcolor: isExpanded ? 'primary.light' : 'grey.50',
									cursor: isEditing ? 'default' : 'pointer',
									display: 'flex',
									alignItems: 'center',
									minHeight: MOBILE_CONSTANTS.TOUCH_TARGET_SIZE,
									transition: 'background-color 0.2s ease',
									'&:hover': !isEditing
										? {
												bgcolor: isExpanded ? 'primary.main' : 'grey.100',
										  }
										: {},
								}}
							>
								{isEditing && isAdminMode ? (
									<Stack
										direction='row'
										spacing={1}
										alignItems='center'
										sx={{ flex: 1 }}
										onClick={e => e.stopPropagation()}
									>
										<Typography
											component='input'
											value={tempTitle}
											onChange={(e: any) => setTempTitle(e.target.value)}
											onKeyDown={(e: any) => {
												if (e.key === 'Enter') {
													handleSaveAccordionTitle(section, index)
												} else if (e.key === 'Escape') {
													handleCancelEditingAccordion()
												}
											}}
											autoFocus
											sx={{
												border: 'none',
												outline: 'none',
												background: 'transparent',
												fontSize: isMobile ? '1.1rem' : '1.25rem',
												fontWeight: 600,
												flex: 1,
												color: 'inherit',
											}}
										/>
										<IconButton
											size='small'
											onClick={e => handleSaveAccordionTitle(section, index, e)}
											sx={{ minWidth: MOBILE_CONSTANTS.TOUCH_TARGET_SIZE }}
										>
											<Save fontSize='small' />
										</IconButton>
										<IconButton
											size='small'
											onClick={handleCancelEditingAccordion}
											sx={{ minWidth: MOBILE_CONSTANTS.TOUCH_TARGET_SIZE }}
										>
											<Cancel fontSize='small' />
										</IconButton>
									</Stack>
								) : (
									<>
										<Typography
											variant={isMobile ? 'subtitle1' : 'h6'}
											sx={{
												flex: 1,
												fontWeight: 600,
												color: isExpanded
													? 'primary.contrastText'
													: 'text.primary',
											}}
										>
											{section.title}
										</Typography>

										{isAdminMode && (
											<Tooltip title='Редактировать название'>
												<IconButton
													size='small'
													onClick={e =>
														handleStartEditingAccordion(index, section.title, e)
													}
													sx={{
														mr: 1,
														minWidth: MOBILE_CONSTANTS.TOUCH_TARGET_SIZE,
														color: isExpanded
															? 'primary.contrastText'
															: 'text.secondary',
													}}
												>
													<Edit fontSize='small' />
												</IconButton>
											</Tooltip>
										)}

										<IconButton
											size='small'
											sx={{
												minWidth: MOBILE_CONSTANTS.TOUCH_TARGET_SIZE,
												color: isExpanded
													? 'primary.contrastText'
													: 'text.secondary',
											}}
										>
											{isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
										</IconButton>
									</>
								)}
							</Box>

							{/* Содержимое секции */}
							<Collapse
								in={isExpanded}
								timeout={MOBILE_CONSTANTS.ANIMATION_DURATION}
							>
								<Box sx={{ p: mobileBreakpoints.padding, pt: 1 }}>
									{/* Связанные поля для мобильных */}
									{section.fields.some((f: any) => f.linkedFields?.enabled) && (
										<Box sx={{ mb: 2 }}>
											<LinkedFields
												sections={fieldSections}
												values={formik.values}
												onValuesChange={(newValues: Record<string, any>) => {
													const updatedValues = {
														...formik.values,
														...newValues,
													}
													formik.setValues(updatedValues)
												}}
												sourceSection={section.title}
												showInline={true}
											/>
										</Box>
									)}

									<FormSection
										section={section}
										values={formik.values}
										onFieldChange={handleFieldChange}
										getFieldError={getFieldError}
										compact={true}
										showTitle={false}
										preloadedOptions={preloadedOptions}
										isAdminMode={isAdminMode}
										onSectionTitleChange={handleSectionTitleChange}
										showCopyButton={true}
									/>
								</Box>
							</Collapse>
						</Paper>
					)
				})}

				{/* Мобильная кнопка отправки */}
				<Box sx={{ mt: 3 }}>
					<SubmitButton submitting={submitting} variant='success' fullWidth />
				</Box>
			</Box>
		),
		[
			fieldSections,
			mobileBreakpoints,
			renderMobileSectionControls,
			isSectionExpanded,
			toggleSectionExpanded,
			editingSection,
			isAdminMode,
			tempTitle,
			handleSaveAccordionTitle,
			handleCancelEditingAccordion,
			handleStartEditingAccordion,
			formik.values,
			handleFieldChange,
			getFieldError,
			preloadedOptions,
			handleSectionTitleChange,
			submitting,
			isMobile,
		]
	)

	// Простое отображение для коротких форм
	const renderSimpleForm = useCallback(
		() => (
			<Box sx={{ p: mobileBreakpoints.padding }}>
				<FormSection
					section={{
						title: form.title,
						fields: sortedFields,
					}}
					values={formik.values}
					onFieldChange={handleFieldChange}
					getFieldError={getFieldError}
					showTitle={false}
					compact={true}
					preloadedOptions={preloadedOptions}
					isAdminMode={isAdminMode}
					onSectionTitleChange={handleSectionTitleChange}
					showCopyButton={true}
				/>
				<SubmitButton submitting={submitting} variant='primary' fullWidth />
			</Box>
		),
		[
			mobileBreakpoints,
			form.title,
			sortedFields,
			formik.values,
			handleFieldChange,
			getFieldError,
			preloadedOptions,
			isAdminMode,
			handleSectionTitleChange,
			submitting,
			isMobile,
		]
	)

	return (
		<Box
			sx={{
				minHeight: '100vh',
				bgcolor: 'grey.50',
				pb: isMobile ? 10 : 4, // дополнительное место для плавающей кнопки
			}}
		>
			{/* Результат отправки */}
			{submitResult && (
				<Fade in timeout={500}>
					<Box sx={{ mb: 2 }}>
						<FormResult
							result={submitResult}
							onReset={resetForm}
							isMobile={isMobile}
						/>
					</Box>
				</Fade>
			)}

			{/* Основная форма */}
			<Paper
				elevation={isMobile ? 0 : 1}
				sx={{
					mx: isMobile ? 0 : 'auto',
					maxWidth: isMobile ? '100%' : 800,
					borderRadius: isMobile ? 0 : 2,
					minHeight: isMobile ? '100vh' : 'auto',
				}}
			>
				{/* Заголовок формы */}
				<Box
					sx={{
						p: mobileBreakpoints.padding,
						borderBottom: '1px solid',
						borderColor: 'divider',
						bgcolor: 'background.paper',
						position: isMobile ? 'sticky' : 'static',
						top: 0,
						zIndex: 10,
					}}
				>
					<Stack direction='row' alignItems='center' spacing={2}>
						<Box sx={{ flex: 1 }}>
							<Typography
								variant={isMobile ? 'h6' : 'h5'}
								component='h1'
								sx={{ fontWeight: 600, mb: 0.5 }}
							>
								{form.title}
							</Typography>
							{form.description && (
								<Typography
									variant='body2'
									color='text.secondary'
									sx={{ lineHeight: 1.4 }}
								>
									{form.description}
								</Typography>
							)}
						</Box>

						{/* Индикаторы для мобильных */}
						<Stack direction='row' spacing={1}>
							{isMobile && (
								<Chip
									icon={<TouchIcon />}
									label='Мобильная'
									size='small'
									variant='outlined'
									color='primary'
								/>
							)}
							<Chip
								icon={<SpeedIcon />}
								label='Быстрая'
								size='small'
								variant='outlined'
								color='success'
							/>
						</Stack>
					</Stack>
				</Box>

				{/* Содержимое формы */}
				<Box ref={formRef}>
					{useSectionMode ? renderMobileSections() : renderSimpleForm()}
				</Box>
			</Paper>

			{/* Кнопка "наверх" для мобильных */}
			<ScrollToTopButton show={showScrollTop} onClick={scrollToTop} />

			{/* Snackbar для уведомлений */}
			<Snackbar
				open={snackbar.open}
				autoHideDuration={6000}
				onClose={() => setSnackbar({ ...snackbar, open: false })}
				anchorOrigin={{
					vertical: isMobile ? 'top' : 'bottom',
					horizontal: 'center',
				}}
			>
				<Alert
					onClose={() => setSnackbar({ ...snackbar, open: false })}
					severity={snackbar.severity}
					sx={{
						width: '100%',
						fontSize: mobileBreakpoints.fontSize,
					}}
				>
					{snackbar.message}
				</Alert>
			</Snackbar>
		</Box>
	)
}

export default MobileBetoneForm
