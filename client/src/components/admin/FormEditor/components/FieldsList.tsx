import React, { useRef, useCallback } from 'react'
import {
	Box,
	Stack,
	Typography,
	Button,
	Paper,
	Chip,
	IconButton,
	Tooltip,
	CircularProgress,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import SectionIcon from '@mui/icons-material/ViewHeadline'
import DragIndicatorIcon from '@mui/icons-material/DragIndicator'
import DeleteIcon from '@mui/icons-material/Delete'
import { FormField } from '../../../../types'
import FormFieldEditor from '../../FormFieldEditor'
import { DragHandlers } from '../types'

interface FieldsListProps {
	fields: FormField[]
	loading: boolean
	bitrixFields: Record<string, any>
	dragOverIndex: number | null
	onAddField: () => void
	onFieldSave: (index: number, field: Partial<FormField>) => void
	onFieldDelete: (index: number) => void
	dragHandlers: DragHandlers
}

interface Section {
	id: string
	header?: FormField
	fields: FormField[]
	sectionNumber: number
}

export const FieldsList: React.FC<FieldsListProps> = ({
	fields,
	loading,
	bitrixFields,
	dragOverIndex,
	onAddField,
	onFieldSave,
	onFieldDelete,
	dragHandlers,
}) => {
	const fieldsRefs = useRef<{ [key: string]: HTMLDivElement | null }>({})

	// Группировка полей по разделам
	const groupedFields = React.useMemo(() => {
		const sorted = [...fields].sort((a, b) => (a.order || 0) - (b.order || 0))
		const sections: Section[] = []

		// Начинаем с раздела по умолчанию (без заголовка)
		let currentSection: Section = {
			id: 'section-default',
			fields: [],
			sectionNumber: 0,
		}

		sorted.forEach(field => {
			if (field.type === 'header') {
				// Сохраняем предыдущий раздел если в нем есть поля или заголовок
				if (currentSection.fields.length > 0 || currentSection.header) {
					sections.push(currentSection)
				}

				// Начинаем новый раздел
				const sectionNumber = Math.floor((field.order || 0) / 100)
				currentSection = {
					id: `section-${field._id || field.name}-${sectionNumber}`,
					header: field,
					fields: [],
					sectionNumber,
				}
			} else if (field.type !== 'divider') {
				// Добавляем обычные поля в текущий раздел
				currentSection.fields.push(field)
			}
		})

		// Добавляем последний раздел
		if (currentSection.fields.length > 0 || currentSection.header) {
			sections.push(currentSection)
		}

		// Если нет разделов, создаем раздел по умолчанию
		if (sections.length === 0) {
			sections.push({
				id: 'section-default',
				fields: sorted.filter(f => f.type !== 'header' && f.type !== 'divider'),
				sectionNumber: 0,
			})
		}

		console.log('Группированные разделы:', sections)
		return sections
	}, [fields])

	// Функция удаления раздела
	const deleteSection = useCallback(
		(sectionHeader: FormField) => {
			if (!sectionHeader) return

			// Находим индекс заголовка раздела
			const headerIndex = fields.findIndex(f => {
				if (f._id && sectionHeader._id) {
					return f._id === sectionHeader._id
				}
				return f.name === sectionHeader.name && f.type === 'header'
			})

			if (headerIndex >= 0) {
				// Удаляем заголовок раздела
				onFieldDelete(headerIndex)

				// Также удаляем все поля этого раздела
				const sectionNumber = Math.floor((sectionHeader.order || 0) / 100)
				const fieldsToDelete = fields
					.map((field, index) => ({ field, index }))
					.filter(({ field }) => {
						if (field.type === 'header' || field.type === 'divider')
							return false
						const fieldSectionNumber = Math.floor((field.order || 0) / 100)
						return fieldSectionNumber === sectionNumber
					})
					.sort((a, b) => b.index - a.index) // Удаляем с конца, чтобы индексы не сбивались

				// Удаляем поля раздела с задержкой
				fieldsToDelete.forEach(({ index }, i) => {
					setTimeout(() => onFieldDelete(index), i * 50)
				})
			}
		},
		[fields, onFieldDelete]
	)

	// Функция добавления поля в конкретный раздел
	const addFieldToSection = useCallback(
		(sectionNumber: number) => {
			const baseSectionOrder = sectionNumber * 100

			// Находим поля в этом разделе (исключая заголовки и разделители)
			const fieldsInSection = fields.filter(field => {
				if (field.type === 'header' || field.type === 'divider') return false
				const fieldOrder = field.order || 0
				const fieldSectionNumber = Math.floor(fieldOrder / 100)
				return fieldSectionNumber === sectionNumber
			})

			let newOrder: number
			if (fieldsInSection.length === 0) {
				// Первое поле в разделе
				newOrder = baseSectionOrder + 1
			} else {
				// Следующее поле после последнего в разделе
				const maxOrder = Math.max(...fieldsInSection.map(f => f.order || 0))
				newOrder = maxOrder + 1

				// Убедимся что не выходим за границы раздела
				if (newOrder >= baseSectionOrder + 100) {
					newOrder = baseSectionOrder + 99
				}
			}

			const newField: Partial<FormField> = {
				name: `field_${Math.floor(Math.random() * 1000)}`, // Более простое имя
				label: `Новое поле`,
				type: 'text',
				order: newOrder,
				required: false,
			}

			// Добавляем поле
			onFieldSave(-1, newField)

			// Прокручиваем к новому полю через небольшую задержку
			setTimeout(() => {
				const fieldKey = `new-field-${newOrder}`
				const fieldElement = document.querySelector(
					`[data-field-key="${fieldKey}"]`
				) as HTMLElement
				if (fieldElement) {
					fieldElement.scrollIntoView({
						behavior: 'smooth',
						block: 'center',
					})

					// Автоматически раскрываем редактор поля
					const editorToggle = fieldElement.querySelector(
						'[data-field-toggle]'
					) as HTMLButtonElement
					if (editorToggle) {
						setTimeout(() => editorToggle.click(), 300)
					}
				}
			}, 200)
		},
		[fields, onFieldSave]
	)

	if (loading) {
		return (
			<Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
				<CircularProgress size={60} />
			</Box>
		)
	}

	return (
		<Box>
			<Stack
				direction='row'
				alignItems='center'
				justifyContent='space-between'
				sx={{ mb: 2 }}
			>
				<Typography variant='h6' component='h2' sx={{ fontWeight: 500 }}>
					Поля формы
				</Typography>

				<Stack direction='row' spacing={1}>
					<Button
						variant='outlined'
						startIcon={<SectionIcon />}
						onClick={() => {
							// Создаем новый раздел
							const existingHeaders = fields.filter(
								field => field.type === 'header'
							)
							const nextSectionNumber = existingHeaders.length + 1
							const nextSectionOrder = nextSectionNumber * 100

							const newSection: Partial<FormField> = {
								name: `section_${Math.floor(Math.random() * 1000)}`,
								label: `Раздел ${nextSectionNumber}`,
								type: 'header',
								order: nextSectionOrder,
								required: false,
							}

							onFieldSave(-1, newSection)
						}}
						size='small'
						sx={{ fontSize: '0.875rem' }}
					>
						Добавить раздел
					</Button>

					<Button
						variant='contained'
						startIcon={<AddIcon />}
						onClick={onAddField}
						size='small'
						sx={{ fontSize: '0.875rem' }}
					>
						Добавить поле
					</Button>
				</Stack>
			</Stack>

			{fields.length === 0 ? (
				<Box
					sx={{
						textAlign: 'center',
						py: 4,
						color: 'text.secondary',
						border: '1px dashed',
						borderColor: 'divider',
						borderRadius: 1,
					}}
				>
					<Typography variant='subtitle2' gutterBottom>
						Поля не добавлены
					</Typography>
					<Typography variant='body2' sx={{ fontSize: '0.875rem' }}>
						Нажмите "Добавить поле" чтобы создать первое поле формы
					</Typography>
				</Box>
			) : (
				<Stack spacing={4}>
					{groupedFields.map((section, sectionIndex) => (
						<Box
							key={section.id}
							sx={{
								border: '1px solid',
								borderColor: 'divider',
								borderRadius: 2,
								overflow: 'hidden',
								bgcolor: 'background.paper',
								boxShadow: 1,
							}}
						>
							{/* Заголовок раздела */}
							{section.header ? (
								<Paper
									elevation={0}
									sx={{
										p: 2,
										bgcolor: 'primary.main',
										color: 'primary.contrastText',
										borderRadius: 0,
										position: 'relative',
									}}
								>
									<Stack direction='row' alignItems='center' spacing={1}>
										<DragIndicatorIcon
											sx={{ color: 'inherit', opacity: 0.7 }}
										/>
										<SectionIcon sx={{ color: 'inherit' }} />
										<Typography
											variant='h6'
											sx={{ fontWeight: 600, flexGrow: 1 }}
										>
											{section.header.label}
										</Typography>
										<Chip
											label={`${section.fields.length} полей`}
											size='small'
											sx={{
												bgcolor: 'rgba(255,255,255,0.2)',
												color: 'inherit',
												fontWeight: 500,
											}}
										/>
										<Tooltip title='Удалить раздел'>
											<IconButton
												size='small'
												onClick={() => deleteSection(section.header!)}
												sx={{
													color: 'inherit',
													bgcolor: 'rgba(255,255,255,0.1)',
													'&:hover': {
														bgcolor: 'rgba(255,255,255,0.2)',
													},
												}}
											>
												<DeleteIcon fontSize='small' />
											</IconButton>
										</Tooltip>
									</Stack>

									{/* Кнопка добавления поля в раздел */}
									<Box sx={{ mt: 2 }}>
										<Button
											variant='contained'
											size='small'
											startIcon={<AddIcon />}
											onClick={() => addFieldToSection(section.sectionNumber)}
											sx={{
												bgcolor: 'rgba(255,255,255,0.15)',
												color: 'inherit',
												'&:hover': {
													bgcolor: 'rgba(255,255,255,0.25)',
												},
												fontWeight: 500,
											}}
										>
											Добавить поле в этот раздел
										</Button>
									</Box>
								</Paper>
							) : (
								// Заголовок для раздела по умолчанию
								<Box
									sx={{
										p: 2,
										bgcolor: 'grey.100',
										borderBottom: '1px solid',
										borderColor: 'divider',
									}}
								>
									<Typography variant='h6' sx={{ fontWeight: 600 }}>
										Поля без раздела
									</Typography>
								</Box>
							)}

							{/* Содержимое раздела */}
							<Box sx={{ p: 2 }}>
								{/* Поля раздела */}
								{section.fields.length === 0 ? (
									<Box
										sx={{
											textAlign: 'center',
											py: 3,
											px: 2,
											color: 'text.secondary',
											border: '1px dashed',
											borderColor: 'divider',
											borderRadius: 1,
											bgcolor: 'grey.50',
										}}
									>
										<Typography variant='body2'>
											{section.header
												? 'В этом разделе пока нет полей'
												: 'Поля не добавлены'}
										</Typography>
										<Button
											variant='outlined'
											size='small'
											startIcon={<AddIcon />}
											onClick={() =>
												section.header
													? addFieldToSection(section.sectionNumber)
													: onAddField()
											}
											sx={{ mt: 1 }}
										>
											{section.header
												? 'Добавить первое поле'
												: 'Добавить поле'}
										</Button>
									</Box>
								) : (
									<Stack spacing={1}>
										{section.fields.map((field, fieldIndex) => {
											const originalIndex = fields.findIndex(f => {
												if (f._id && field._id) {
													return f._id === field._id
												}
												return f.name === field.name && f.order === field.order
											})

											const fieldKey =
												field._id || `field-${field.name}-${field.order}`

											return (
												<Box
													key={fieldKey}
													data-field-key={fieldKey}
													ref={(el: HTMLDivElement | null) => {
														fieldsRefs.current[fieldKey] = el
													}}
													sx={{
														position: 'relative',
														transition: 'all 0.2s ease-in-out',
														transform:
															dragOverIndex === originalIndex
																? 'translateY(-4px)'
																: 'translateY(0)',
														'&::before':
															dragOverIndex === originalIndex
																? {
																		content: '""',
																		position: 'absolute',
																		top: -2,
																		left: 0,
																		right: 0,
																		height: 4,
																		bgcolor: 'primary.main',
																		borderRadius: 1,
																		zIndex: 1,
																  }
																: {},
													}}
												>
													<Box
														draggable
														onDragStart={e =>
															dragHandlers.handleDragStart(
																e,
																field,
																originalIndex
															)
														}
														onDragOver={e =>
															dragHandlers.handleDragOver(e, originalIndex)
														}
														onDragLeave={dragHandlers.handleDragLeave}
														onDrop={e =>
															dragHandlers.handleDrop(e, originalIndex)
														}
														onDragEnd={dragHandlers.handleDragEnd}
														sx={{
															cursor: 'move',
															transition: 'all 0.2s ease-in-out',
															'&:hover': {
																transform: 'translateY(-2px)',
																boxShadow: 4,
															},
														}}
													>
														<FormFieldEditor
															field={field}
															onSave={updatedField =>
																onFieldSave(
																	originalIndex >= 0
																		? originalIndex
																		: fieldIndex,
																	updatedField
																)
															}
															onDelete={() =>
																onFieldDelete(
																	originalIndex >= 0
																		? originalIndex
																		: fieldIndex
																)
															}
															availableBitrixFields={bitrixFields}
															isDraggable={true}
															allFields={fields}
														/>
													</Box>
												</Box>
											)
										})}
									</Stack>
								)}
							</Box>
						</Box>
					))}
				</Stack>
			)}
		</Box>
	)
}
