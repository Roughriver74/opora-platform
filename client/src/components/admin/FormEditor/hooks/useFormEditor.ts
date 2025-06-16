import { useState, useCallback } from 'react'
import { Form } from '../../../../types'
import { FormService } from '../../../../services/formService'
import { FormEditorState, SaveStatus } from '../types'
import { DEFAULT_FORM_DATA, NOTIFICATION_DURATION } from '../constants'
import { useFormData } from './useFormData'
import { useAutoSave } from './useAutoSave'

export const useFormEditor = (form?: Form, onSave?: (form: Form) => void) => {
	const [state, setState] = useState<FormEditorState>({
		formData: form || DEFAULT_FORM_DATA,
		fields: [],
		bitrixFields: {},
		dealCategories: [],
		loading: false,
		error: null,
		hasChanges: false,
		saving: false,
		autoSaving: false,
		lastSaved: null,
		showSuccess: false,
		draggedField: null,
		dragOverIndex: null,
	})

	// Используем выделенные хуки
	const { reloadFields } = useFormData(form, setState)
	useAutoSave(state, setState)

	// Обновление данных формы
	const handleFormChange = useCallback((name: string, value: any) => {
		setState(prev => ({
			...prev,
			formData: { ...prev.formData, [name]: value },
			hasChanges: true,
		}))
	}, [])

	// Ручное сохранение
	const handleFormSave = useCallback(async () => {
		setState(prev => ({ ...prev, saving: true, error: null }))

		try {
			// Для создания новой формы используем только основные поля
			// Поля добавляются потом через отдельный API
			const formToSave: Partial<Form> = {
				name: state.formData.name,
				title: state.formData.title,
				description: state.formData.description,
				isActive: state.formData.isActive,
				bitrixDealCategory: state.formData.bitrixDealCategory,
				successMessage: state.formData.successMessage,
			}

			let savedForm: Form
			if (state.formData._id) {
				// При обновлении добавляем связанные поля только если они есть
				const fieldIds = state.fields.map(field => field._id).filter(id => id)
				if (fieldIds.length > 0) {
					;(formToSave as any).fields = fieldIds
				}

				savedForm = await FormService.updateForm(state.formData._id, formToSave)
			} else {
				savedForm = await FormService.createForm(
					formToSave as Omit<Form, '_id'>
				)

				// Обновляем состояние с новым ID
				setState(prev => ({
					...prev,
					formData: { ...prev.formData, _id: savedForm._id },
				}))
			}

			setState(prev => ({
				...prev,
				hasChanges: false,
				lastSaved: new Date(),
				showSuccess: true,
				saving: false,
			}))

			if (onSave) onSave(savedForm)

			setTimeout(() => {
				setState(prev => ({ ...prev, showSuccess: false }))
			}, NOTIFICATION_DURATION.SUCCESS)
		} catch (err: any) {
			console.error('Ошибка сохранения формы:', err)

			// Специальная обработка ошибок авторизации
			if (err.isAuthError || (err.response && err.response.status === 401)) {
				setState(prev => ({
					...prev,
					error: 'Ошибка авторизации. Пожалуйста, войдите в систему заново.',
					saving: false,
				}))
				return // Не продолжаем обработку
			}

			// Более детальная обработка ошибок
			let errorMessage = 'Ошибка при сохранении формы'
			if (err.response?.data?.message) {
				errorMessage += ': ' + err.response.data.message
			} else if (err.message) {
				errorMessage += ': ' + err.message
			}

			setState(prev => ({
				...prev,
				error: errorMessage,
				saving: false,
			}))
		}
	}, [state.formData, state.fields, onSave])

	// Получение статуса сохранения
	const getSaveStatus = useCallback((): SaveStatus => {
		if (state.saving || state.autoSaving)
			return { text: 'Сохранение...', color: 'info' }
		if (state.hasChanges) return { text: 'Есть изменения', color: 'warning' }
		if (state.lastSaved)
			return {
				text: `Сохранено ${state.lastSaved.toLocaleTimeString()}`,
				color: 'success',
			}
		return { text: 'Новая форма', color: 'default' }
	}, [state.saving, state.autoSaving, state.hasChanges, state.lastSaved])

	// Управление ошибками
	const clearError = useCallback(() => {
		setState(prev => ({ ...prev, error: null }))
	}, [])

	return {
		state,
		setState,
		handleFormChange,
		handleFormSave,
		getSaveStatus,
		clearError,
		reloadFields,
	}
}
