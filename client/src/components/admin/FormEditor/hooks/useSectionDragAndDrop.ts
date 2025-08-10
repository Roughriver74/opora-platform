import { useCallback } from 'react'
import { FormField } from '../../../../types'
import { FormFieldService } from '../../../../services/formFieldService'
import { FormEditorState } from '../types'

export interface SectionDragHandlers {
	handleSectionDragStart: (
		e: React.DragEvent<HTMLDivElement>,
		section: FormField,
		sectionIndex: number
	) => void
	handleSectionDragOver: (
		e: React.DragEvent<HTMLDivElement>,
		sectionIndex: number
	) => void
	handleSectionDragLeave: () => void
	handleSectionDrop: (
		e: React.DragEvent<HTMLDivElement>,
		targetSectionIndex: number
	) => Promise<void>
	handleSectionDragEnd: (e: React.DragEvent<HTMLDivElement>) => void
	draggedSectionIndex: number | null
	dragOverSectionIndex: number | null
}

export const useSectionDragAndDrop = (
	state: FormEditorState,
	setState: React.Dispatch<React.SetStateAction<FormEditorState>>
): SectionDragHandlers => {
	const handleSectionDragStart = useCallback(
		(
			e: React.DragEvent<HTMLDivElement>,
			section: FormField,
			sectionIndex: number
		) => {
			setState(prev => ({ ...prev, draggedSectionIndex: sectionIndex }))
			e.dataTransfer.effectAllowed = 'move'
			e.dataTransfer.setData('section-index', sectionIndex.toString())

			// Визуальная обратная связь
			if (e.currentTarget) {
				e.currentTarget.style.opacity = '0.6'
				e.currentTarget.style.transform = 'scale(0.98)'
			}
		},
		[setState]
	)

	const handleSectionDragOver = useCallback(
		(e: React.DragEvent<HTMLDivElement>, sectionIndex: number) => {
			e.preventDefault()
			e.dataTransfer.dropEffect = 'move'
			// Останавливаем всплытие события, чтобы избежать конфликтов
			e.stopPropagation()
			setState(prev => ({ ...prev, dragOverSectionIndex: sectionIndex }))
		},
		[setState]
	)

	const handleSectionDragLeave = useCallback(() => {
		setState(prev => ({ ...prev, dragOverSectionIndex: null }))
	}, [setState])

	const handleSectionDrop = useCallback(
		async (e: React.DragEvent<HTMLDivElement>, targetSectionIndex: number) => {
			e.preventDefault()
			e.stopPropagation()

			const sourceSectionIndex = Number(e.dataTransfer.getData('section-index'))

				sourceSectionIndex,
				targetSectionIndex,
			})

			if (sourceSectionIndex === targetSectionIndex) {
				setState(prev => ({ ...prev, dragOverSectionIndex: null }))
				return
			}

			try {
				// Получаем все разделы (заголовки)
				const sections = state.fields
					.filter(field => field.type === 'header')
					.sort((a, b) => (a.order || 0) - (b.order || 0))


				if (sourceSectionIndex < 0 || sourceSectionIndex >= sections.length) {
					console.error('Неверный source индекс раздела:', sourceSectionIndex)
					setState(prev => ({ ...prev, dragOverSectionIndex: null }))
					return
				}

				// Нормализуем targetSectionIndex (убираем offset для drop zones)
				let actualTargetIndex = targetSectionIndex
				if (targetSectionIndex === 0) {
					// Перемещение в самое начало
					actualTargetIndex = 0
				} else if (targetSectionIndex > sections.length) {
					// Перемещение в конец (учитываем что у нас есть drop zones с offset)
					actualTargetIndex = sections.length
				} else {
					// Обычное перемещение
					actualTargetIndex = targetSectionIndex
				}


				// Создаем новый порядок разделов
				const reorderedSections = [...sections]
				const [movedSection] = reorderedSections.splice(sourceSectionIndex, 1)

				// Вставляем в правильную позицию
				if (actualTargetIndex >= reorderedSections.length) {
					reorderedSections.push(movedSection)
				} else {
					reorderedSections.splice(actualTargetIndex, 0, movedSection)
				}

				// Обновляем order для разделов: 100, 200, 300...
				const sectionUpdates = reorderedSections.map((section, index) => {
					const newOrder = (index + 1) * 100
					return { section, newOrder }
				})

				// Получаем все обычные поля (не заголовки)
				const regularFields = state.fields.filter(
					field => field.type !== 'header'
				)

				// Создаем массив всех обновлений для полей внутри разделов
				const fieldUpdates: Array<{ field: FormField; newOrder: number }> = []

				// Для каждого раздела обновляем порядок полей внутри него
				sectionUpdates.forEach(
					(
						{ section: originalSection, newOrder: newSectionOrder },
						sectionIndex
					) => {
						// Находим старый порядок этого раздела
						const oldSectionOrder = originalSection.order || 0

						// Находим все поля, которые принадлежат этому разделу
						const sectionFields = regularFields
							.filter(field => {
								const fieldOrder = field.order || 0
								return (
									fieldOrder > oldSectionOrder &&
									fieldOrder < oldSectionOrder + 100
								)
							})
							.sort((a, b) => (a.order || 0) - (b.order || 0))

						// Обновляем порядок полей в разделе: новый_раздел_order + 1, 2, 3...
						sectionFields.forEach((field, fieldIndex) => {
							const newFieldOrder = newSectionOrder + 1 + fieldIndex
							fieldUpdates.push({ field, newOrder: newFieldOrder })
						})
					}
				)

				// Выполняем все обновления разделов
				const sectionPromises = sectionUpdates
					.filter(({ section }) => section._id)
					.map(({ section, newOrder }) =>
						FormFieldService.updateField(section._id as string, {
							order: newOrder,
						})
					)

				// Выполняем все обновления полей
				const fieldPromises = fieldUpdates
					.filter(({ field }) => field._id)
					.map(({ field, newOrder }) =>
						FormFieldService.updateField(field._id as string, {
							order: newOrder,
						})
					)

				// Ждем завершения всех обновлений
				await Promise.all([...sectionPromises, ...fieldPromises])

					`✅ Обновлен порядок ${sectionPromises.length} разделов и ${fieldPromises.length} полей`
				)

				// Обновляем локальное состояние
				const updatedFields = state.fields.map(field => {
					// Обновляем разделы
					const sectionUpdate = sectionUpdates.find(
						({ section }) => section._id === field._id
					)
					if (sectionUpdate) {
						return { ...field, order: sectionUpdate.newOrder }
					}

					// Обновляем поля
					const fieldUpdate = fieldUpdates.find(
						({ field: f }) => f._id === field._id
					)
					if (fieldUpdate) {
						return { ...field, order: fieldUpdate.newOrder }
					}

					return field
				})

				setState(prev => ({
					...prev,
					fields: updatedFields,
					draggedSectionIndex: null,
					dragOverSectionIndex: null,
					hasChanges: true,
				}))
			} catch (error) {
				console.error('Ошибка при перемещении раздела:', error)
				setState(prev => ({
					...prev,
					error: 'Ошибка при перемещении раздела: ' + (error as Error).message,
					draggedSectionIndex: null,
					dragOverSectionIndex: null,
				}))
			}
		},
		[state.fields, setState]
	)

	const handleSectionDragEnd = useCallback(
		(e: React.DragEvent<HTMLDivElement>) => {
			if (e.currentTarget) {
				e.currentTarget.style.opacity = '1'
				e.currentTarget.style.transform = 'scale(1)'
			}
			setState(prev => ({
				...prev,
				draggedSectionIndex: null,
				dragOverSectionIndex: null,
			}))
		},
		[setState]
	)

	return {
		handleSectionDragStart,
		handleSectionDragOver,
		handleSectionDragLeave,
		handleSectionDrop,
		handleSectionDragEnd,
		draggedSectionIndex: (state as any).draggedSectionIndex || null,
		dragOverSectionIndex: (state as any).dragOverSectionIndex || null,
	}
}
