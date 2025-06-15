import React, { useRef, useCallback, useState } from 'react'
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
	TextField,
	Alert,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import SectionIcon from '@mui/icons-material/ViewHeadline'
import DragIndicatorIcon from '@mui/icons-material/DragIndicator'
import DeleteIcon from '@mui/icons-material/Delete'
import EditIcon from '@mui/icons-material/Edit'
import SaveIcon from '@mui/icons-material/Save'
import CancelIcon from '@mui/icons-material/Cancel'
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
	headerIndex?: number
	fields: FormField[]
	startOrder: number
	endOrder: number
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
	const [editingSectionId, setEditingSectionId] = useState<string | null>(null)
	const [tempSectionTitle, setTempSectionTitle] = useState('')

	// Улучшенная группировка полей по разделам
	const groupedFields = React.useMemo(() => {
		const sorted = [...fields].sort((a, b) => (a.order || 0) - (b.order || 0))
		const sections: Section[] = []

		console.log(
			'🔍 Сортированные поля:',
			sorted.map(f => ({ name: f.name, type: f.type, order: f.order }))
		)

		let currentSection: Section | null = null
		let fieldsWithoutSection: FormField[] = []

		sorted.forEach((field, index) => {
			if (field.type === 'header') {
				// Если есть поля без раздела, создаем для них раздел
				if (fieldsWithoutSection.length > 0) {
					sections.push({
						id: 'section-default',
						fields: fieldsWithoutSection,
						startOrder: fieldsWithoutSection[0]?.order || 0,
						endOrder:
							fieldsWithoutSection[fieldsWithoutSection.length - 1]?.order || 0,
					})
					fieldsWithoutSection = []
				}

				// Завершаем предыдущий раздел
				if (currentSection) {
					sections.push(currentSection)
				}

				// Начинаем новый раздел
				currentSection = {
					id: `section-${field._id || field.name}`,
					header: field,
					headerIndex: fields.findIndex(f =>
						f._id ? f._id === field._id : f.name === field.name
					),
					fields: [],
					startOrder: field.order || 0,
					endOrder: field.order || 0,
				}
			} else if (field.type !== 'divider') {
				// Обычное поле
				if (currentSection) {
					currentSection.fields.push(field)
					currentSection.endOrder = field.order || currentSection.endOrder
				} else {
					fieldsWithoutSection.push(field)
				}
			}
		})

		// Добавляем последний раздел
		if (currentSection) {
			sections.push(currentSection)
		}

		// Добавляем поля без раздела в конце
		if (fieldsWithoutSection.length > 0) {
			sections.push({
				id: 'section-default',
				fields: fieldsWithoutSection,
				startOrder: fieldsWithoutSection[0]?.order || 0,
				endOrder:
					fieldsWithoutSection[fieldsWithoutSection.length - 1]?.order || 0,
			})
		}

		console.log(
			'📋 Группированные разделы:',
			sections.map(s => ({
				id: s.id,
				title: s.header?.label || 'Без раздела',
				fieldsCount: s.fields.length,
				startOrder: s.startOrder,
				endOrder: s.endOrder,
			}))
		)

		return sections
	}, [fields])

	// Функция редактирования названия раздела
	const handleStartEditingSection = (
		sectionId: string,
		currentTitle: string
	) => {
		setEditingSectionId(sectionId)
		setTempSectionTitle(currentTitle)
	}

	const handleSaveSectionTitle = (section: Section) => {
		if (!section.header || !section.headerIndex === undefined) return

		const updatedField = {
			...section.header,
			label: tempSectionTitle.trim(),
		}

		onFieldSave(section.headerIndex!, updatedField)
		setEditingSectionId(null)
		setTempSectionTitle('')
	}

	const handleCancelEditingSection = () => {
		setEditingSectionId(null)
		setTempSectionTitle('')
	}

	const handleKeyPress = (event: React.KeyboardEvent, section: Section) => {
		if (event.key === 'Enter') {
			event.preventDefault()
			handleSaveSectionTitle(section)
		} else if (event.key === 'Escape') {
			event.preventDefault()
			handleCancelEditingSection()
		}
	}

	// Функция удаления раздела
	const deleteSection = useCallback(
		(section: Section) => {
			if (!section.header || section.headerIndex === undefined) return

			// Удаляем заголовок раздела
			onFieldDelete(section.headerIndex)

			// Удаляем все поля раздела (в обратном порядке, чтобы не сбить индексы)
			const fieldIndicesToDelete = section.fields
				.map(field =>
					fields.findIndex(f =>
						f._id ? f._id === field._id : f.name === field.name
					)
				)
				.filter(index => index >= 0)
				.sort((a, b) => b - a) // Сортируем по убыванию

			fieldIndicesToDelete.forEach((index, i) => {
				setTimeout(() => onFieldDelete(index), i * 50)
			})
		},
		[fields, onFieldDelete]
	)

	// Функция добавления поля в конкретный раздел
	const addFieldToSection = useCallback(
		(section: Section) => {
			let newOrder: number

			if (section.fields.length === 0) {
				// Первое поле в разделе - ставим сразу после заголовка
				newOrder = section.startOrder + 1
			} else {
				// Следующее поле после последнего в разделе
				newOrder = section.endOrder + 1
			}

			const newField: Partial<FormField> = {
				name: `field_${Date.now()}`,
				label: `Новое поле`,
				type: 'text',
				order: newOrder,
				required: false,
			}

			onFieldSave(-1, newField)

			// Прокручиваем к новому полю
			setTimeout(() => {
				const fieldElement = document.querySelector(
					`[data-field-key="new-field-${newOrder}"]`
				) as HTMLElement
				if (fieldElement) {
					fieldElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
				}
			}, 200)
		},
		[onFieldSave]
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
				sx={{ mb: 3 }}
			>
				<Typography variant='h6' component='h2' sx={{ fontWeight: 600 }}>
					Поля формы
				</Typography>

				<Stack direction='row' spacing={1}>
					<Button
						variant='outlined'
						startIcon={<SectionIcon />}
						onClick={() => {
							const existingHeaders = fields.filter(
								field => field.type === 'header'
							)
							const nextSectionNumber = existingHeaders.length + 1
							const maxOrder = Math.max(...fields.map(f => f.order || 0), 0)
							const nextSectionOrder = Math.max(
								maxOrder + 100,
								nextSectionNumber * 100
							)

							const newSection: Partial<FormField> = {
								name: `section_${Date.now()}`,
								label: `Раздел ${nextSectionNumber}`,
								type: 'header',
								order: nextSectionOrder,
								required: false,
							}

							onFieldSave(-1, newSection)
						}}
						size='small'
					>
						Добавить раздел
					</Button>

					<Button
						variant='contained'
						startIcon={<AddIcon />}
						onClick={onAddField}
						size='small'
					>
						Добавить поле
					</Button>
				</Stack>
			</Stack>

			{fields.length === 0 ? (
				<Alert severity='info' sx={{ textAlign: 'center' }}>
					<Typography variant='subtitle2' gutterBottom>
						Поля не добавлены
					</Typography>
					<Typography variant='body2'>
						Нажмите "Добавить поле" чтобы создать первое поле формы
					</Typography>
				</Alert>
			) : (
				<Stack spacing={3}>
					{groupedFields.map((section, sectionIndex) => (
						<Paper
							key={section.id}
							elevation={2}
							sx={{
								borderRadius: 2,
								overflow: 'hidden',
								border: '1px solid',
								borderColor: 'divider',
							}}
						>
							{/* Заголовок раздела */}
							{section.header ? (
								<Box
									sx={{
										p: 2,
										bgcolor: 'primary.main',
										color: 'primary.contrastText',
									}}
								>
									<Stack direction='row' alignItems='center' spacing={1}>
										<DragIndicatorIcon sx={{ opacity: 0.7 }} />
										<SectionIcon />

										{editingSectionId === section.id ? (
											<Box
												sx={{
													display: 'flex',
													alignItems: 'center',
													gap: 1,
													flex: 1,
												}}
											>
												<TextField
													value={tempSectionTitle}
													onChange={e => setTempSectionTitle(e.target.value)}
													onKeyDown={e => handleKeyPress(e, section)}
													variant='outlined'
													size='small'
													autoFocus
													sx={{
														flex: 1,
														'& .MuiOutlinedInput-root': {
															bgcolor: 'rgba(255,255,255,0.9)',
															fontSize: '1.1rem',
															fontWeight: 600,
														},
													}}
												/>
												<Tooltip title='Сохранить'>
													<IconButton
														onClick={() => handleSaveSectionTitle(section)}
														size='small'
														sx={{ color: 'inherit' }}
													>
														<SaveIcon />
													</IconButton>
												</Tooltip>
												<Tooltip title='Отменить'>
													<IconButton
														onClick={handleCancelEditingSection}
														size='small'
														sx={{ color: 'inherit' }}
													>
														<CancelIcon />
													</IconButton>
												</Tooltip>
											</Box>
										) : (
											<>
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
												<Tooltip title='Редактировать название'>
													<IconButton
														size='small'
														onClick={() =>
															handleStartEditingSection(
																section.id,
																section.header!.label
															)
														}
														sx={{
															color: 'inherit',
															bgcolor: 'rgba(255,255,255,0.1)',
															'&:hover': { bgcolor: 'rgba(255,255,255,0.2)' },
														}}
													>
														<EditIcon fontSize='small' />
													</IconButton>
												</Tooltip>
												<Tooltip title='Удалить раздел'>
													<IconButton
														size='small'
														onClick={() => deleteSection(section)}
														sx={{
															color: 'inherit',
															bgcolor: 'rgba(255,255,255,0.1)',
															'&:hover': { bgcolor: 'rgba(255,255,255,0.2)' },
														}}
													>
														<DeleteIcon fontSize='small' />
													</IconButton>
												</Tooltip>
											</>
										)}
									</Stack>

									{/* Кнопка добавления поля в раздел */}
									<Box sx={{ mt: 2 }}>
										<Button
											variant='contained'
											size='small'
											startIcon={<AddIcon />}
											onClick={() => addFieldToSection(section)}
											sx={{
												bgcolor: 'rgba(255,255,255,0.15)',
												color: 'inherit',
												'&:hover': { bgcolor: 'rgba(255,255,255,0.25)' },
												fontWeight: 500,
											}}
										>
											Добавить поле в этот раздел
										</Button>
									</Box>
								</Box>
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
									<Stack direction='row' alignItems='center' spacing={1}>
										<SectionIcon sx={{ color: 'text.secondary' }} />
										<Typography
											variant='h6'
											sx={{ fontWeight: 600, color: 'text.secondary' }}
										>
											Поля без раздела
										</Typography>
										<Chip
											label={`${section.fields.length} полей`}
											size='small'
											variant='outlined'
										/>
									</Stack>
								</Box>
							)}

							{/* Содержимое раздела */}
							<Box sx={{ p: 2 }}>
								{section.fields.length === 0 ? (
									<Box
										sx={{
											textAlign: 'center',
											py: 4,
											px: 2,
											color: 'text.secondary',
											border: '2px dashed',
											borderColor: 'divider',
											borderRadius: 2,
											bgcolor: 'grey.50',
										}}
									>
										<Typography variant='body2' gutterBottom>
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
													? addFieldToSection(section)
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
									<Stack spacing={2}>
										{section.fields.map(field => {
											const originalIndex = fields.findIndex(f =>
												f._id ? f._id === field._id : f.name === field.name
											)
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
																onFieldSave(originalIndex, updatedField)
															}
															onDelete={() => onFieldDelete(originalIndex)}
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
						</Paper>
					))}
				</Stack>
			)}
		</Box>
	)
}
