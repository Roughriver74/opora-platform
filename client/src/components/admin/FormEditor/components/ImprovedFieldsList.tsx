import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
	Box,
	List,
	ListItem,
	ListItemText,
	Typography,
	IconButton,
	Chip,
	Menu,
	MenuItem,
	Tooltip,
	Alert,
	Stack,
	Button,
	Divider,
	Card,
	CardContent,
	Badge,
	useTheme,
	useMediaQuery,
	Paper,
	TextField,
	Collapse,
} from '@mui/material'
import {
	DragIndicator,
	Edit,
	Delete,
	MoreVert,
	Add,
	Visibility,
	VisibilityOff,
	ContentCopy,
	ArrowUpward as ArrowUpIcon,
	ArrowDownward as ArrowDownIcon,
	FilterList,
	Search,
	ContentCopy as CopyIcon,
	Delete as DeleteIcon,
	DragIndicator as DragIcon,
	Add as AddIcon,
	ViewHeadline as SectionIcon,
	AutoFixHigh as NormalizeIcon,
} from '@mui/icons-material'
import { TransitionGroup } from 'react-transition-group'
import { FormField } from '../../../../types'
import { useImprovedDragAndDrop } from '../hooks/useImprovedDragAndDrop'
import { FormEditorState } from '../types'
import { getOrderedElements, validateOrder } from '../utils/newOrderSystem'
import { FormFieldModal } from './FormFieldModal'

interface ImprovedFieldsListProps {
	state: FormEditorState
	setState: React.Dispatch<React.SetStateAction<FormEditorState>>
	onAddField: () => void
	onAddSection: () => void
	onFieldSave: (index: number, field: Partial<FormField>) => void
	onFieldDelete: (index: number) => void
}

interface FieldItemProps {
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
	onDragOver: (e: React.DragEvent<HTMLDivElement>, targetIndex: number) => void
	onDragLeave: (e: React.DragEvent<HTMLDivElement>) => void
	onDrop: (
		e: React.DragEvent<HTMLDivElement>,
		targetIndex: number
	) => Promise<void>
	onDragEnd: (e: React.DragEvent<HTMLDivElement>) => void
}

interface DragEventHandlers {
	handleDragStart: (
		e: React.DragEvent<HTMLDivElement>,
		elementId: string,
		index: number
	) => void
	handleDragOver: (
		e: React.DragEvent<HTMLDivElement>,
		targetIndex: number
	) => void
	handleDragLeave: (e: React.DragEvent<HTMLDivElement>) => void
	handleDrop: (
		e: React.DragEvent<HTMLDivElement>,
		targetIndex: number
	) => Promise<void>
	handleDragEnd: (e: React.DragEvent<HTMLDivElement>) => void
}

