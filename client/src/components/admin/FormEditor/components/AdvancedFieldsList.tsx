import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import {
	Box,
	Stack,
	Typography,
	Button,
	Paper,
	IconButton,
	Tooltip,
	TextField,
	Alert,
	Chip,
	Collapse,
	useTheme,
	alpha,
	Badge,
	Zoom,
	Slide,
} from '@mui/material'
import {
	Add as AddIcon,
	DragIndicator as DragIcon,
	Delete as DeleteIcon,
	Edit as EditIcon,
	ViewHeadline as SectionIcon,
	AutoFixHigh as NormalizeIcon,
	VisibilityOff as VisibilityOffIcon,
	SelectAll as SelectAllIcon,
	Clear as ClearIcon,
	Settings as SettingsIcon,
} from '@mui/icons-material'
import { TransitionGroup } from 'react-transition-group'
import { FormField } from '../../../../types'
import { useAdvancedDragAndDrop } from '../hooks/useAdvancedDragAndDrop'
import { FormEditorState } from '../types'
import { getOrderedElements, validateOrder } from '../utils/newOrderSystem'
import { FormFieldModal } from './FormFieldModal'
import '../styles/dragAndDrop.css'

interface AdvancedFieldsListProps {
	state: FormEditorState
	setState: React.Dispatch<React.SetStateAction<FormEditorState>>
	onAddField: () => void
	onAddSection: () => void
	onFieldSave: (index: number, field: Partial<FormField>) => void
	onFieldDelete: (index: number) => void
	onLoadFields?: () => Promise<void>
}

interface KeyboardHintsProps {
	isVisible: boolean
	onClose: () => void
}

const KeyboardHints: React.FC<KeyboardHintsProps> = ({
	isVisible,
	onClose,
}) => {
	useEffect(() => {
		if (!isVisible) return

		const timer = setTimeout(() => {
			onClose()
		}, 8000)

		return () => clearTimeout(timer)
	}, [isVisible, onClose])

	if (!isVisible) return null

	return (
		<div className='keyboard-hints'>
			<div className='hint-item'>
				<span className='key'>↑/↓</span>
				<span>Навигация</span>
			</div>
			<div className='hint-item'>
				<span className='key'>Enter</span>
				<span>Редактировать</span>
			</div>
			<div className='hint-item'>
				<span className='key'>Del</span>
				<span>Удалить</span>
			</div>
			<div className='hint-item'>
				<span className='key'>Ctrl+A</span>
				<span>Выбрать все</span>
			</div>
			<div className='hint-item'>
				<span className='key'>Ctrl+C</span>
				<span>Копировать</span>
			</div>
			<div className='hint-item'>
				<span className='key'>Esc</span>
				<span>Отменить</span>
			</div>
		</div>
	)
}

interface AdvancedFieldItemProps {
	element: {
		id: string
		type: 'section' | 'field'
		field: FormField
		order: number
		originalIndex: number
	}
	index: number
	isSelected: boolean
	isDraggedOver: boolean
	isDragging: boolean
	onSelect: (id: string) => void
	onEdit: (index: number) => void
	onDelete: (index: number) => void
	onOrderChange: (elementId: string, newOrder: number) => void
	onDragStart: (
		e: React.DragEvent<HTMLDivElement>,
		elementId: string,
		index: number
	) => void
	isFocused: boolean
}

