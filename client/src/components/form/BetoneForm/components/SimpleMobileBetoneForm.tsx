import React, { useRef, useMemo, useCallback } from 'react'
import {
	Box,
	Paper,
	Typography,
	Button,
	Stack,
	Collapse,
	useTheme,
	useMediaQuery,
	Fade,
	Chip,
	LinearProgress,
} from '@mui/material'
import {
	ExpandMore as ExpandMoreIcon,
	ExpandLess as ExpandLessIcon,
	TouchApp as TouchIcon,
	Speed as SpeedIcon,
	CheckCircle as CheckCircleIcon,
	RadioButtonUnchecked as RadioButtonUncheckedIcon,
} from '@mui/icons-material'
import { BetoneFormProps } from '../types'
import { useBetoneForm } from '../hooks/useBetoneForm'
import { getSortedFields } from '../utils/sectionHelpers'
import { FormSection } from './FormSection'
import { SubmitButton } from './SubmitButton'
import { ScrollToTopButton } from './ScrollToTopButton'
import { FormResult } from './FormResult'

import { LinkedFields } from '../../LinkedFields'

// Мобильные константы - более компактные для телефонов
const MOBILE_CONSTANTS = {
	TOUCH_TARGET_SIZE: 44, // уменьшил с 48 до 44
	ANIMATION_DURATION: 150, // уменьшил с 200 до 150
	COMPACT_PADDING: 1.5, // новый компактный padding
	COMPACT_SPACING: 1, // компактные отступы
}

// Функция для подсчета заполненности секции с мемоизацией
const cache = new Map<string, any>()

const calculateSectionCompleteness = (
	section: any,
	values: Record<string, any>
) => {
	const cacheKey = `${section.title}-${Object.keys(values)
		.map(k => `${k}:${values[k]}`)
		.join(',')}`

	if (cache.has(cacheKey)) {
		return cache.get(cacheKey)
	}

	const requiredFields = section.fields.filter((field: any) => field.required)
	const totalFields = section.fields.length
	const filledFields = section.fields.filter((field: any) => {
		const value = values[field.name]
		return value !== undefined && value !== null && value !== ''
	})

	const result = {
		filled: filledFields.length,
		total: totalFields,
		required: requiredFields.length,
		requiredFilled: requiredFields.filter((field: any) => {
			const value = values[field.name]
			return value !== undefined && value !== null && value !== ''
		}).length,
		percentage: Math.round((filledFields.length / totalFields) * 100),
		isComplete: requiredFields.every((field: any) => {
			const value = values[field.name]
			return value !== undefined && value !== null && value !== ''
		}),
	}

	cache.set(cacheKey, result)
	if (cache.size > 100) cache.clear() // Простая очистка кеша

	return result
}

