import React, { useState, useMemo, useRef, useEffect } from 'react'
import {
	Box,
	Button,
	Typography,
	Paper,
	Alert,
	CircularProgress,
	Stepper,
	Step,
	StepLabel,
	StepContent,
	Fab,
	Card,
	CardContent,
	LinearProgress,
	Chip,
	Divider,
} from '@mui/material'
import { useFormik } from 'formik'
import * as yup from 'yup'
import FormField from './FormField'
import { Form, FormField as FormFieldType } from '../../types'
import { SubmissionService } from '../../services/submissionService'
import { ArrowUpward, CheckCircle } from '@mui/icons-material'

interface BetoneFormProps {
	form: Form
	fields: FormFieldType[]
}

const BetoneForm: React.FC<BetoneFormProps> = ({ form, fields }) => {
	const [submitting, setSubmitting] = useState(false)
	const [submitResult, setSubmitResult] = useState<{
		success: boolean
		message: string
	} | null>(null)
	const [showScrollTop, setShowScrollTop] = useState(false)
	const [activeSection, setActiveSection] = useState(0)

	const formRef = useRef<HTMLDivElement>(null)

	// Функция прокрутки наверх
	const scrollToTop = () => {
		window.scrollTo({
			top: 0,
			behavior: 'smooth',
		})
	}

	// Группировка полей по секциям на основе разделителей
	const fieldSections = useMemo(() => {
		const sections: { title: string; fields: FormFieldType[] }[] = []
		let currentSection = {
			title: 'Основная информация',
			fields: [] as FormFieldType[],
		}

		fields.forEach(field => {
			if (field.type === 'divider' || field.type === 'header') {
				if (currentSection.fields.length > 0) {
					sections.push(currentSection)
				}
				currentSection = {
					title: field.label || `Секция ${sections.length + 1}`,
					fields: [],
				}
			} else {
				currentSection.fields.push(field)
			}
		})

		if (currentSection.fields.length > 0) {
			sections.push(currentSection)
		}

		return sections.length > 0 ? sections : [{ title: 'Форма заказа', fields }]
	}, [fields])

	// Отслеживание прокрутки
	useEffect(() => {
		const handleScroll = () => {
			setShowScrollTop(window.scrollY > 300)
		}
		window.addEventListener('scroll', handleScroll)
		return () => window.removeEventListener('scroll', handleScroll)
	}, [])

	// Создание схемы валидации
	const generateValidationSchema = () => {
		const schemaFields: Record<string, any> = {}

		fields.forEach(field => {
			if (field.type === 'divider' || field.type === 'header') return

			let fieldSchema

			switch (field.type) {
				case 'text':
					fieldSchema = yup.string()
					break
				case 'number':
					fieldSchema = yup.number().typeError('Должно быть числом')
					break
				case 'select':
				case 'autocomplete':
					fieldSchema = yup.string()
					break
				case 'checkbox':
					fieldSchema = yup.boolean()
					break
				case 'radio':
					fieldSchema = yup.string()
					break
				case 'textarea':
					fieldSchema = yup.string()
					break
				default:
					fieldSchema = yup.string()
			}

			if (field.required) {
				fieldSchema = fieldSchema.required(`${field.label} - обязательное поле`)
			}

			schemaFields[field.name] = fieldSchema
		})

		return yup.object().shape(schemaFields)
	}

	// Генерация начальных значений
	const generateInitialValues = () => {
		const initialValues: Record<string, any> = {}
		fields.forEach(field => {
			if (field.type !== 'divider' && field.type !== 'header') {
				initialValues[field.name] = field.type === 'checkbox' ? false : ''
			}
		})
		return initialValues
	}

	const formik = useFormik({
		initialValues: generateInitialValues(),
		validationSchema: generateValidationSchema(),
		validateOnChange: false,
		validateOnBlur: true,
		onSubmit: async values => {
			setSubmitting(true)
			try {
				const result = await SubmissionService.submitForm({
					formId: form._id || '',
					formData: values,
				})
				setSubmitResult({
					success: true,
					message:
						'Заявка успешно отправлена! Наш менеджер свяжется с вами в ближайшее время.',
				})
				scrollToTop()
				formik.resetForm()
			} catch (error) {
				console.error('Ошибка при отправке формы:', error)
				setSubmitResult({
					success: false,
					message:
						'Произошла ошибка при отправке формы. Пожалуйста, попробуйте еще раз или свяжитесь с нами по телефону.',
				})
			} finally {
				setSubmitting(false)
			}
		},
	})

	// Подсчет прогресса заполнения
	const calculateProgress = () => {
		const formValues = formik.values
		const fieldCount = Object.keys(formValues).length
		if (fieldCount === 0) return 0

		const filledFieldCount = Object.values(formValues).filter(
			value => value !== '' && value !== false
		).length
		return Math.round((filledFieldCount / fieldCount) * 100)
	}

	const progress = calculateProgress()

	return (
		<Box sx={{ minHeight: '100vh', bgcolor: '#f8fafc' }}>
			{/* Заголовок с прогрессом */}
			<Paper
				elevation={0}
				sx={{
					background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
					color: 'white',
					p: 3,
					mb: 2,
					borderRadius: 0,
				}}
			>
				<Typography
					variant='h4'
					component='h1'
					sx={{
						fontWeight: 'bold',
						mb: 1,
						textAlign: 'center',
						fontSize: { xs: '1.75rem', sm: '2.125rem' },
					}}
				>
					{form.title}
				</Typography>

				{form.description && (
					<Typography
						variant='body1'
						sx={{
							opacity: 0.9,
							textAlign: 'center',
							mb: 2,
							fontSize: { xs: '0.875rem', sm: '1rem' },
							px: { xs: 2, sm: 0 },
						}}
					>
						{form.description}
					</Typography>
				)}

				{/* Прогресс бар */}
				<Box
					sx={{
						maxWidth: { xs: '100%', sm: 400 },
						mx: 'auto',
						px: { xs: 2, sm: 0 },
					}}
				>
					<Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
						<Typography
							variant='body2'
							sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
						>
							Прогресс заполнения
						</Typography>
						<Typography
							variant='body2'
							sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
						>
							{progress}%
						</Typography>
					</Box>
					<LinearProgress
						variant='determinate'
						value={progress}
						sx={{
							height: { xs: 6, sm: 8 },
							borderRadius: 4,
							bgcolor: 'rgba(255,255,255,0.2)',
							'& .MuiLinearProgress-bar': {
								bgcolor: '#4caf50',
							},
						}}
					/>
				</Box>
			</Paper>

			<Box sx={{ maxWidth: '1400px', mx: 'auto', px: { xs: 1, sm: 2 } }}>
				{/* Мобильная навигация - горизонтальные табы */}
				{fieldSections.length > 1 && (
					<Paper
						elevation={2}
						sx={{
							mb: 2,
							display: { xs: 'block', lg: 'none' },
							overflow: 'hidden',
						}}
					>
						<Box
							sx={{
								display: 'flex',
								overflowX: 'auto',
								p: 1,
								gap: 1,
								'&::-webkit-scrollbar': { height: 4 },
								'&::-webkit-scrollbar-thumb': {
									bgcolor: '#ccc',
									borderRadius: 2,
								},
							}}
						>
							{fieldSections.map((section, index) => (
								<Chip
									key={index}
									label={`${index + 1}. ${section.title}`}
									variant={activeSection === index ? 'filled' : 'outlined'}
									color={activeSection === index ? 'primary' : 'default'}
									onClick={() => setActiveSection(index)}
									sx={{
										minWidth: 'max-content',
										fontWeight: activeSection === index ? 'bold' : 'normal',
										fontSize: { xs: '0.75rem', sm: '0.875rem' },
									}}
								/>
							))}
						</Box>
					</Paper>
				)}

				<Box sx={{ display: 'flex', gap: 3 }}>
					{/* Десктопная боковая навигация */}
					{fieldSections.length > 1 && (
						<Paper
							elevation={2}
							sx={{
								width: 280,
								position: 'sticky',
								top: 20,
								height: 'fit-content',
								maxHeight: 'calc(100vh - 40px)',
								overflow: 'auto',
								display: { xs: 'none', lg: 'block' },
							}}
						>
							<Box
								sx={{
									p: 2,
									bgcolor: '#f5f5f5',
									borderBottom: '1px solid #e0e0e0',
								}}
							>
								<Typography
									variant='h6'
									sx={{
										fontWeight: 'bold',
										display: 'flex',
										alignItems: 'center',
										gap: 1,
									}}
								>
									📋 Разделы формы
								</Typography>
							</Box>

							<Box sx={{ p: 1 }}>
								{fieldSections.map((section, index) => (
									<Card
										key={index}
										variant={activeSection === index ? 'elevation' : 'outlined'}
										sx={{
											mb: 1,
											cursor: 'pointer',
											bgcolor: activeSection === index ? '#e3f2fd' : 'white',
											border:
												activeSection === index
													? '2px solid #1976d2'
													: '1px solid #e0e0e0',
											'&:hover': {
												bgcolor: '#f5f5f5',
												transform: 'translateX(4px)',
												transition: 'all 0.2s ease',
											},
										}}
										onClick={() => setActiveSection(index)}
									>
										<CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
											<Typography
												variant='body2'
												sx={{ fontWeight: 'medium', mb: 0.5 }}
											>
												{section.title}
											</Typography>
											<Typography variant='caption' color='text.secondary'>
												{section.fields.length} полей
											</Typography>
											{activeSection === index && (
												<Chip
													label='Активный'
													size='small'
													color='primary'
													sx={{ mt: 1, fontSize: '0.7rem' }}
												/>
											)}
										</CardContent>
									</Card>
								))}
							</Box>
						</Paper>
					)}

					{/* Основная форма */}
					<Box sx={{ flex: 1, minWidth: 0 }}>
						{submitResult && (
							<Alert
								severity={submitResult.success ? 'success' : 'error'}
								sx={{ mb: 2 }}
								icon={submitResult.success ? <CheckCircle /> : undefined}
							>
								{submitResult.message}
							</Alert>
						)}

						<Paper elevation={2} sx={{ overflow: 'hidden' }} ref={formRef}>
							<Box component='form' onSubmit={formik.handleSubmit} noValidate>
								{fieldSections.length > 1 ? (
									// Показываем активную секцию
									<Box sx={{ p: { xs: 2, sm: 3 } }}>
										<Box
											sx={{ mb: 3, pb: 2, borderBottom: '2px solid #e0e0e0' }}
										>
											<Typography
												variant='h5'
												sx={{
													fontWeight: 'bold',
													color: '#1976d2',
													mb: 1,
													fontSize: { xs: '1.25rem', sm: '1.5rem' },
												}}
											>
												{fieldSections[activeSection].title}
											</Typography>
											<Typography variant='body2' color='text.secondary'>
												Секция {activeSection + 1} из {fieldSections.length}
											</Typography>
										</Box>

										{fieldSections[activeSection].fields
											.sort((a, b) => (a.order || 0) - (b.order || 0))
											.map(field => (
												<Box
													key={field._id || field.name}
													sx={{ mb: { xs: 1.5, sm: 2 } }}
												>
													<FormField
														field={field}
														value={formik.values[field.name]}
														onChange={(name, value) =>
															formik.setFieldValue(name, value)
														}
														error={
															formik.touched[field.name]
																? (formik.errors[field.name] as string)
																: undefined
														}
														compact={true}
													/>
												</Box>
											))}

										{/* Мобильная навигация между секциями */}
										<Box
											sx={{
												display: 'flex',
												flexDirection: { xs: 'column', sm: 'row' },
												justifyContent: 'space-between',
												gap: { xs: 2, sm: 0 },
												mt: 4,
												pt: 2,
												borderTop: '1px solid #e0e0e0',
											}}
										>
											<Button
												variant='outlined'
												onClick={() =>
													setActiveSection(Math.max(0, activeSection - 1))
												}
												disabled={activeSection === 0}
												fullWidth
												size='large'
											>
												← Предыдущая секция
											</Button>

											<Button
												variant='contained'
												onClick={() => {
													if (activeSection < fieldSections.length - 1) {
														setActiveSection(activeSection + 1)
													}
												}}
												fullWidth
												size='large'
												disabled={activeSection === fieldSections.length - 1}
											>
												Следующая секция →
											</Button>
										</Box>

										{/* Кнопка отправки формы всегда видна на последней секции */}
										{activeSection === fieldSections.length - 1 && (
											<Box sx={{ mt: 3, textAlign: 'center' }}>
												<Button
													type='submit'
													variant='contained'
													color='success'
													size='large'
													disabled={submitting}
													sx={{
														minWidth: { xs: '100%', sm: '300px' },
														py: { xs: 2, sm: 1.5 },
														fontSize: { xs: '1rem', sm: '1rem' },
														fontWeight: 'bold',
													}}
												>
													{submitting ? (
														<CircularProgress size={24} />
													) : (
														'🚀 ОТПРАВИТЬ ЗАЯВКУ'
													)}
												</Button>
											</Box>
										)}
									</Box>
								) : (
									// Обычное отображение для коротких форм
									<Box sx={{ p: { xs: 2, sm: 3 } }}>
										{fields
											.sort((a, b) => (a.order || 0) - (b.order || 0))
											.map(field => (
												<Box
													key={field._id || field.name}
													sx={{ mb: { xs: 1.5, sm: 2 } }}
												>
													<FormField
														field={field}
														value={formik.values[field.name]}
														onChange={(name, value) =>
															formik.setFieldValue(name, value)
														}
														error={
															formik.touched[field.name]
																? (formik.errors[field.name] as string)
																: undefined
														}
														compact={true}
													/>
												</Box>
											))}
										<Box sx={{ mt: 4, textAlign: 'center' }}>
											<Button
												type='submit'
												variant='contained'
												color='primary'
												size='large'
												disabled={submitting}
												fullWidth
												sx={{
													maxWidth: { xs: '100%', sm: '300px' },
													py: { xs: 2, sm: 1.5 },
													fontSize: { xs: '1rem', sm: '0.875rem' },
												}}
											>
												{submitting ? (
													<CircularProgress size={24} />
												) : (
													'🚀 ОТПРАВИТЬ ЗАЯВКУ'
												)}
											</Button>
										</Box>
									</Box>
								)}
							</Box>
						</Paper>
					</Box>
				</Box>

				{/* Кнопка "наверх" - адаптивная */}
				{showScrollTop && (
					<Fab
						color='primary'
						size={
							typeof window !== 'undefined' && window.innerWidth < 600
								? 'small'
								: 'medium'
						}
						onClick={scrollToTop}
						sx={{
							position: 'fixed',
							bottom: { xs: 16, sm: 20 },
							right: { xs: 16, sm: 20 },
							zIndex: 1000,
						}}
					/>
				)}
			</Box>
		</Box>
	)
}

export default BetoneForm