const AdvancedFieldItem: React.FC<AdvancedFieldItemProps> = ({
	element,
	index,
	isSelected,
	isDraggedOver,
	isDragging,
	onSelect,
	onEdit,
	onDelete,
	onOrderChange,
	onDragStart,
	isFocused,
}) => {
	const theme = useTheme()
	const [isEditing, setIsEditing] = useState(false)
	const [tempOrder, setTempOrder] = useState(element.order)
	const itemRef = useRef<HTMLDivElement>(null)

	// Автофокус при навигации с клавиатуры
	useEffect(() => {
		if (isFocused && itemRef.current) {
			itemRef.current.focus()
		}
	}, [isFocused])

	// Цвета для разных типов полей
	const getFieldTypeColor = (type: string): string => {
		const colors: Record<string, string> = {
			header: '#9c27b0',
			text: '#2196f3',
			email: '#ff9800',
			phone: '#4caf50',
			select: '#f44336',
			checkbox: '#795548',
			radio: '#607d8b',
			textarea: '#3f51b5',
			number: '#009688',
			date: '#e91e63',
			file: '#ff5722',
			divider: '#757575',
		}
		return colors[type] || '#666'
	}

	// Иконки для разных типов полей
	const getFieldTypeIcon = (type: string): React.ReactNode => {
		const iconStyle = { fontSize: 18, color: getFieldTypeColor(type) }
		switch (type) {
			case 'header':
				return <SectionIcon sx={iconStyle} />
			case 'text':
				return <EditIcon sx={iconStyle} />
			case 'email':
				return <span style={{ ...iconStyle, fontFamily: 'monospace' }}>@</span>
			case 'phone':
				return <span style={{ ...iconStyle, fontFamily: 'monospace' }}>📞</span>
			case 'select':
				return <span style={{ ...iconStyle, fontFamily: 'monospace' }}>▼</span>
			case 'checkbox':
				return <span style={{ ...iconStyle, fontFamily: 'monospace' }}>☑</span>
			case 'radio':
				return <span style={{ ...iconStyle, fontFamily: 'monospace' }}>◉</span>
			case 'textarea':
				return <span style={{ ...iconStyle, fontFamily: 'monospace' }}>▢</span>
			case 'number':
				return (
					<span style={{ ...iconStyle, fontFamily: 'monospace' }}>123</span>
				)
			case 'date':
				return <span style={{ ...iconStyle, fontFamily: 'monospace' }}>📅</span>
			case 'file':
				return <span style={{ ...iconStyle, fontFamily: 'monospace' }}>📎</span>
			case 'divider':
				return <span style={{ ...iconStyle, fontFamily: 'monospace' }}>─</span>
			default:
				return <span style={{ ...iconStyle, fontFamily: 'monospace' }}>?</span>
		}
	}

	// Обработка клавиатурных событий
	const handleKeyDown = (e: React.KeyboardEvent) => {
		switch (e.key) {
			case 'Enter':
				e.preventDefault()
				onEdit(element.originalIndex)
				break
			case 'Delete':
				e.preventDefault()
				onDelete(element.originalIndex)
				break
			case ' ':
				e.preventDefault()
				onSelect(element.id)
				break
			case 'ArrowUp':
				e.preventDefault()
				// Логика навигации вверх будет в родительском компоненте
				break
			case 'ArrowDown':
				e.preventDefault()
				// Логика навигации вниз будет в родительском компоненте
				break
		}
	}

	// Обработка изменения порядка
	const handleOrderSubmit = () => {
		if (tempOrder !== element.order) {
			onOrderChange(element.id, tempOrder)
		}
		setIsEditing(false)
	}

	const handleKeyPress = (e: React.KeyboardEvent) => {
		if (e.key === 'Enter') {
			handleOrderSubmit()
		}
	}

	// Сброс временного порядка при выходе из режима редактирования
	useEffect(() => {
		if (!isEditing) {
			setTempOrder(element.order)
		}
	}, [isEditing, element.order])

	const containerClassName = [
		element.type === 'section' ? 'section-container' : 'field-container',
		isDragging ? 'dragging' : '',
		isDraggedOver ? 'drag-over' : '',
		isSelected ? 'selected' : '',
	]
		.filter(Boolean)
		.join(' ')

	return (
		<Zoom in={true} timeout={300}>
			<Paper
				ref={itemRef}
				elevation={isDragging ? 6 : isSelected ? 3 : 1}
				className={containerClassName}
				tabIndex={0}
				onKeyDown={handleKeyDown}
				onMouseDown={e => e.preventDefault()} // Предотвращаем стандартный focus
				onClick={() => onSelect(element.id)}
				sx={{
					p: 2,
					mb: 1,
					cursor: 'pointer',
					userSelect: 'none',
					outline: isFocused
						? `2px solid ${theme.palette.primary.main}`
						: 'none',
					outlineOffset: 2,
					transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
					transform: isDragging
						? 'scale(0.95)'
						: isSelected
						? 'scale(1.02)'
						: 'scale(1)',
					opacity: isDragging ? 0.7 : 1,
					bgcolor: isDraggedOver
						? alpha(theme.palette.primary.main, 0.1)
						: isSelected
						? alpha(theme.palette.primary.main, 0.08)
						: 'background.paper',
					border: isDraggedOver
						? `2px dashed ${theme.palette.primary.main}`
						: isSelected
						? `2px solid ${theme.palette.primary.main}`
						: `1px solid ${alpha(theme.palette.divider, 0.12)}`,
					borderRadius: 2,
					'&:hover': {
						bgcolor: alpha(theme.palette.primary.main, 0.04),
						transform: isDragging ? 'scale(0.95)' : 'scale(1.01)',
						boxShadow: theme.shadows[3],
					},
					'&:focus': {
						bgcolor: alpha(theme.palette.primary.main, 0.06),
					},
				}}
			>
				<Stack direction='row' alignItems='center' spacing={2}>
					{/* Drag Handle */}
					<Tooltip title='Перетащите для изменения порядка'>
						<Box
							className='drag-handle'
							onMouseDown={e => onDragStart(e as any, element.id, index)}
							sx={{
								display: 'flex',
								alignItems: 'center',
								justifyContent: 'center',
								p: 1,
								borderRadius: 1,
								'&:hover': {
									bgcolor: alpha(theme.palette.primary.main, 0.1),
								},
							}}
						>
							<DragIcon />
						</Box>
					</Tooltip>

					{/* Order Chip */}
					{isEditing ? (
						<TextField
							size='small'
							type='number'
							value={tempOrder}
							onChange={e => setTempOrder(Number(e.target.value))}
							onBlur={handleOrderSubmit}
							onKeyPress={handleKeyPress}
							inputProps={{ min: 1, max: 999 }}
							sx={{ width: 70 }}
							autoFocus
						/>
					) : (
						<Tooltip title='Кликните для изменения порядка'>
							<Badge
								badgeContent={isSelected ? '✓' : null}
								color='secondary'
								anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
							>
								<Chip
									label={element.order}
									size='small'
									clickable
									className='order-chip'
									onClick={e => {
										e.stopPropagation()
										setIsEditing(true)
									}}
									sx={{
										bgcolor: getFieldTypeColor(element.field.type),
										color: 'white',
										fontWeight: 600,
										'&:hover': {
											bgcolor: alpha(
												getFieldTypeColor(element.field.type),
												0.8
											),
										},
									}}
								/>
							</Badge>
						</Tooltip>
					)}

					{/* Field Type Icon */}
					<Box sx={{ display: 'flex', alignItems: 'center', minWidth: 24 }}>
						{getFieldTypeIcon(element.field.type)}
					</Box>

					{/* Field Info */}
					<Box sx={{ flex: 1 }}>
						<Typography variant='body2' fontWeight='medium'>
							{element.field.label || element.field.name}
						</Typography>
						<Typography variant='caption' color='text.secondary'>
							{element.field.type}
							{element.field.required && ' • Обязательное'}
							{element.field.name && ` • ${element.field.name}`}
						</Typography>
					</Box>

					{/* Status Indicators */}
					<Stack direction='row' spacing={1}>
						{element.field.required && (
							<Tooltip title='Обязательное поле'>
								<Chip
									label='*'
									size='small'
									color='error'
									sx={{ minWidth: 20, height: 20 }}
								/>
							</Tooltip>
						)}
						{(element.field as any).visible === false && (
							<Tooltip title='Скрытое поле'>
								<VisibilityOffIcon
									sx={{ fontSize: 16, color: 'text.secondary' }}
								/>
							</Tooltip>
						)}
					</Stack>

					{/* Actions */}
					<Stack direction='row' spacing={1}>
						<Tooltip title='Редактировать'>
							<IconButton
								size='small'
								onClick={e => {
									e.stopPropagation()
									onEdit(element.originalIndex)
								}}
								sx={{
									color: 'text.secondary',
									'&:hover': {
										color: 'primary.main',
										bgcolor: alpha(theme.palette.primary.main, 0.1),
									},
								}}
							>
								<EditIcon fontSize='small' />
							</IconButton>
						</Tooltip>
						<Tooltip title='Удалить'>
							<IconButton
								size='small'
								onClick={e => {
									e.stopPropagation()
									onDelete(element.originalIndex)
								}}
								sx={{
									color: 'text.secondary',
									'&:hover': {
										color: 'error.main',
										bgcolor: alpha(theme.palette.error.main, 0.1),
									},
								}}
							>
								<DeleteIcon fontSize='small' />
							</IconButton>
						</Tooltip>
					</Stack>
				</Stack>
			</Paper>
		</Zoom>
	)
}

