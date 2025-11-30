import { useCallback, useState } from 'react'
import { FormEditorState } from '../types'
import { FormFieldService } from '../../../../services/formFieldService'
import {
	moveElement,
	getOrderedElements,
	normalizeAllOrders,
} from '../utils/newOrderSystem'

interface DragState {
	draggedElementId: string | null
	draggedElementIndex: number | null
	dragOverIndex: number | null
	isDragging: boolean
	dragPreview: HTMLElement | null
}

export const useImprovedDragAndDrop = (
	state: FormEditorState,
	setState: React.Dispatch<React.SetStateAction<FormEditorState>>,
	onLoadFields?: () => Promise<void>
) => {
	const [dragState, setDragState] = useState<DragState>({
		draggedElementId: null,
		draggedElementIndex: null,
		dragOverIndex: null,
		isDragging: false,
		dragPreview: null,
	})

	// Начало перетаскивания
	const handleDragStart = useCallback(
		(e: React.DragEvent<HTMLDivElement>, elementId: string, index: number) => {

			// Устанавливаем данные для передачи
			e.dataTransfer.setData('text/plain', index.toString())
			e.dataTransfer.setData('elementId', elementId)
			e.dataTransfer.effectAllowed = 'move'

			// Создаем визуальный эффект
			const target = e.currentTarget
			target.style.opacity = '0.5'
			target.style.transform = 'scale(0.95)'

			// Добавляем класс для стилизации
			target.classList.add('dragging')

			setDragState({
				draggedElementId: elementId,
				draggedElementIndex: index,
				dragOverIndex: null,
				isDragging: true,
				dragPreview: target,
			})
		},
		[]
	)

	// Перетаскивание над элементом
	const handleDragOver = useCallback(
		(e: React.DragEvent<HTMLDivElement>, targetIndex: number) => {
			e.preventDefault()
			e.dataTransfer.dropEffect = 'move'

			// Обновляем индекс элемента, над которым находимся
			setDragState(prev => ({
				...prev,
				dragOverIndex: targetIndex,
			}))
		},
		[]
	)

	// Покидание области перетаскивания
	const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
		e.preventDefault()
		setDragState(prev => ({
			...prev,
			dragOverIndex: null,
		}))
	}, [])

	// Сброс элемента
	const handleDrop = useCallback(
		async (e: React.DragEvent<HTMLDivElement>, targetIndex: number) => {
			e.preventDefault()

			const sourceIndex = Number(e.dataTransfer.getData('text/plain'))
			const elementId = e.dataTransfer.getData('elementId')

				console.log({
					sourceIndex,
					targetIndex,
					elementId,
				})

			// Если сбрасываем на то же место, ничего не делаем
			if (sourceIndex === targetIndex) {
				setDragState({
					draggedElementId: null,
					draggedElementIndex: null,
					dragOverIndex: null,
					isDragging: false,
					dragPreview: null,
				})
				return
			}

			try {
				// Используем новую систему порядка для перемещения
				const updatedFields = moveElement(
					state.fields,
					sourceIndex,
					targetIndex
				)

				// Обновляем локальное состояние
				setState(prev => ({
					...prev,
					fields: updatedFields,
					hasChanges: true,
				}))

				// Сохраняем изменения в базу данных
				const savePromises = updatedFields
					.filter(field => field._id || field.id)
					.map(field =>
						FormFieldService.updateField((field._id || field.id) as string, {
							order: field.order,
						})
					)

				await Promise.all(savePromises)
				
				// Перезагружаем поля с сервера для получения актуальных данных
				if (onLoadFields) {
					await onLoadFields()
				}
				
				// Сбрасываем флаг hasChanges после успешного сохранения
				setState(prev => ({
					...prev,
					hasChanges: false,
					lastSaved: new Date(),
				}))
			} catch (error) {
				console.error('❌ Ошибка при сохранении нового порядка:', error)

				// Показываем ошибку пользователю
				setState(prev => ({
					...prev,
					error: `Ошибка при сохранении порядка: ${(error as Error).message}`,
				}))
			}

			// Очищаем состояние перетаскивания
			setDragState({
				draggedElementId: null,
				draggedElementIndex: null,
				dragOverIndex: null,
				isDragging: false,
				dragPreview: null,
			})
		},
		[state.fields, setState, onLoadFields]
	)

	// Завершение перетаскивания
	const handleDragEnd = useCallback((e: React.DragEvent<HTMLDivElement>) => {
		const target = e.currentTarget

		// Восстанавливаем визуальные эффекты
		target.style.opacity = '1'
		target.style.transform = 'scale(1)'
		target.classList.remove('dragging')

		// Очищаем состояние
		setDragState({
			draggedElementId: null,
			draggedElementIndex: null,
			dragOverIndex: null,
			isDragging: false,
			dragPreview: null,
		})
	}, [])

	// Изменение порядка элемента вручную (через поле ввода)
	const handleOrderChange = useCallback(
		async (elementId: string, newOrder: number) => {
			try {
				const orderedElements = getOrderedElements(state.fields)
				const elementIndex = orderedElements.findIndex(
					el => el.id === elementId
				)

				if (elementIndex === -1) {
					console.error('Элемент не найден:', elementId)
					return
				}

				// Проверяем валидность нового порядка
				const maxOrder = orderedElements.length
				const validOrder = Math.max(1, Math.min(newOrder, maxOrder))

				// Если порядок не изменился, ничего не делаем
				if (validOrder === elementIndex + 1) {
					return
				}

				// Перемещаем элемент на новую позицию
				const updatedFields = moveElement(
					state.fields,
					elementIndex,
					validOrder - 1
				)

				// Обновляем локальное состояние
				setState(prev => ({
					...prev,
					fields: updatedFields,
					hasChanges: true,
				}))

				// Сохраняем изменения в базу данных
				const savePromises = updatedFields
					.filter(field => field._id || field.id)
					.map(field =>
						FormFieldService.updateField((field._id || field.id) as string, {
							order: field.order,
						})
					)

				await Promise.all(savePromises)
				
				// Перезагружаем поля с сервера для получения актуальных данных
				if (onLoadFields) {
					await onLoadFields()
				}
				
				// Сбрасываем флаг hasChanges после успешного сохранения
				setState(prev => ({
					...prev,
					hasChanges: false,
					lastSaved: new Date(),
				}))
			} catch (error) {
				console.error('❌ Ошибка при изменении порядка:', error)
				setState(prev => ({
					...prev,
					error: `Ошибка при изменении порядка: ${(error as Error).message}`,
				}))
			}
		},
		[state.fields, setState, onLoadFields]
	)

	// Нормализация всех порядков
	const normalizeOrders = useCallback(async () => {
		try {

			const normalizedFields = normalizeAllOrders(state.fields)

			// Обновляем локальное состояние
			setState(prev => ({
				...prev,
				fields: normalizedFields,
				hasChanges: true,
			}))

			// Сохраняем изменения в базу данных
			const savePromises = normalizedFields
				.filter(field => field._id || field.id)
				.map(field =>
					FormFieldService.updateField((field._id || field.id) as string, {
						order: field.order,
					})
				)

			await Promise.all(savePromises)
			
			// Перезагружаем поля с сервера для получения актуальных данных
			if (onLoadFields) {
				await onLoadFields()
			}
			
			// Сбрасываем флаг hasChanges после успешного сохранения
			setState(prev => ({
				...prev,
				hasChanges: false,
				lastSaved: new Date(),
			}))
		} catch (error) {
			console.error('❌ Ошибка при нормализации порядков:', error)
			setState(prev => ({
				...prev,
				error: `Ошибка при нормализации порядков: ${(error as Error).message}`,
			}))
		}
	}, [state.fields, setState])

	return {
		dragState,
		handleDragStart,
		handleDragOver,
		handleDragLeave,
		handleDrop,
		handleDragEnd,
		handleOrderChange,
		normalizeOrders,
	}
}