const SimpleMobileBetoneForm: React.FC<BetoneFormProps> = React.memo(
	({
		form,
		fields,
		editData,
		preloadedOptions,
		isAdminMode = false,
		onFieldUpdate,
	}) => {
		const theme = useTheme()
		const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
		const formRef = useRef<HTMLDivElement>(null)

		// Хук основной логики формы
		const {
			formik,
			submitting,
			submitResult,
			fieldSections,
			useSectionMode,
			showScrollTop,
			isSectionExpanded,
			toggleSectionExpanded,
			expandAllSections,
			collapseAllSections,
			scrollToTop,
			resetForm,
			getFieldError,
			handleFieldChange,
		} = useBetoneForm(
			form.id || form._id || '',
			fields,
			editData,
			preloadedOptions
		)

		// Мемоизированные вычисления для производительности
		const sortedFields = useMemo(() => getSortedFields(fields), [fields])

		// Более компактные стили для мобильных
		const mobileStyles = useMemo(
			() => ({
				padding: isMobile ? MOBILE_CONSTANTS.COMPACT_PADDING : 3,
				spacing: isMobile ? MOBILE_CONSTANTS.COMPACT_SPACING : 2,
				fontSize: isMobile ? '16px' : '1rem', // 16px для предотвращения зума на iOS
				borderRadius: isMobile ? 1 : 2,
				headerPadding: isMobile ? 1.5 : 2,
				sectionPadding: isMobile ? 1.5 : 2,
			}),
			[isMobile]
		)

		// Мемоизированный компонент индикатора заполненности секции
		const SectionCompletionIndicator: React.FC<{
			section: any
			values: Record<string, any>
			compact?: boolean
		}> = React.memo(({ section, values, compact = false }) => {
			const completion = calculateSectionCompleteness(section, values)

			if (compact) {
				return (
					<Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
						{completion.isComplete ? (
							<CheckCircleIcon
								sx={{
									fontSize: 18,
									color: 'success.main',
								}}
							/>
						) : (
							<RadioButtonUncheckedIcon
								sx={{
									fontSize: 18,
									color: 'grey.400',
								}}
							/>
						)}
						<Typography
							variant='caption'
							sx={{
								fontSize: '0.75rem',
								color: completion.isComplete
									? 'success.main'
									: 'text.secondary',
							}}
						>
							{completion.filled}/{completion.total}
						</Typography>
					</Box>
				)
			}

			return (
				<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
					<Chip
						size='small'
						label={`${completion.percentage}%`}
						color={
							completion.isComplete
								? 'success'
								: completion.percentage > 50
								? 'warning'
								: 'default'
						}
						sx={{
							fontSize: '0.7rem',
							height: 20,
							'& .MuiChip-label': { px: 1 },
						}}
					/>
					<Typography
						variant='caption'
						sx={{
							fontSize: '0.75rem',
							color: 'text.secondary',
						}}
					>
						{completion.filled}/{completion.total}
					</Typography>
				</Box>
			)
		})

		// Мобильная версия секционных кнопок - более компактная
		const renderMobileSectionControls = useCallback(
			() => (
				<Stack
					direction={isMobile ? 'column' : 'row'}
					spacing={0.5} // уменьшил с 1
					sx={{ mb: mobileStyles.spacing }}
				>
					<Button
						variant='outlined'
						onClick={expandAllSections}
						fullWidth={isMobile}
						size='small' // добавил размер small
						startIcon={<ExpandMoreIcon />}
						sx={{
							minHeight: isMobile ? 36 : MOBILE_CONSTANTS.TOUCH_TARGET_SIZE, // уменьшил высоту
							fontSize: isMobile ? '0.8rem' : mobileStyles.fontSize,
							textTransform: 'none',
							py: 0.5, // уменьшил padding
						}}
					>
						Развернуть все
					</Button>
					<Button
						variant='outlined'
						onClick={collapseAllSections}
						fullWidth={isMobile}
						size='small'
						startIcon={<ExpandLessIcon />}
						sx={{
							minHeight: isMobile ? 36 : MOBILE_CONSTANTS.TOUCH_TARGET_SIZE,
							fontSize: isMobile ? '0.8rem' : mobileStyles.fontSize,
							textTransform: 'none',
							py: 0.5,
						}}
					>
						Свернуть все
					</Button>
				</Stack>
			),
			[isMobile, mobileStyles, expandAllSections, collapseAllSections]
		)

		// Мобильная версия секций с индикаторами заполненности
		const renderMobileSections = useCallback(
			() => (
				<Box sx={{ p: mobileStyles.padding }}>
					{renderMobileSectionControls()}

					{fieldSections.map((section, index) => {
						const isExpanded = isSectionExpanded(index)
						const completion = calculateSectionCompleteness(
							section,
							formik.values
						)

						return (
							<Paper
								key={index}
								elevation={isMobile ? 0 : 1} // убрал тень для мобильных
								sx={{
									mb: mobileStyles.spacing,
									overflow: 'hidden',
									borderRadius: mobileStyles.borderRadius,
									border: isMobile ? '1px solid' : 'none',
									borderColor: 'divider',
								}}
							>
								{/* Заголовок секции с индикатором */}
								<Box
									onClick={() => toggleSectionExpanded(index)}
									sx={{
										p: mobileStyles.headerPadding,
										bgcolor: isExpanded ? 'primary.light' : 'grey.50',
										cursor: 'pointer',
										display: 'flex',
										alignItems: 'center',
										minHeight: isMobile
											? 40
											: MOBILE_CONSTANTS.TOUCH_TARGET_SIZE, // уменьшил высоту
										transition: 'background-color 0.2s ease',
										'&:hover': {
											bgcolor: isExpanded ? 'primary.main' : 'grey.100',
										},
									}}
								>
									<Box sx={{ flex: 1 }}>
										<Typography
											variant={isMobile ? 'subtitle2' : 'h6'} // изменил на subtitle2
											sx={{
												fontWeight: 600,
												color: isExpanded
													? 'primary.contrastText'
													: 'text.primary',
												fontSize: isMobile ? '0.875rem' : mobileStyles.fontSize,
												lineHeight: 1.3,
											}}
										>
											{section.title}
										</Typography>

										{/* Индикатор заполненности */}
										{isMobile && (
											<Box sx={{ mt: 0.5 }}>
												<SectionCompletionIndicator
													section={section}
													values={formik.values}
													compact={true}
												/>
											</Box>
										)}
									</Box>

									{/* Полный индикатор для планшетов */}
									{!isMobile && (
										<Box sx={{ mr: 1 }}>
											<SectionCompletionIndicator
												section={section}
												values={formik.values}
											/>
										</Box>
									)}

									<Box
										sx={{
											color: isExpanded
												? 'primary.contrastText'
												: 'text.secondary',
										}}
									>
										{isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
									</Box>
								</Box>

								{/* Прогресс-бар для мобильных */}
								{isMobile && (
									<LinearProgress
										variant='determinate'
										value={completion.percentage}
										sx={{
											height: 2,
											bgcolor: 'grey.200',
											'& .MuiLinearProgress-bar': {
												bgcolor: completion.isComplete
													? 'success.main'
													: 'primary.main',
											},
										}}
									/>
								)}

								{/* Содержимое секции */}
								<Collapse
									in={isExpanded}
									timeout={MOBILE_CONSTANTS.ANIMATION_DURATION}
								>
									<Box sx={{ p: mobileStyles.sectionPadding, pt: 1 }}>
										{/* Связанные поля - показываем для всех секций */}
										{fieldSections.length > 0 && (
											<Box sx={{ mb: 1.5 }}>
												{' '}
												{/* уменьшил с 2 */}
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
										/>
									</Box>
								</Collapse>
							</Paper>
						)
					})}

					{/* Мобильная кнопка отправки */}
					<Box sx={{ mt: 2 }}>
						{' '}
						{/* уменьшил с 3 */}
						<SubmitButton submitting={submitting} variant='success' fullWidth />
					</Box>
				</Box>
			),
			[
				fieldSections,
				mobileStyles,
				renderMobileSectionControls,
				isSectionExpanded,
				toggleSectionExpanded,
				formik.values,
				handleFieldChange,
				getFieldError,
				preloadedOptions,
				isAdminMode,
				submitting,
				isMobile,
			]
		)

		// Простое отображение для коротких форм
		const renderSimpleForm = useCallback(
			() => (
				<Box sx={{ p: mobileStyles.padding }}>
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
					/>
					<SubmitButton submitting={submitting} variant='primary' fullWidth />
				</Box>
			),
			[
				mobileStyles,
				form.title,
				sortedFields,
				formik.values,
				handleFieldChange,
				getFieldError,
				preloadedOptions,
				isAdminMode,
				submitting,
			]
		)

		return (
			<Box
				sx={{
					minHeight: '100vh',
					bgcolor: 'grey.50',
					pb: isMobile ? 6 : 4, // уменьшил с 8 до 6
				}}
			>
				{/* Результат отправки */}
				{submitResult && (
					<Fade in timeout={500}>
						<Box sx={{ mb: 1.5 }}>
							{' '}
							{/* уменьшил с 2 */}
							<FormResult
								result={submitResult}
								onReset={resetForm}
								isMobile={isMobile}
							/>
						</Box>
					</Fade>
				)}

				{/* Основная форма */}
				<Box component='form' onSubmit={formik.handleSubmit}>
					<Paper
						elevation={isMobile ? 0 : 1}
						sx={{
							mx: isMobile ? 0 : 'auto',
							maxWidth: isMobile ? '100%' : 800,
							borderRadius: isMobile ? 0 : 2,
							minHeight: isMobile ? '100vh' : 'auto',
						}}
					>
						{/* Заголовок формы - более компактный */}
						<Box
							sx={{
								p: mobileStyles.headerPadding,
								borderBottom: '1px solid',
								borderColor: 'divider',
								bgcolor: 'background.paper',
								position: isMobile ? 'sticky' : 'static',
								top: 0,
								zIndex: 10,
							}}
						>
							<Stack direction='row' alignItems='center' spacing={1.5}>
								<Box sx={{ flex: 1 }}>
									<Typography
										variant={isMobile ? 'subtitle1' : 'h5'}
										component='h1'
										sx={{
											fontWeight: 600,
											mb: 0.5,
											fontSize: isMobile ? '1.1rem' : '1.5rem',
											lineHeight: 1.3,
										}}
									>
										{form.title}
									</Typography>
									{form.description && (
										<Typography
											variant='body2'
											color='text.secondary'
											sx={{
												lineHeight: 1.4,
												fontSize: isMobile ? '0.8rem' : '0.875rem',
											}}
										>
											{form.description}
										</Typography>
									)}
								</Box>

								{/* Компактные индикаторы для мобильных */}
								{isMobile && (
									<Stack direction='row' spacing={0.5}>
										<TouchIcon sx={{ fontSize: 20 }} color='primary' />
										<SpeedIcon sx={{ fontSize: 20 }} color='success' />
									</Stack>
								)}
							</Stack>
						</Box>

						{/* Содержимое формы */}
						<Box ref={formRef}>
							{useSectionMode ? renderMobileSections() : renderSimpleForm()}
						</Box>
					</Paper>
				</Box>

				{/* Кнопка "наверх" для мобильных */}
				<ScrollToTopButton show={showScrollTop} onClick={scrollToTop} />
			</Box>
		)
	}
)

export default SimpleMobileBetoneForm
