import React, { useRef } from 'react'
import {
	Box,
	Paper,
	Typography,
	Accordion,
	AccordionSummary,
	AccordionDetails,
	Button,
} from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import { BetoneFormProps } from './types'
import { useBetoneForm } from './hooks/useBetoneForm'
import { getSortedFields } from './utils/sectionHelpers'
import { FormProgressBar } from './components/FormProgressBar'
import { FormSection } from './components/FormSection'
import { SubmitButton } from './components/SubmitButton'
import { ScrollToTopButton } from './components/ScrollToTopButton'
import { FormResult } from './components/FormResult'
import { LinkedFields } from '../LinkedFields'

const BetoneForm: React.FC<BetoneFormProps> = ({ form, fields, editData }) => {
	const formRef = useRef<HTMLDivElement>(null)

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
		progress,
		progressColor,
		progressText,
		progressStatus,
		handleFieldChange,
		getFieldError,
	} = useBetoneForm(form._id ?? '', fields, editData)

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

					{/* Прогресс заполнения */}
					<Box sx={{ p: 3, pb: 0 }}>
						<FormProgressBar
							progress={progress}
							progressColor={progressColor}
							progressText={progressText}
							progressStatus={progressStatus}
						/>
					</Box>

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
										onChange={() => toggleSectionExpanded(index)}
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
											<Typography variant='h6' component='h3'>
												{section.title}
											</Typography>
											<Typography
												variant='body2'
												sx={{ ml: 2, color: 'text.secondary' }}
											>
												({section.fields.length}{' '}
												{section.fields.length === 1 ? 'поле' : 'полей'})
											</Typography>
										</AccordionSummary>
										<AccordionDetails>
											{/* Кнопка копирования для текущей секции */}
											{fieldSections.length > 1 && (
												<Box sx={{ mb: 2 }}>
													<LinkedFields
														sections={fieldSections}
														values={formik.values}
														onValuesChange={newValues => {
															Object.keys(newValues).forEach(key => {
																formik.setFieldValue(key, newValues[key])
															})
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
		</Box>
	)
}

export default BetoneForm
