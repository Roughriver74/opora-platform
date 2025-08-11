import React, { useRef, useCallback, useState, useEffect } from 'react'
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
	Badge,
	Checkbox,
	FormControlLabel,
	Menu,
	MenuItem,
	Divider,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import SectionIcon from '@mui/icons-material/ViewHeadline'
import DeleteIcon from '@mui/icons-material/Delete'
import EditIcon from '@mui/icons-material/Edit'
import SaveIcon from '@mui/icons-material/Save'
import CancelIcon from '@mui/icons-material/Cancel'
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank'
import CheckBoxIcon from '@mui/icons-material/CheckBox'
import MoveToInboxIcon from '@mui/icons-material/MoveToInbox'
import SelectAllIcon from '@mui/icons-material/SelectAll'

import { FormField } from '../../../../types'
import FormFieldEditor from '../../FormFieldEditor'
import { DragHandlers } from '../types'

interface FieldsListProps {
	fields: FormField[]
	loading: boolean
	bitrixFields: Record<string, any>
	dragOverIndex: number | null
	onAddField: () => void
	onAddSection: () => void
	onAddFieldToSection: (sectionOrder: number) => void
	onFieldSave: (index: number, field: Partial<FormField>) => void
	onFieldDelete: (index: number) => void
	onMoveFieldToSection: (
		fieldId: string,
		targetSectionOrder: number,
		newPosition?: number
	) => void
	onNormalizeOrders: () => void
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
	onAddSection,
	onAddFieldToSection,
	onFieldSave,
	onFieldDelete,
	onMoveFieldToSection,
	onNormalizeOrders,
	dragHandlers,
}) => {
	const fieldsRefs = useRef<Record<string, HTMLDivElement | null>>({})
	const containerRef = useRef<HTMLDivElement | null>(null)
	const scrollPositionRef = useRef<number>(0)

	// Состояния для редактирования разделов
	const [editingSectionId, setEditingSectionId] = useState<string | null>(null)
	const [tempSectionTitle, setTempSectionTitle] = useState('')

	// Локальное состояние для изменений порядка разделов (до сохранения)
	const [localOrderChanges, setLocalOrderChanges] = useState<
		Record<string, number>
	>({})

	// Состояние для управления раскрытыми аккордеонами
	const [expandedAccordions, setExpandedAccordions] = useState<
		Record<string, boolean>
	>({})

	// Состояния для множественного выбора полей
	const [selectedFields, setSelectedFields] = useState<Set<string>>(new Set())
	const [selectionMode, setSelectionMode] = useState(false)
	const [moveMenuAnchor, setMoveMenuAnchor] = useState<null | HTMLElement>(null)

	// Сохранение позиции прокрутки
	const saveScrollPosition = useCallback(() => {
		if (containerRef.current) {
			scrollPositionRef.current =
				window.pageYOffset || document.documentElement.scrollTop
		}
	}, [])

	// Восстановление позиции прокрутки
	const restoreScrollPosition = useCallback(() => {
		if (scrollPositionRef.current > 0) {
			setTimeout(() => {
				window.scrollTo({
					top: scrollPositionRef.current,
					behavior: 'auto', // Без анимации для мгновенного восстановления
				})
			}, 50) // Небольшая задержка для завершения рендеринга
		}
	}, [])

	// Обёртка для onFieldSave с сохранением позиции
	const handleFieldSaveWithScroll = useCallback(
		(index: number, field: Partial<FormField>) => {
			saveScrollPosition()
			onFieldSave(index, field)
		},
		[onFieldSave, saveScrollPosition]
	)

	// Восстановление позиции при изменении полей
	useEffect(() => {
		restoreScrollPosition()
	}, [fields, restoreScrollPosition])

	// Проверяем, что fields определен и является массивом
	const safeFields = Array.isArray(fields) ? fields : []
	const safeBitrixFields = bitrixFields || {}

	// Логирование для диагностики
	console.log('FieldsList debug:', {
		fieldsLength: fields?.length || 0,
		loading,
		bitrixFieldsKeys: Object.keys(bitrixFields || {}).length,
		dragOverIndex,
	})

	// Улучшенная группировка полей по разделам
	const groupedFields = React.useMemo(() => {
		const sorted = [...safeFields].sort(
			(a, b) => (a.order || 0) - (b.order || 0)
		)
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
					headerIndex: safeFields.findIndex(f =>
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
	}, [safeFields])

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

		handleFieldSaveWithScroll(section.headerIndex!, updatedField)
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

	// Функции для множественного выбора полей
	const toggleSelectionMode = useCallback(() => {
		setSelectionMode(prev => !prev)
		if (selectionMode) {
			setSelectedFields(new Set())
		}
	}, [selectionMode])

	const toggleFieldSelection = useCallback((fieldId: string) => {
		setSelectedFields(prev => {
			const newSelection = new Set(prev)
			if (newSelection.has(fieldId)) {
				newSelection.delete(fieldId)
			} else {
				newSelection.add(fieldId)
			}
			return newSelection
		})
	}, [])

	const selectAllFields = useCallback(() => {
		const allFieldIds = safeFields
			.filter(field => field.type !== 'header' && field.type !== 'divider')
			.map(field => field._id || field.name)
		setSelectedFields(new Set(allFieldIds))
	}, [safeFields])

	const handleMoveToSection = useCallback(
		(targetSectionOrder: number) => {
			if (selectedFields.size === 0) return

			console.log(
			`📦 Перемещаем ${selectedFields.size} полей в раздел с order ${targetSectionOrder}`
			)

			// Перемещаем каждое выбранное поле
			Array.from(selectedFields).forEach(fieldId => {
				onMoveFieldToSection(fieldId, targetSectionOrder)
			})

			// Очищаем выбор и выходим из режима выбора
			setSelectedFields(new Set())
			setSelectionMode(false)
			setMoveMenuAnchor(null)
		},
		[selectedFields, onMoveFieldToSection]
	)

	const openMoveMenu = useCallback((event: React.MouseEvent<HTMLElement>) => {
		setMoveMenuAnchor(event.currentTarget)
	}, [])

	const closeMoveMenu = useCallback(() => {
		setMoveMenuAnchor(null)
	}, [])

	// Функция применения локальных изменений порядка разделов
	const applyLocalOrderChanges = useCallback(async () => {
		if (Object.keys(localOrderChanges).length === 0) {
			// Если нет локальных изменений, просто вызываем нормализацию
			onNormalizeOrders()
			return
		}

		console.log(
		'🔄 Применяем локальные изменения порядка разделов:',
			localOrderChanges
		)

		// Создаем массив всех обновлений (разделы + их поля)
		const allUpdatePromises: Promise<void>[] = []

		// Применяем все локальные изменения к соответствующим разделам и их полям
		for (const [sectionId, newSectionOrder] of Object.entries(
			localOrderChanges
		)) {
			// Находим раздел и его индекс
			const section = groupedFields.find(s => s.id === sectionId)
			if (!section?.header || section.headerIndex === undefined) {
				console.warn(
					`⚠️ Раздел ${sectionId} не найден для применения изменений`
				)
				continue
			}

			// Убеждаемся что header существует для TypeScript
			const sectionHeader = section.header
			const oldSectionOrder = sectionHeader.order || 0

			console.log({
			oldOrder: oldSectionOrder,
				newOrder: newSectionOrder,
				fieldsCount: section.fields.length,
			})

			// 1. Обновляем сам раздел
			const updatedSectionField = {
				...sectionHeader,
				order: newSectionOrder,
			}

			allUpdatePromises.push(
				new Promise<void>((resolve, reject) => {
					try {
						console.log(
						`📝 Обновляем раздел ${sectionHeader.name}: ${oldSectionOrder} → ${newSectionOrder}`
						)
						onFieldSave(section.headerIndex!, updatedSectionField)
						resolve()
					} catch (error) {
						reject(error)
					}
				})
			)

			// 2. Обновляем все поля внутри раздела
			section.fields.forEach((field, fieldIndex) => {
				// Находим глобальный индекс поля
				const globalFieldIndex = safeFields.findIndex(f =>
					f._id ? f._id === field._id : f.name === field.name
				)

				if (globalFieldIndex === -1) {
					console.warn(`⚠️ Глобальный индекс поля ${field.name} не найден`)
					return
				}

				// Вычисляем новый order для поля: новый порядок раздела + позиция поля + 1
				const oldFieldOrder = field.order || 0
				const newFieldOrder =
					parseInt(newSectionOrder.toString()) + fieldIndex + 1

				console.log(
				`🔍 Анализ поля "${field.name}": section=${newSectionOrder}, fieldIndex=${fieldIndex}, newOrder=${newFieldOrder}`
				)

				if (oldFieldOrder !== newFieldOrder) {
					const updatedField = {
						...field,
						order: newFieldOrder,
					}

					console.log(
					`🔹 Перемещаем поле "${field.name}": ${oldFieldOrder} → ${newFieldOrder}`
					)

					allUpdatePromises.push(
						new Promise<void>((resolve, reject) => {
							try {
								onFieldSave(globalFieldIndex, updatedField)
								resolve()
							} catch (error) {
								reject(error)
							}
						})
					)
				} else {
					console.log(
					`⏭️ Поле "${field.name}" остается на месте: order=${oldFieldOrder}`
					)
				}
			})
		}

		try {
			// Ждем выполнения всех обновлений (разделы + поля)
			await Promise.all(allUpdatePromises)

			// Очищаем локальные изменения
			setLocalOrderChanges({})

			console.log(
			'✅ Все изменения применены, запускаем финальную нормализацию...'
			)

			// Финальная нормализация для исправления возможных конфликтов порядка
			setTimeout(() => {
				onNormalizeOrders()
			}, 500) // Небольшая задержка чтобы обновления успели сохраниться
		} catch (error) {
			console.error('❌ Ошибка при применении локальных изменений:', error)
		}
	}, [
		localOrderChanges,
		groupedFields,
		onFieldSave,
		onNormalizeOrders,
		safeFields,
	])

	// Функция удаления раздела
	const deleteSection = useCallback(
		(section: Section) => {
			if (!section.header || section.headerIndex === undefined) return

			// Удаляем заголовок раздела
			onFieldDelete(section.headerIndex)

			// Удаляем все поля раздела (в обратном порядке, чтобы не сбить индексы)
			const fieldIndicesToDelete = section.fields
				.map(field =>
					safeFields.findIndex(f =>
						f._id ? f._id === field._id : f.name === field.name
					)
				)
				.filter(index => index >= 0)
				.sort((a, b) => b - a) // Сортируем по убыванию

			fieldIndicesToDelete.forEach((index, i) => {
				setTimeout(() => onFieldDelete(index), i * 50)
			})
		},
		[safeFields, onFieldDelete]
	)

	// Функция добавления поля в конкретный раздел
	const addFieldToSectionLocal = useCallback(
		(section: Section) => {
			onAddFieldToSection(section.startOrder)
		},
		[onAddFieldToSection]
	)

	// Функция для переключения состояния аккордеона
	const handleAccordionChange = useCallback(
		(fieldKey: string, expanded: boolean) => {
			setExpandedAccordions(prev => ({
				...prev,
				[fieldKey]: expanded,
			}))
		},
		[]
	)

	if (loading) {
		return (
			<Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
				<CircularProgress size={60} />
			</Box>
		)
	}

	return (
		<Box ref={containerRef}>
			<Stack
				direction='row'
				alignItems='center'
				justifyContent='space-between'
				sx={{ mb: 3 }}
			>
				<Box>
					<Typography variant='h6' component='h2' sx={{ fontWeight: 600 }}>
						Поля формы
					</Typography>
					{selectionMode && (
						<Typography variant='body2' color='secondary.main' sx={{ mt: 0.5 }}>
							Режим выбора активен. Выберите поля и нажмите "Переместить"
						</Typography>
					)}
				</Box>

				<Stack direction='row' spacing={1}>
					<Button
						variant='outlined'
						startIcon={<SectionIcon />}
						onClick={onAddSection}
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

					{/* Кнопки для множественного выбора */}
					<Button
						variant={selectionMode ? 'contained' : 'outlined'}
						startIcon={
							selectionMode ? <CheckBoxIcon /> : <CheckBoxOutlineBlankIcon />
						}
						onClick={toggleSelectionMode}
						size='small'
						color={selectionMode ? 'secondary' : 'primary'}
					>
						{selectionMode ? 'Отменить' : 'Выбрать'}
					</Button>

					{selectionMode && (
						<>
							<Button
								variant='outlined'
								startIcon={<SelectAllIcon />}
								onClick={selectAllFields}
								size='small'
								disabled={selectedFields.size === safeFields.length}
							>
								Все
							</Button>

							<Badge
								badgeContent={selectedFields.size}
								color='secondary'
								sx={{ '& .MuiBadge-badge': { fontSize: '0.7rem' } }}
							>
								<Button
									variant='contained'
									startIcon={<MoveToInboxIcon />}
									onClick={openMoveMenu}
									size='small'
									disabled={selectedFields.size === 0}
									color='secondary'
								>
									Переместить
								</Button>
							</Badge>
						</>
					)}

					<Badge
						badgeContent={Object.keys(localOrderChanges).length}
						color='error'
						sx={{ '& .MuiBadge-badge': { fontSize: '0.7rem' } }}
					>
						<Button
							variant='outlined'
							color='warning'
							onClick={applyLocalOrderChanges}
							size='small'
							title={`Применить ${
								Object.keys(localOrderChanges).length
							} локальных изменений порядка разделов и исправить порядок всех полей`}
							sx={{
								bgcolor:
									Object.keys(localOrderChanges).length > 0
										? 'warning.light'
										: 'transparent',
								color:
									Object.keys(localOrderChanges).length > 0
										? 'warning.contrastText'
										: 'warning.main',
							}}
						>
							Исправить порядок
						</Button>
					</Badge>
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
										{/* Редактирование порядка раздела */}
										<Tooltip title='Введите порядок раздела (100, 200, 300...) и нажмите "Исправить порядок"'>
											<TextField
												size='small'
												type='number'
												value={
													localOrderChanges[section.id] ??
													section.header?.order ??
													0
												}
												onChange={e => {
													// НЕ сохраняем в БД, только обновляем локальное состояние
													const newOrder = parseInt(e.target.value) || 0
													console.log(
													'📝 Локальное изменение порядка раздела:',
														{
															sectionId: section.id,
															sectionName: section.header?.name,
															oldOrder: section.header?.order,
															newOrder,
															note: 'НЕ сохраняется в БД до нажатия "Исправить порядок"',
														}
													)

													// Сохраняем изменение в локальном состоянии
													setLocalOrderChanges(prev => ({
														...prev,
														[section.id]: newOrder,
													}))
												}}
												sx={{
													width: 80,
													'& .MuiOutlinedInput-root': {
														bgcolor: 'rgba(255,255,255,0.9)',
														fontSize: '0.875rem',
														// Подсветка что поле изменено, но не сохранено
														border:
															localOrderChanges[section.id] !== undefined
																? '2px solid orange'
																: 'none',
													},
												}}
												inputProps={{ min: 0, step: 100 }}
											/>
										</Tooltip>
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
													{section.header?.label || 'Раздел'}
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
																section.header?.label || 'Раздел'
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
											onClick={() => addFieldToSectionLocal(section)}
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
													? addFieldToSectionLocal(section)
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
											const originalIndex = safeFields.findIndex(f =>
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
														sx={{
															display: 'flex',
															alignItems: 'flex-start',
															gap: 1,
														}}
													>
														{/* Чекбокс для множественного выбора */}
														{selectionMode &&
															field.type !== 'header' &&
															field.type !== 'divider' && (
																<FormControlLabel
																	control={
																		<Checkbox
																			checked={selectedFields.has(
																				field._id || field.name
																			)}
																			onChange={() =>
																				toggleFieldSelection(
																					field._id || field.name
																				)
																			}
																			size='small'
																			color='secondary'
																		/>
																	}
																	label=''
																	sx={{
																		m: 0,
																		mt: 1,
																		'& .MuiFormControlLabel-label': {
																			display: 'none',
																		},
																	}}
																/>
															)}

														<Box
															draggable={!selectionMode}
															onDragStart={e =>
																!selectionMode &&
																dragHandlers.handleDragStart(
																	e,
																	field,
																	originalIndex
																)
															}
															onDragOver={e =>
																!selectionMode &&
																dragHandlers.handleDragOver(e, originalIndex)
															}
															onDragLeave={dragHandlers.handleDragLeave}
															onDrop={e =>
																!selectionMode &&
																dragHandlers.handleDrop(e, originalIndex)
															}
															onDragEnd={dragHandlers.handleDragEnd}
															sx={{
																flex: 1,
																cursor: selectionMode ? 'default' : 'move',
																transition: 'all 0.2s ease-in-out',
																'&:hover': selectionMode
																	? {}
																	: {
																			transform: 'translateY(-2px)',
																			boxShadow: 4,
																	  },
																opacity: selectedFields.has(
																	field._id || field.name
																)
																	? 0.7
																	: 1,
																border: selectedFields.has(
																	field._id || field.name
																)
																	? '2px solid'
																	: 'none',
																borderColor: 'secondary.main',
																borderRadius: 1,
															}}
														>
															<FormFieldEditor
																field={field}
																onSave={updatedField =>
																	handleFieldSaveWithScroll(
																		originalIndex,
																		updatedField
																	)
																}
																onDelete={() => onFieldDelete(originalIndex)}
																availableBitrixFields={safeBitrixFields}
																isDraggable={!selectionMode}
																allFields={safeFields}
																expanded={expandedAccordions[fieldKey] ?? false}
																onExpandedChange={expanded =>
																	handleAccordionChange(fieldKey, expanded)
																}
															/>
														</Box>
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

			{/* Меню для выбора целевого раздела */}
			<Menu
				anchorEl={moveMenuAnchor}
				open={Boolean(moveMenuAnchor)}
				onClose={closeMoveMenu}
				transformOrigin={{ horizontal: 'right', vertical: 'top' }}
				anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
			>
				<MenuItem disabled>
					<Typography variant='subtitle2' color='text.secondary'>
						Переместить {selectedFields.size} полей в:
					</Typography>
				</MenuItem>
				<Divider />

				{/* Опция для перемещения в поля без раздела */}
				<MenuItem
					onClick={() => handleMoveToSection(0)}
					sx={{
						minWidth: 200,
						display: 'flex',
						alignItems: 'center',
						gap: 1,
					}}
				>
					<SectionIcon fontSize='small' />
					<Typography>Поля без раздела</Typography>
				</MenuItem>

				{/* Опции для перемещения в существующие разделы */}
				{groupedFields
					.filter(section => section.header) // Только разделы с заголовками
					.map(section => (
						<MenuItem
							key={section.id}
							onClick={() => handleMoveToSection(section.header?.order || 0)}
							sx={{
								minWidth: 200,
								display: 'flex',
								alignItems: 'center',
								gap: 1,
							}}
						>
							<SectionIcon fontSize='small' />
							<Typography>
								{section.header?.label || section.header?.name || 'Раздел'}
							</Typography>
							<Chip
								label={`order: ${section.header?.order}`}
								size='small'
								variant='outlined'
								sx={{ ml: 'auto', fontSize: '0.7rem' }}
							/>
						</MenuItem>
					))}
			</Menu>
		</Box>
	)
}
