import React, { useRef, useState } from 'react'
import {
	Box,
	Paper,
	Typography,
	Accordion,
	AccordionSummary,
	AccordionDetails,
	Button,
	Alert,
	Snackbar,
	TextField,
	IconButton,
	Tooltip,
} from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import { Edit, Save, Cancel } from '@mui/icons-material'
import { BetoneFormProps } from './types'
import { useBetoneForm } from './hooks/useBetoneForm'
import { getSortedFields } from './utils/sectionHelpers'
import { FormSection } from './components/FormSection'
import { SubmitButton } from './components/SubmitButton'
import { ScrollToTopButton } from './components/ScrollToTopButton'
import { FormResult } from './components/FormResult'
import { LinkedFields } from '../LinkedFields'
import { FormFieldService } from '../../../services/formFieldService'

const BetoneForm: React.FC<BetoneFormProps> = ({
	form,
	fields,
	editData,
	preloadedOptions,
	isAdminMode = false,
	onFieldUpdate,
}) => {
	const formRef = useRef<HTMLDivElement>(null)
	const [snackbar, setSnackbar] = useState<{
		open: boolean
		message: string
		severity?: 'success' | 'error'
	}>({
		open: false,
		message: '',
	})

	// Состояние для редактирования заголовков в аккордеонах
	const [editingSection, setEditingSection] = useState<number | null>(null)
	const [tempTitle, setTempTitle] = useState('')

	const {
		formik,
		submitting,
		submitResult,
		clearSubmitResult,
		resetForm,
		fieldSections,
		useSectionMode,
		toggleSectionExpanded,
		isSectionExpanded,
		expandAllSections,
		collapseAllSections,
		showScrollTop,
		scrollToTop,
		handleFieldChange,
		getFieldError,
	} = useBetoneForm(form._id ?? '', fields, editData, preloadedOptions)

	// Обработчик изменения названия раздела
	const handleSectionTitleChange = async (
		sectionId: string,
		newTitle: string
	) => {
		try {
			await FormFieldService.updateSectionTitle(sectionId, newTitle)
			setSnackbar({
				open: true,
				message: 'Название раздела успешно обновлено',
				severity: 'success',
			})

			// Обновляем локальное состояние через пропс
			if (onFieldUpdate) {
				onFieldUpdate(sectionId, { label: newTitle })
			}
		} catch (error) {
			console.error('Ошибка при обновлении названия раздела:', error)
			setSnackbar({
				open: true,
				message: 'Ошибка при обновлении названия раздела',
				severity: 'error',
			})
		}
	}

	// Обработчики для редактирования в аккордеонах
	const handleStartEditingAccordion = (
		index: number,
		currentTitle: string,
		event: React.MouseEvent
	) => {
		event.stopPropagation() // Предотвращаем сворачивание/разворачивание аккордеона
		setEditingSection(index)
		setTempTitle(currentTitle)
	}

	const handleSaveAccordionTitle = async (
		section: any,
		index: number,
		event?: React.MouseEvent
	) => {
		if (event) {
			event.stopPropagation()
		}

		if (section.id && tempTitle.trim() && tempTitle !== section.title) {
			await handleSectionTitleChange(section.id, tempTitle.trim())
		}
		setEditingSection(null)
		setTempTitle('')
	}

	const handleCancelEditingAccordion = (event?: React.MouseEvent) => {
		if (event) {
			event.stopPropagation()
		}
		setEditingSection(null)
		setTempTitle('')
	}

	const handleKeyPressAccordion = (
		event: React.KeyboardEvent,
		section: any,
		index: number
	) => {
		if (event.key === 'Enter') {
			event.preventDefault()
			handleSaveAccordionTitle(section, index)
		} else if (event.key === 'Escape') {
			event.preventDefault()
			handleCancelEditingAccordion()
		}
	}

	return (
		<Box component='form' onSubmit={formik.handleSubmit}>
			<Box sx={{ maxWidth: '800px', mx: 'auto', p: { xs: 1, sm: 2 } }}>
				<Paper elevation={3} sx={{ borderRadius: 2, overflow: 'hidden' }}>
					{/* Заголовок формы */}
					<Box sx={{ p: 3, bgcolor: 'primary.main', color: 'white' }}>
						<Typography variant='h4' component='h1' gutterBottom>
							{form.title}
						</Typography>
						{form.description && (
							<Typography variant='body1' sx={{ opacity: 0.9 }}>
								{form.description}
							</Typography>
						)}
					</Box>

					{/* Уведомление о копировании */}
					{editData?.isCopy && (
						<Box sx={{ p: 3, pb: 0 }}>
							<Alert severity='info' sx={{ mb: 2 }}>
								<Typography variant='body2'>
									Вы копируете заявку "{editData.originalTitle}" (№
									{editData.originalSubmissionNumber}). Данные предзаполнены, но
									будет создана новая заявка.
								</Typography>
							</Alert>
						</Box>
					)}

					{/* Результат отправки */}
					{submitResult && (
						<Box sx={{ p: 3, pb: 0 }}>
							<FormResult
								result={submitResult}
								onClose={clearSubmitResult}
								onReset={resetForm}
							/>
						</Box>
					)}

					{/* Содержимое формы */}
					<Box ref={formRef}>
						{useSectionMode ? (
							// Секционный режим с аккордеонами
							<Box sx={{ p: 3 }}>
								{/* Кнопки управления секциями */}
								<Box sx={{ mb: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
									<Button
										size='small'
										variant='outlined'
										onClick={expandAllSections}
									>
										Развернуть все
									</Button>
									<Button
										size='small'
										variant='outlined'
										onClick={collapseAllSections}
									>
										Свернуть все
									</Button>
								</Box>

								{/* Секции как аккордеоны */}
								{fieldSections.map((section, index) => (
									<Accordion
										key={index}
										expanded={isSectionExpanded(index)}
										onChange={() =>
											editingSection !== index && toggleSectionExpanded(index)
										}
										sx={{ mb: 1 }}
									>
										<AccordionSummary
											expandIcon={<ExpandMoreIcon />}
											sx={{
												'&:hover': {
													backgroundColor: 'rgba(0, 0, 0, 0.04)',
												},
											}}
										>
											{editingSection === index && isAdminMode ? (
												<Box
													sx={{
														display: 'flex',
														alignItems: 'center',
														gap: 1,
														flex: 1,
														mr: 2,
													}}
													onClick={e => e.stopPropagation()}
												>
													<TextField
														value={tempTitle}
														onChange={e => setTempTitle(e.target.value)}
														onKeyDown={e =>
															handleKeyPressAccordion(e, section, index)
														}
														variant='outlined'
														size='small'
														autoFocus
														sx={{
															flex: 1,
															'& .MuiOutlinedInput-root': {
																fontSize: '1.25rem',
																fontWeight: 600,
															},
														}}
													/>
													<Tooltip title='Сохранить'>
														<IconButton
															onClick={e =>
																handleSaveAccordionTitle(section, index, e)
															}
															color='primary'
															size='small'
														>
															<Save />
														</IconButton>
													</Tooltip>
													<Tooltip title='Отменить'>
														<IconButton
															onClick={handleCancelEditingAccordion}
															color='secondary'
															size='small'
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
														flex: 1,
													}}
												>
													<Typography
														variant='h6'
														component='h3'
														sx={{ flex: 1 }}
													>
														{section.title}
													</Typography>
													<Typography
														variant='body2'
														sx={{ ml: 2, color: 'text.secondary' }}
													>
														({section.fields.length}{' '}
														{section.fields.length === 1 ? 'поле' : 'полей'})
													</Typography>
													{isAdminMode && section.id && (
														<Tooltip title='Редактировать название раздела'>
															<IconButton
																onClick={e =>
																	handleStartEditingAccordion(
																		index,
																		section.title,
																		e
																	)
																}
																size='small'
																sx={{
																	ml: 1,
																	opacity: 0.7,
																	'&:hover': { opacity: 1 },
																}}
															>
																<Edit fontSize='small' />
															</IconButton>
														</Tooltip>
													)}
												</Box>
											)}
										</AccordionSummary>
										<AccordionDetails>
											{/* Кнопка копирования для текущей секции */}
											{fieldSections.length > 1 && (
												<Box sx={{ mb: 2 }}>
													<LinkedFields
														sections={fieldSections}
														values={formik.values}
														onValuesChange={newValues => {
															// Используем setValues для массового обновления
															const updatedValues = {
																...formik.values,
																...newValues,
															}

															formik.setValues(updatedValues)

															// Принудительно обновляем компоненты через изменение key
															setTimeout(() => {
																const autocompleteFields = Object.keys(
																	newValues
																).filter(key => {
																	const field = fields.find(f => f.name === key)
																	return (
																		field?.type === 'autocomplete' &&
																		newValues[key]
																	)
																})

																if (autocompleteFields.length > 0) {
																	// Принудительно перерендериваем форму
																	setSnackbar({
																		open: false,
																		message: '',
																		severity: 'success',
																	})
																}
															}, 200)
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
											/>
										</AccordionDetails>
									</Accordion>
								))}

								{/* Кнопка отправки */}
								<Box sx={{ mt: 3 }}>
									<SubmitButton
										submitting={submitting}
										variant='success'
										fullWidth
									/>
								</Box>
							</Box>
						) : (
							// Обычное отображение для коротких форм
							<Box sx={{ p: 3 }}>
								<FormSection
									section={{
										title: form.title,
										fields: getSortedFields(fields),
									}}
									values={formik.values}
									onFieldChange={handleFieldChange}
									getFieldError={getFieldError}
									showTitle={false}
									compact={true}
									preloadedOptions={preloadedOptions}
									isAdminMode={isAdminMode}
									onSectionTitleChange={handleSectionTitleChange}
								/>
								<SubmitButton
									submitting={submitting}
									variant='primary'
									fullWidth
								/>
							</Box>
						)}
					</Box>
				</Paper>
			</Box>

			{/* Кнопка "наверх" */}
			<ScrollToTopButton show={showScrollTop} onClick={scrollToTop} />

			{/* Snackbar для уведомлений */}
			<Snackbar
				open={snackbar.open}
				autoHideDuration={6000}
				onClose={() => setSnackbar({ ...snackbar, open: false })}
			>
				<Alert
					onClose={() => setSnackbar({ ...snackbar, open: false })}
					severity={snackbar.severity}
				>
					{snackbar.message}
				</Alert>
			</Snackbar>
		</Box>
	)
}

export default BetoneForm