const FieldItem: React.FC<FieldItemProps> = ({
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
	onDragOver,
	onDragLeave,
	onDrop,
	onDragEnd,
}) => {
	const theme = useTheme()
	const [isEditing, setIsEditing] = useState(false)
	const [tempOrder, setTempOrder] = useState(element.order)

	const handleOrderSubmit = useCallback(() => {
		if (tempOrder !== element.order) {
			onOrderChange(element.id, tempOrder)
		}
		setIsEditing(false)
	}, [tempOrder, element.order, element.id, onOrderChange])

	const handleKeyPress = useCallback(
		(e: React.KeyboardEvent) => {
			if (e.key === 'Enter') {
				handleOrderSubmit()
			} else if (e.key === 'Escape') {
				setTempOrder(element.order)
				setIsEditing(false)
			}
		},
		[handleOrderSubmit, element.order]
	)

	const getFieldTypeIcon = useCallback((type: string) => {
		switch (type) {
			case 'header':
				return '📝'
			case 'text':
				return '��'
			case 'number':
				return '🔢'
			case 'date':
				return '📅'
			case 'select':
				return '📋'
			case 'checkbox':
				return '☑️'
			case 'radio':
				return '🔘'
			case 'textarea':
				return '📄'
			case 'divider':
				return '➖'
			default:
				return '📝'
		}
	}, [])

	const getFieldTypeColor = useCallback(
		(type: string) => {
			switch (type) {
				case 'header':
					return theme.palette.primary.main
				case 'divider':
					return theme.palette.grey[500]
				default:
					return theme.palette.text.secondary
			}
		},
		[theme]
	)

	return (
		<Paper
			elevation={isDragging ? 4 : isSelected ? 2 : 1}
			draggable
			onDragStart={e => onDragStart(e, element.id, index)}
			onDragOver={e => onDragOver(e, index)}
			onDragLeave={onDragLeave}
			onDrop={e => onDrop(e, index)}
			onDragEnd={onDragEnd}
			onClick={() => onSelect(element.id)}
			sx={{
				p: 2,
				mb: 1,
				cursor: 'move',
				transition: 'all 0.2s ease',
				transform: isDragging ? 'scale(0.95)' : 'scale(1)',
				opacity: isDragging ? 0.5 : 1,
				bgcolor: isDraggedOver
					? alpha(theme.palette.primary.main, 0.1)
					: isSelected
					? alpha(theme.palette.primary.main, 0.05)
					: 'background.paper',
				border: isDraggedOver
					? `2px dashed ${theme.palette.primary.main}`
					: isSelected
					? `1px solid ${theme.palette.primary.main}`
					: '1px solid transparent',
				'&:hover': {
					bgcolor: alpha(theme.palette.primary.main, 0.03),
					transform: 'scale(1.01)',
				},
				'&.dragging': {
					transform: 'scale(0.95)',
					opacity: 0.5,
				},
			}}
		>
			<Stack direction='row' alignItems='center' spacing={2}>
				{/* Drag Handle */}
				<DragIcon sx={{ color: 'text.secondary', cursor: 'grab' }} />

				{/* Order Input */}
				{isEditing ? (
					<TextField
						size='small'
						type='number'
						value={tempOrder}
						onChange={e => setTempOrder(Number(e.target.value))}
						onBlur={handleOrderSubmit}
						onKeyPress={handleKeyPress}
						inputProps={{ min: 1, max: 999 }}
						sx={{ width: 60 }}
						autoFocus
					/>
				) : (
					<Tooltip title='Кликните для изменения порядка'>
						<Chip
							label={element.order}
							size='small'
							clickable
							onClick={e => {
								e.stopPropagation()
								setIsEditing(true)
							}}
							sx={{
								minWidth: 40,
								fontSize: '0.875rem',
								bgcolor: getFieldTypeColor(element.field.type),
								color: 'white',
							}}
						/>
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
						{element.field.type} • {element.field.name}
						{element.field.required && ' • Обязательное'}
					</Typography>
				</Box>

				{/* Actions */}
				<Stack direction='row' spacing={1}>
					<Tooltip title='Редактировать'>
						<IconButton
							size='small'
							onClick={e => {
								e.stopPropagation()
								onEdit(element.originalIndex)
							}}
						>
							<Edit />
						</IconButton>
					</Tooltip>
					<Tooltip title='Удалить'>
						<IconButton
							size='small'
							color='error'
							onClick={e => {
								e.stopPropagation()
								onDelete(element.originalIndex)
							}}
						>
							<Delete />
						</IconButton>
					</Tooltip>
				</Stack>
			</Stack>
		</Paper>
	)
}

export const ImprovedFieldsList: React.FC<ImprovedFieldsListProps> = ({
	state,
	setState,
	onAddField,
	onAddSection,
	onFieldSave,
	onFieldDelete,
}) => {
	const theme = useTheme()
	const [selectedElements, setSelectedElements] = useState<Set<string>>(
		new Set()
	)
	const [showValidation, setShowValidation] = useState(false)
	const [editingFieldIndex, setEditingFieldIndex] = useState<number | null>(
		null
	)

	const {
		dragState,
		handleDragStart,
		handleDragOver,
		handleDragLeave,
		handleDrop,
		handleDragEnd,
		handleOrderChange,
		normalizeOrders,
	} = useImprovedDragAndDrop(state, setState)

	// Получаем упорядоченные элементы
	const orderedElements = useMemo(() => {
		return getOrderedElements(state.fields)
	}, [state.fields])

	// Валидация порядка
	const validation = useMemo(() => {
		return validateOrder(state.fields)
	}, [state.fields])

	// Обработчики
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
		// Реализация удаления выбранных элементов
		const indicesToDelete = orderedElements
			.filter(el => selectedElements.has(el.id))
			.map(el => el.originalIndex)
			.sort((a, b) => b - a) // Сортируем по убыванию для корректного удаления

		indicesToDelete.forEach(index => {
			onFieldDelete(index)
		})

		setSelectedElements(new Set())
	}, [selectedElements, orderedElements, onFieldDelete])

	const handleEditField = useCallback((index: number) => {
		setEditingFieldIndex(index)
	}, [])

	const handleFieldSaveLocal = useCallback(
		(index: number, field: Partial<FormField>) => {
			onFieldSave(index, field)
			setEditingFieldIndex(null)
		},
		[onFieldSave]
	)

	if (state.loading) {
		return (
			<Box sx={{ textAlign: 'center', p: 3 }}>
				<Typography>Загрузка полей...</Typography>
			</Box>
		)
	}

	return (
		<Box>
			{/* Header */}
			<Stack
				direction='row'
				justifyContent='space-between'
				alignItems='center'
				mb={2}
			>
				<Typography variant='h6'>
					Поля формы ({orderedElements.length})
				</Typography>
				<Stack direction='row' spacing={1}>
					<Button
						variant='outlined'
						size='small'
						onClick={() => setShowValidation(!showValidation)}
						color={validation.isValid ? 'success' : 'error'}
					>
						{validation.isValid ? 'Порядок ОК' : 'Есть ошибки'}
					</Button>
					<Button
						variant='contained'
						size='small'
						startIcon={<NormalizeIcon />}
						onClick={normalizeOrders}
					>
						Исправить порядок
					</Button>
				</Stack>
			</Stack>

			{/* Validation */}
			<Collapse in={showValidation}>
				<Alert
					severity={validation.isValid ? 'success' : 'error'}
					sx={{ mb: 2 }}
					onClose={() => setShowValidation(false)}
				>
					{validation.isValid ? (
						'Порядок полей корректен'
					) : (
						<>
							<Typography variant='body2' sx={{ mb: 1 }}>
								Найдены ошибки в порядке:
							</Typography>
							{validation.errors.map((error, index) => (
								<Typography key={index} variant='body2' sx={{ ml: 1 }}>
									• {error}
								</Typography>
							))}
						</>
					)}
				</Alert>
			</Collapse>

			{/* Actions */}
			<Stack direction='row' spacing={1} mb={2}>
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
				<Divider orientation='vertical' flexItem />
				<Button
					size='small'
					onClick={handleSelectAll}
					disabled={selectedElements.size === orderedElements.length}
				>
					Выбрать всё
				</Button>
				<Button
					size='small'
					onClick={handleDeselectAll}
					disabled={selectedElements.size === 0}
				>
					Снять выбор
				</Button>
				<Button
					size='small'
					color='error'
					onClick={handleDeleteSelected}
					disabled={selectedElements.size === 0}
				>
					Удалить выбранные ({selectedElements.size})
				</Button>
			</Stack>

			{/* Fields List */}
			<Box>
				{orderedElements.length === 0 ? (
					<Paper sx={{ p: 4, textAlign: 'center' }}>
						<Typography variant='body2' color='text.secondary'>
							Нет полей в форме. Добавьте первое поле.
						</Typography>
					</Paper>
				) : (
					<TransitionGroup>
						{orderedElements.map((element, index) => (
							<Collapse key={element.id}>
								<FieldItem
									element={element}
									index={index}
									isSelected={selectedElements.has(element.id)}
									isDraggedOver={dragState.dragOverIndex === index}
									isDragging={dragState.draggedElementId === element.id}
									onSelect={handleElementSelect}
									onEdit={handleEditField}
									onDelete={onFieldDelete}
									onOrderChange={handleOrderChange}
									onDragStart={handleDragStart}
									onDragOver={handleDragOver}
									onDragLeave={handleDragLeave}
									onDrop={handleDrop}
									onDragEnd={handleDragEnd}
								/>
							</Collapse>
						))}
					</TransitionGroup>
				)}
			</Box>

			{/* Field Editor Modal */}
			{editingFieldIndex !== null && (
				<FormFieldModal
					open={true}
					field={state.fields[editingFieldIndex]}
					onSave={field => handleFieldSaveLocal(editingFieldIndex, field)}
					onClose={() => setEditingFieldIndex(null)}
					onDelete={() => {
						onFieldDelete(editingFieldIndex)
						setEditingFieldIndex(null)
					}}
					availableBitrixFields={state.bitrixFields}
					allFields={state.fields}
				/>
			)}
		</Box>
	)
}
