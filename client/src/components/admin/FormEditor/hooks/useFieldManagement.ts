import { useCallback } from 'react'
import { FormField } from '../../../../types'
import { FormFieldService } from '../../../../services/formFieldService'
import { FormEditorState } from '../types'
import { DEFAULT_FIELD_DATA } from '../constants'

export const useFieldManagement = (
	state: FormEditorState,
	setState: React.Dispatch<React.SetStateAction<FormEditorState>>,
	reloadFields?: () => Promise<void>
) => {
	// Сохранение поля
	const handleFieldSave = useCallback(
		async (index: number, updatedField: Partial<FormField>) => {
			try {
				console.log('Сохранение поля:', { index, updatedField })

				let savedField: FormField

				if (updatedField._id) {
					// Обновляем существующее поле
					savedField = await FormFieldService.updateField(
						updatedField._id,
						updatedField as FormField
					)
					console.log('Поле обновлено:', savedField)
				} else {
					// Создаем новое поле
					const fieldToCreate = {
						...updatedField,
						order: updatedField.order || state.fields.length + 1,
					} as Omit<FormField, '_id'>

					savedField = await FormFieldService.createField(fieldToCreate)
					console.log('Поле создано:', savedField)
				}

				setState(prev => {
					const updatedFields = [...prev.fields]

					if (index >= 0 && index < updatedFields.length) {
						// Обновляем существующее поле по индексу
						updatedFields[index] = savedField
					} else {
						// Если индекс -1 или неверный, добавляем в конец
						updatedFields.push(savedField)
					}

					// ВСЕГДА сортируем поля по порядку для корректного отображения
					const sortedFields = updatedFields.sort(
						(a, b) => (a.order || 0) - (b.order || 0)
					)

					console.log(
						'🔄 Поля после сохранения:',
						sortedFields.map(f => ({
							name: f.name,
							type: f.type,
							order: f.order,
							id: f._id,
						}))
					)

					return {
						...prev,
						fields: sortedFields,
						hasChanges: true,
					}
				})

				console.log('Поле успешно сохранено')

				// Перезагружаем поля из БД для синхронизации
				if (reloadFields) {
					setTimeout(() => reloadFields(), 100)
				}
			} catch (err: any) {
				console.error('Ошибка при сохранении поля:', err)

				// Специальная обработка ошибок авторизации
				if (err.isAuthError || (err.response && err.response.status === 401)) {
					setState(prev => ({
						...prev,
						error: 'Ошибка авторизации. Пожалуйста, войдите в систему заново.',
					}))
					return // Не продолжаем обработку, чтобы избежать редиректа
				}

				let errorMessage = 'Неизвестная ошибка при сохранении поля'

				if (err.response?.data?.message) {
					errorMessage = err.response.data.message
				} else if (err.message) {
					errorMessage = err.message
				}

				setState(prev => ({
					...prev,
					error: 'Ошибка при сохранении поля: ' + errorMessage,
				}))
			}
		},
		[state.fields, setState]
	)

	// Добавление нового поля
	const addNewField = useCallback(() => {
		// Определяем следующий порядок для обычного поля
		const maxOrder =
			state.fields.length > 0
				? Math.max(...state.fields.map(f => f.order || 0))
				: 0

		const newField: Partial<FormField> = {
			name: `field_${Date.now()}`,
			label: `Поле ${state.fields.length + 1}`,
			order: maxOrder + 1,
			...DEFAULT_FIELD_DATA,
		}

		console.log('➕ Добавляется новое поле:', {
			name: newField.name,
			order: newField.order,
		})

		// Вместо добавления в состояние, сразу сохраняем в БД
		handleFieldSave(-1, newField)
	}, [state.fields, handleFieldSave])

	// Удаление поля
	const handleFieldDelete = useCallback(
		async (index: number) => {
			const field = state.fields[index]

			if (field._id) {
				try {
					await FormFieldService.deleteField(field._id)
				} catch (err: any) {
					setState(prev => ({
						...prev,
						error: 'Ошибка при удалении поля: ' + err.message,
					}))
					return
				}
			}

			setState(prev => ({
				...prev,
				fields: prev.fields.filter((_, i) => i !== index),
				hasChanges: true,
			}))
		},
		[state.fields, setState]
	)

	// Перемещение поля в конкретный раздел
	const moveFieldToSection = useCallback(
		async (
			fieldId: string,
			targetSectionOrder: number,
			newPosition?: number
		) => {
			try {
				// Находим поле для перемещения
				const fieldToMove = state.fields.find(f => f._id === fieldId)
				if (!fieldToMove) {
					console.error('Поле для перемещения не найдено:', fieldId)
					return
				}

				// Определяем новый order
				let newOrder: number

				if (newPosition !== undefined) {
					// Если указана конкретная позиция, используем её
					newOrder = newPosition
				} else {
					// Иначе размещаем в конце раздела
					const sectionFields = state.fields.filter(
						f =>
							f.order > targetSectionOrder && f.order < targetSectionOrder + 100
					)
					const maxSectionOrder =
						sectionFields.length > 0
							? Math.max(...sectionFields.map(f => f.order || 0))
							: targetSectionOrder
					newOrder = maxSectionOrder + 1
				}

				console.log('🔄 Перемещение поля:', {
					fieldName: fieldToMove.name,
					oldOrder: fieldToMove.order,
					newOrder,
					targetSection: targetSectionOrder,
				})

				// Обновляем поле с новым order
				const updatedField = { ...fieldToMove, order: newOrder }
				await handleFieldSave(
					state.fields.findIndex(f => f._id === fieldId),
					updatedField
				)
			} catch (error) {
				console.error('Ошибка при перемещении поля:', error)
				setState(prev => ({
					...prev,
					error: 'Ошибка при перемещении поля: ' + (error as Error).message,
				}))
			}
		},
		[state.fields, handleFieldSave, setState]
	)

	return {
		addNewField,
		handleFieldSave,
		handleFieldDelete,
		moveFieldToSection,
	}
}
