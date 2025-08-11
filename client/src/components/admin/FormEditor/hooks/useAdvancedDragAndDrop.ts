import { useCallback, useState, useRef, useEffect } from 'react'
import { FormField } from '../../../../types'
import { FormEditorState } from '../types'
import { FormFieldService } from '../../../../services/formFieldService'
import {
	moveElement,
	getOrderedElements,
	normalizeAllOrders,
	changeElementOrder,
} from '../utils/newOrderSystem'

interface AdvancedDragState {
	draggedElementId: string | null
	draggedElementIndex: number | null
	dragOverIndex: number | null
	isDragging: boolean
	dragPreview: HTMLElement | null
	dragStartPosition: { x: number; y: number } | null
	dragOffset: { x: number; y: number } | null
	dropZones: HTMLElement[]
	activeDropZone: HTMLElement | null
	dragDirection: 'up' | 'down' | null
	scrolling: boolean
	autoScrollTimer: number | null
}

interface DropZone {
	element: HTMLElement
	index: number
	section?: string
	isActive: boolean
}

export const useAdvancedDragAndDrop = (
	state: FormEditorState,
	setState: React.Dispatch<React.SetStateAction<FormEditorState>>,
	onLoadFields?: () => Promise<void>
) => {
	const [dragState, setDragState] = useState<AdvancedDragState>({
		draggedElementId: null,
		draggedElementIndex: null,
		dragOverIndex: null,
		isDragging: false,
		dragPreview: null,
		dragStartPosition: null,
		dragOffset: null,
		dropZones: [],
		activeDropZone: null,
		dragDirection: null,
		scrolling: false,
		autoScrollTimer: null,
	})

	const containerRef = useRef<HTMLElement | null>(null)
	const dragGhostRef = useRef<HTMLDivElement | null>(null)

	// Создание призрачного элемента для перетаскивания
	const createDragGhost = useCallback(
		(element: HTMLElement, field: FormField) => {
			const ghost = document.createElement('div')
			ghost.className = 'drag-ghost'

			// Копируем содержимое элемента
			ghost.innerHTML = `
			<div style="
				padding: 12px;
				background: rgba(25, 118, 210, 0.1);
				border: 2px dashed #1976d2;
				border-radius: 8px;
				color: #1976d2;
				font-weight: 500;
				backdrop-filter: blur(4px);
				box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
				transform: rotate(2deg);
				transition: all 0.2s ease;
			">
				<div style="display: flex; align-items: center; gap: 8px;">
					<span style="font-size: 18px;">≡</span>
					<span>${field.label || field.name}</span>
				</div>
				<div style="font-size: 12px; opacity: 0.7; margin-top: 4px;">
					${field.type} • Перетаскивание...
				</div>
			</div>
		`

			// Стилизуем
			ghost.style.position = 'fixed'
			ghost.style.pointerEvents = 'none'
			ghost.style.zIndex = '9999'
			ghost.style.opacity = '0.9'
			ghost.style.transform = 'scale(1.05)'
			ghost.style.transition = 'all 0.2s ease'

			document.body.appendChild(ghost)
			return ghost
		},
		[]
	)

	// Обновление позиции призрачного элемента
	const updateDragGhost = useCallback((e: MouseEvent, ghost: HTMLElement) => {
		if (!ghost) return

		const { clientX, clientY } = e
		ghost.style.left = `${clientX + 15}px`
		ghost.style.top = `${clientY - 15}px`

		// Добавляем легкое покачивание
		const wobble = Math.sin(Date.now() * 0.01) * 2
		ghost.style.transform = `scale(1.05) rotate(${2 + wobble}deg)`
	}, [])

	// Создание drop zones
	const createDropZones = useCallback(() => {
		const orderedElements = getOrderedElements(state.fields)
		const zones: DropZone[] = []

		// Создаем зоны между элементами
		orderedElements.forEach((element, index) => {
			const zoneDiv = document.createElement('div')
			zoneDiv.className = 'drop-zone'
			zoneDiv.setAttribute('data-index', index.toString())

			// Стилизуем drop zone
			zoneDiv.style.cssText = `
				position: absolute;
				left: 0;
				right: 0;
				height: 4px;
				background: transparent;
				border-radius: 2px;
				transition: all 0.2s ease;
				z-index: 10;
				margin: 2px 0;
			`

			zones.push({
				element: zoneDiv,
				index,
				section: element.field.type === 'header' ? element.id : undefined,
				isActive: false,
			})
		})

		// Добавляем зону в конец
		const endZone = document.createElement('div')
		endZone.className = 'drop-zone drop-zone-end'
		endZone.setAttribute('data-index', orderedElements.length.toString())
		endZone.style.cssText = `
			position: absolute;
			left: 0;
			right: 0;
			height: 8px;
			background: transparent;
			border-radius: 4px;
			transition: all 0.2s ease;
			z-index: 10;
		`

		zones.push({
			element: endZone,
			index: orderedElements.length,
			isActive: false,
		})

		return zones
	}, [state.fields])

	// Автоскролл при перетаскивании
	const handleAutoScroll = useCallback((e: MouseEvent) => {
		if (!containerRef.current) return

		const container = containerRef.current
		const rect = container.getBoundingClientRect()
		const scrollThreshold = 50
		const scrollSpeed = 10

		// Проверяем нужно ли скроллить вверх
		if (e.clientY < rect.top + scrollThreshold) {
			container.scrollTop = Math.max(0, container.scrollTop - scrollSpeed)
			setDragState(prev => ({ ...prev, scrolling: true, dragDirection: 'up' }))
		}
		// Проверяем нужно ли скроллить вниз
		else if (e.clientY > rect.bottom - scrollThreshold) {
			container.scrollTop = Math.min(
				container.scrollHeight - container.clientHeight,
				container.scrollTop + scrollSpeed
			)
			setDragState(prev => ({
				...prev,
				scrolling: true,
				dragDirection: 'down',
			}))
		} else {
			setDragState(prev => ({ ...prev, scrolling: false, dragDirection: null }))
		}
	}, [])

	// Анимация успешного drop
	const showDropSuccess = useCallback((targetIndex: number) => {
		const successIndicator = document.createElement('div')
		successIndicator.innerHTML = '✅ Перемещено!'
		successIndicator.style.cssText = `
			position: fixed;
			top: 20px;
			right: 20px;
			background: linear-gradient(135deg, #4caf50, #8bc34a);
			color: white;
			padding: 12px 20px;
			border-radius: 8px;
			box-shadow: 0 4px 20px rgba(76, 175, 80, 0.3);
			font-weight: 500;
			z-index: 10000;
			animation: slideInRight 0.3s ease;
		`

		document.body.appendChild(successIndicator)

		setTimeout(() => {
			successIndicator.style.animation = 'slideOutRight 0.3s ease'
			setTimeout(() => {
				if (successIndicator.parentNode) {
					document.body.removeChild(successIndicator)
				}
			}, 300)
		}, 2000)
	}, [])

	// Анимация ошибки drop
	const showDropError = useCallback(() => {
		const errorIndicator = document.createElement('div')
		errorIndicator.innerHTML = '❌ Ошибка перемещения'
		errorIndicator.style.cssText = `
			position: fixed;
			top: 20px;
			right: 20px;
			background: linear-gradient(135deg, #f44336, #e57373);
			color: white;
			padding: 12px 20px;
			border-radius: 8px;
			box-shadow: 0 4px 20px rgba(244, 67, 54, 0.3);
			font-weight: 500;
			z-index: 10000;
			animation: slideInRight 0.3s ease;
		`

		document.body.appendChild(errorIndicator)

		setTimeout(() => {
			errorIndicator.style.animation = 'slideOutRight 0.3s ease'
			setTimeout(() => {
				if (errorIndicator.parentNode) {
					document.body.removeChild(errorIndicator)
				}
			}, 300)
		}, 2000)
	}, [])

	// Обработка drop
	const handleDrop = useCallback(
		async (sourceIndex: number, targetIndex: number) => {
			if (sourceIndex === targetIndex) return


			try {
				// Используем новую систему порядка для перемещения
				const updatedFields = moveElement(
					state.fields,
					sourceIndex,
					targetIndex
				)

				// Обновляем локальное состояние с анимацией
				setState(prev => ({
					...prev,
					fields: updatedFields,
					hasChanges: true,
				}))

				// Сохраняем изменения в базу данных
				const savePromises = updatedFields
					.filter(field => field._id)
					.map(field =>
						FormFieldService.updateField(field._id as string, {
							order: field.order,
						})
					)

				await Promise.all(savePromises)

				// Перезагружаем поля с сервера для получения актуальных данных
				if (onLoadFields) {
					await onLoadFields()
				}

				// Показываем успешную анимацию
				showDropSuccess(targetIndex)

			} catch (error) {
				console.error('❌ Ошибка при продвинутом перемещении:', error)

				// Показываем ошибку
				showDropError()

				setState(prev => ({
					...prev,
					error: `Ошибка при перемещении: ${(error as Error).message}`,
				}))
			}
		},
		[state.fields, setState, showDropSuccess, showDropError]
	)

	// Обработка движения мыши во время перетаскивания
	const handleMouseMove = useCallback(
		(e: MouseEvent) => {
			if (!dragState.isDragging || !dragGhostRef.current) return

			updateDragGhost(e, dragGhostRef.current)
			handleAutoScroll(e)

			// Находим ближайшую drop zone
			const zones = document.querySelectorAll('.drop-zone')
			let closestZone: Element | null = null
			let minDistance = Infinity

			zones.forEach(zone => {
				const rect = zone.getBoundingClientRect()
				const centerY = rect.top + rect.height / 2
				const distance = Math.abs(e.clientY - centerY)

				if (distance < minDistance) {
					minDistance = distance
					closestZone = zone
				}
			})

			// Активируем ближайшую зону
			zones.forEach(zone => {
				if (zone === closestZone) {
					zone.classList.add('active')
					;(zone as HTMLElement).style.background =
						'linear-gradient(90deg, #1976d2, #42a5f5)'
					;(zone as HTMLElement).style.height = '6px'
					;(zone as HTMLElement).style.boxShadow =
						'0 0 20px rgba(25, 118, 210, 0.6)'
				} else {
					zone.classList.remove('active')
					;(zone as HTMLElement).style.background = 'transparent'
					;(zone as HTMLElement).style.height = '4px'
					;(zone as HTMLElement).style.boxShadow = 'none'
				}
			})

			// Обновляем состояние
			if (closestZone) {
				const targetIndex = parseInt(
					(closestZone as HTMLElement).getAttribute('data-index') || '0'
				)
				setDragState(prev => ({ ...prev, dragOverIndex: targetIndex }))
			}
		},
		[dragState.isDragging, updateDragGhost, handleAutoScroll]
	)

	// Завершение перетаскивания
	const handleMouseUp = useCallback(
		(e: MouseEvent) => {
			const currentDragState = dragState
			if (!currentDragState.isDragging) return

			// Обработчики будут удалены автоматически через useEffect

			// Удаляем призрачный элемент
			if (dragGhostRef.current) {
				document.body.removeChild(dragGhostRef.current)
				dragGhostRef.current = null
			}

			// Удаляем drop zones
			currentDragState.dropZones.forEach(zone => {
				if (zone.parentNode) {
					zone.parentNode.removeChild(zone)
				}
			})

			// Восстанавливаем стили всех элементов
			document.querySelectorAll('.dragging').forEach(el => {
				;(el as HTMLElement).style.opacity = '1'
				;(el as HTMLElement).style.transform = 'scale(1)'
				;(el as HTMLElement).style.filter = 'none'
				el.classList.remove('dragging')
			})

			// Выполняем drop если есть активная зона
			if (
				currentDragState.dragOverIndex !== null &&
				currentDragState.draggedElementIndex !== null
			) {
				handleDrop(
					currentDragState.draggedElementIndex,
					currentDragState.dragOverIndex
				)
			}

			// Очищаем состояние
			setDragState({
				draggedElementId: null,
				draggedElementIndex: null,
				dragOverIndex: null,
				isDragging: false,
				dragPreview: null,
				dragStartPosition: null,
				dragOffset: null,
				dropZones: [],
				activeDropZone: null,
				dragDirection: null,
				scrolling: false,
				autoScrollTimer: null,
			})
		},
		[dragState, handleDrop]
	)

	// Начало перетаскивания
	const handleDragStart = useCallback(
		(e: React.DragEvent<HTMLDivElement>, elementId: string, index: number) => {
			const orderedElements = getOrderedElements(state.fields)
			const element = orderedElements[index]

			if (!element) return

			console.log('Drag start:', {
				elementId,
				index,
			})

			// Предотвращаем стандартное поведение
			e.preventDefault()

			// Создаем призрачный элемент
			const ghost = createDragGhost(e.currentTarget, element.field)
			dragGhostRef.current = ghost

			// Создаем drop zones
			const dropZones = createDropZones()

			// Добавляем drop zones в DOM
			if (containerRef.current) {
				dropZones.forEach(zone => {
					containerRef.current!.appendChild(zone.element)
				})
			}

			// Обработчики событий будут добавлены через useEffect

			// Обновляем состояние
			setDragState({
				draggedElementId: elementId,
				draggedElementIndex: index,
				dragOverIndex: null,
				isDragging: true,
				dragPreview: ghost,
				dragStartPosition: { x: e.clientX, y: e.clientY },
				dragOffset: { x: 15, y: -15 },
				dropZones: dropZones.map(z => z.element),
				activeDropZone: null,
				dragDirection: null,
				scrolling: false,
				autoScrollTimer: null,
			})

			// Стилизуем исходный элемент
			e.currentTarget.style.opacity = '0.3'
			e.currentTarget.style.transform = 'scale(0.95)'
			e.currentTarget.style.filter = 'blur(1px)'
			e.currentTarget.classList.add('dragging')
		},
		[state.fields, createDragGhost, createDropZones]
	)

	// Изменение порядка элемента с анимацией
	const handleOrderChange = useCallback(
		async (elementId: string, newOrder: number) => {
			try {
				const updatedFields = changeElementOrder(
					state.fields,
					elementId,
					newOrder
				)

				// Анимированное обновление
				setState(prev => ({
					...prev,
					fields: updatedFields,
					hasChanges: true,
				}))

				// Сохраняем изменения
				const savePromises = updatedFields
					.filter(field => field._id)
					.map(field =>
						FormFieldService.updateField(field._id as string, {
							order: field.order,
						})
					)

				await Promise.all(savePromises)

				// Перезагружаем поля с сервера для получения актуальных данных
				if (onLoadFields) {
					await onLoadFields()
				}

				showDropSuccess(newOrder)

			} catch (error) {
				console.error('❌ Ошибка при изменении порядка:', error)
				showDropError()

				setState(prev => ({
					...prev,
					error: `Ошибка при изменении порядка: ${(error as Error).message}`,
				}))
			}
		},
		[state.fields, setState, showDropSuccess, showDropError]
	)

	// Нормализация порядков с анимацией
	const normalizeOrders = useCallback(async () => {
		try {

			const normalizedFields = normalizeAllOrders(state.fields)

			setState(prev => ({
				...prev,
				fields: normalizedFields,
				hasChanges: true,
			}))

			const savePromises = normalizedFields
				.filter(field => field._id)
				.map(field =>
					FormFieldService.updateField(field._id as string, {
						order: field.order,
					})
				)

			await Promise.all(savePromises)

			// Перезагружаем поля с сервера для получения актуальных данных
			if (onLoadFields) {
				await onLoadFields()
			}

			showDropSuccess(0)

		} catch (error) {
			console.error('❌ Ошибка при нормализации:', error)
			showDropError()

			setState(prev => ({
				...prev,
				error: `Ошибка при нормализации: ${(error as Error).message}`,
			}))
		}
	}, [state.fields, setState, showDropSuccess, showDropError])

	// Управление обработчиками событий
	useEffect(() => {
		if (dragState.isDragging) {
			document.addEventListener('mousemove', handleMouseMove)
			document.addEventListener('mouseup', handleMouseUp)
		}

		return () => {
			document.removeEventListener('mousemove', handleMouseMove)
			document.removeEventListener('mouseup', handleMouseUp)
		}
	}, [dragState.isDragging, handleMouseMove, handleMouseUp])

	// Очистка при размонтировании
	useEffect(() => {
		return () => {
			if (dragGhostRef.current) {
				document.body.removeChild(dragGhostRef.current)
			}
			document.removeEventListener('mousemove', handleMouseMove)
			document.removeEventListener('mouseup', handleMouseUp)
		}
	}, [handleMouseMove, handleMouseUp])

	// Установка контейнера
	const setContainer = useCallback((element: HTMLElement | null) => {
		containerRef.current = element
	}, [])

	return {
		dragState,
		handleDragStart,
		handleOrderChange,
		normalizeOrders,
		setContainer,
		isAdvancedDragActive: dragState.isDragging,
	}
}
