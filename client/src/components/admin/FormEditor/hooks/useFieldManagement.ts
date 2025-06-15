import { useCallback } from 'react'
import { FormField } from '../../../../types'
import { FormFieldService } from '../../../../services/formFieldService'
import { FormEditorState } from '../types'
import { DEFAULT_FIELD_DATA } from '../constants'

export const useFieldManagement = (
	state: FormEditorState,
	setState: React.Dispatch<React.SetStateAction<FormEditorState>>
) => {
	// Добавление нового поля
	const addNewField = useCallback(() => {
		// Определяем следующий порядок для обычного поля
		const maxOrder =
			state.fields.length > 0
				? Math.max(...state.fields.map(f => f.order || 0))
				: 0

		const newField: Partial<FormField> = {
			name: `field_${state.fields.length + 1}`,
			label: `Поле ${state.fields.length + 1}`,
			order: maxOrder + 1,
			...DEFAULT_FIELD_DATA,
		}

		setState(prev => ({
			...prev,
			fields: [...prev.fields, newField as FormField],
			hasChanges: true,
		}))
	}, [state.fields, setState])

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
						// Сортируем поля по порядку после добавления
						updatedFields.sort((a, b) => (a.order || 0) - (b.order || 0))
					}

					return {
						...prev,
						fields: updatedFields,
						hasChanges: true,
					}
				})

				console.log('Поле успешно сохранено')
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

	return {
		addNewField,
		handleFieldSave,
		handleFieldDelete,
	}
}