export const AdvancedFieldsList: React.FC<AdvancedFieldsListProps> = ({
	state,
	setState,
	onAddField,
	onAddSection,
	onFieldSave,
	onFieldDelete,
	onLoadFields,
}) => {
	const containerRef = useRef<HTMLDivElement>(null)

	// Состояние компонента
	const [selectedElements, setSelectedElements] = useState<Set<string>>(
		new Set()
	)
	const [focusedIndex, setFocusedIndex] = useState<number | null>(null)
	const [showValidation, setShowValidation] = useState(false)
	const [editingFieldIndex, setEditingFieldIndex] = useState<number | null>(
		null
	)
	const [showKeyboardHints, setShowKeyboardHints] = useState(false)
	const [multiSelectMode, setMultiSelectMode] = useState(false)

	// Инициализация продвинутого drag & drop
	const {
		dragState,
		handleDragStart,
		handleOrderChange,
		normalizeOrders,
		setContainer,
		isAdvancedDragActive,
	} = useAdvancedDragAndDrop(state, setState, onLoadFields)

	// Установка контейнера для drag & drop
	useEffect(() => {
		if (containerRef.current) {
			setContainer(containerRef.current)
		}
	}, [setContainer])

	// Получение упорядоченных элементов
	const orderedElements = useMemo(() => {
		return getOrderedElements(state.fields)
	}, [state.fields])

	// Валидация порядка
	const validation = useMemo(() => {
		return validateOrder(state.fields)
	}, [state.fields])

	// Клавиатурная навигация
	const handleKeyDown = useCallback(
		(e: KeyboardEvent) => {
			// Если открыт редактор поля, не обрабатываем глобальные горячие клавиши
			if (editingFieldIndex !== null) return

			switch (e.key) {
				case 'ArrowUp':
					e.preventDefault()
					setFocusedIndex(prev => (prev === null ? 0 : Math.max(0, prev - 1)))
					break
				case 'ArrowDown':
					e.preventDefault()
					setFocusedIndex(prev =>
						prev === null
							? 0
							: Math.min(orderedElements.length - 1, (prev || 0) + 1)
					)
					break
				case 'Escape':
					e.preventDefault()
					setSelectedElements(new Set())
					setFocusedIndex(null)
					setMultiSelectMode(false)
					break
				case 'a':
					if (e.ctrlKey || e.metaKey) {
						e.preventDefault()
						const allIds = orderedElements.map(el => el.id)
						setSelectedElements(new Set(allIds))
					}
					break
				case 'c':
					if (e.ctrlKey || e.metaKey) {
						e.preventDefault()
						// Копирование выбранных элементов
					}
					break
				case '?':
					e.preventDefault()
					setShowKeyboardHints(true)
					break
			}
		},
		[editingFieldIndex, orderedElements]
	)

	// Подключение глобальных обработчиков клавиатуры
	useEffect(() => {
		document.addEventListener('keydown', handleKeyDown)
		return () => document.removeEventListener('keydown', handleKeyDown)
	}, [handleKeyDown])

	// Обработчики событий
	const handleElementSelect = useCallback((elementId: string) => {
		setSelectedElements(prev => {
			const newSet = new Set(prev)
			if (newSet.has(elementId)) {
				newSet.delete(elementId)
			} else {
				newSet.add(elementId)
			}
			return newSet
		})
	}, [])

	const handleSelectAll = useCallback(() => {
		const allIds = orderedElements.map(el => el.id)
		setSelectedElements(new Set(allIds))
	}, [orderedElements])

	const handleDeselectAll = useCallback(() => {
		setSelectedElements(new Set())
	}, [])

	const handleDeleteSelected = useCallback(() => {
		const indicesToDelete = orderedElements
			.filter(el => selectedElements.has(el.id))
			.map(el => el.originalIndex)
			.sort((a, b) => b - a)

		indicesToDelete.forEach(index => {
			onFieldDelete(index)
		})

		setSelectedElements(new Set())
	}, [selectedElements, orderedElements, onFieldDelete])

	const handleFieldSaveLocal = useCallback(
		(index: number, field: Partial<FormField>) => {
			onFieldSave(index, field)
			setEditingFieldIndex(null)
		},
		[onFieldSave]
	)

	const toggleMultiSelectMode = useCallback(() => {
		setMultiSelectMode(prev => !prev)
		if (multiSelectMode) {
			setSelectedElements(new Set())
		}
	}, [multiSelectMode])

	// Автоматическое показ валидации при ошибках
	useEffect(() => {
		if (!validation.isValid) {
			setShowValidation(true)
		}
	}, [validation.isValid])

	return (
		<Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
			{/* Заголовок и управление */}
			<Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
				<Stack
					direction='row'
					alignItems='center'
					justifyContent='space-between'
					mb={2}
				>
					<Typography variant='h6'>
						Поля формы
						<Badge
							badgeContent={orderedElements.length}
							color='primary'
							sx={{ ml: 1 }}
						/>
					</Typography>

					<Stack direction='row' spacing={1}>
						<Tooltip title='Показать клавиатурные подсказки'>
							<IconButton
								size='small'
								onClick={() => setShowKeyboardHints(true)}
								sx={{ color: 'text.secondary' }}
							>
								<SettingsIcon fontSize='small' />
							</IconButton>
						</Tooltip>

						<Tooltip title='Режим множественного выбора'>
							<IconButton
								size='small'
								color={multiSelectMode ? 'primary' : 'default'}
								onClick={toggleMultiSelectMode}
							>
								<SelectAllIcon fontSize='small' />
							</IconButton>
						</Tooltip>

						<Tooltip title='Исправить порядок'>
							<IconButton
								size='small'
								onClick={normalizeOrders}
								disabled={isAdvancedDragActive}
								sx={{ color: 'text.secondary' }}
							>
								<NormalizeIcon fontSize='small' />
							</IconButton>
						</Tooltip>
					</Stack>
				</Stack>

				{/* Кнопки добавления */}
				<Stack direction='row' spacing={1} mb={2}>
					<Button
						variant='outlined'
						startIcon={<AddIcon />}
						onClick={onAddField}
						disabled={isAdvancedDragActive}
					>
						Добавить поле
					</Button>
					<Button
						variant='outlined'
						startIcon={<SectionIcon />}
						onClick={onAddSection}
						disabled={isAdvancedDragActive}
					>
						Добавить раздел
					</Button>
				</Stack>

				{/* Панель множественного выбора */}
				{selectedElements.size > 0 && (
					<Slide direction='down' in={true} timeout={300}>
						<Alert
							severity='info'
							action={
								<Stack direction='row' spacing={1}>
									<Button
										size='small'
										startIcon={<SelectAllIcon />}
										onClick={handleSelectAll}
									>
										Все
									</Button>
									<Button
										size='small'
										startIcon={<ClearIcon />}
										onClick={handleDeselectAll}
									>
										Очистить
									</Button>
									<Button
										size='small'
										startIcon={<DeleteIcon />}
										onClick={handleDeleteSelected}
										color='error'
									>
										Удалить
									</Button>
								</Stack>
							}
						>
							Выбрано элементов: {selectedElements.size}
						</Alert>
					</Slide>
				)}

				{/* Валидация */}
				{showValidation && !validation.isValid && (
					<Collapse in={true} timeout={300}>
						<Alert
							severity='warning'
							onClose={() => setShowValidation(false)}
							sx={{ mb: 2 }}
						>
							<Stack spacing={1}>
								<Typography variant='body2' fontWeight='medium'>
									Обнаружены проблемы с порядком полей:
								</Typography>
								{validation.errors.map((error, index) => (
									<Typography key={index} variant='caption' display='block'>
										• {error}
									</Typography>
								))}
							</Stack>
						</Alert>
					</Collapse>
				)}
			</Box>

			{/* Список элементов */}
			<Box
				ref={containerRef}
				sx={{
					flex: 1,
					overflow: 'auto',
					p: 2,
					position: 'relative',
					className: multiSelectMode ? 'multi-select-mode' : '',
				}}
			>
				{orderedElements.length === 0 ? (
					<Box
						sx={{
							display: 'flex',
							flexDirection: 'column',
							alignItems: 'center',
							justifyContent: 'center',
							height: '100%',
							color: 'text.secondary',
						}}
					>
						<Typography variant='h6' mb={2}>
							Нет полей для отображения
						</Typography>
						<Typography variant='body2' mb={3}>
							Добавьте поля или разделы для начала работы
						</Typography>
						<Stack direction='row' spacing={2}>
							<Button
								variant='contained'
								startIcon={<AddIcon />}
								onClick={onAddField}
							>
								Добавить поле
							</Button>
							<Button
								variant='outlined'
								startIcon={<SectionIcon />}
								onClick={onAddSection}
							>
								Добавить раздел
							</Button>
						</Stack>
					</Box>
				) : (
					<TransitionGroup>
						{orderedElements.map((element, index) => (
							<Collapse key={element.id} timeout={300}>
								<AdvancedFieldItem
									element={element}
									index={index}
									isSelected={selectedElements.has(element.id)}
									isDraggedOver={dragState.dragOverIndex === index}
									isDragging={dragState.draggedElementId === element.id}
									onSelect={handleElementSelect}
									onEdit={setEditingFieldIndex}
									onDelete={onFieldDelete}
									onOrderChange={handleOrderChange}
									onDragStart={handleDragStart}
									isFocused={focusedIndex === index}
								/>
							</Collapse>
						))}
					</TransitionGroup>
				)}
			</Box>

			{/* Редактор поля */}
			{editingFieldIndex !== null && (
				<FormFieldModal
					open={true}
					field={state.fields[editingFieldIndex]}
					onSave={field => handleFieldSaveLocal(editingFieldIndex, field)}
					onClose={() => setEditingFieldIndex(null)}
					formId={state.formData._id || ''}
				/>
			)}

			{/* Клавиатурные подсказки */}
			<KeyboardHints
				isVisible={showKeyboardHints}
				onClose={() => setShowKeyboardHints(false)}
			/>
		</Box>
	)
}
