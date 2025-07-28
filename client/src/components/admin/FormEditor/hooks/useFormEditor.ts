import { useState, useCallback, useEffect } from 'react'
import { Form } from '../../../../types'
import { FormService } from '../../../../services/formService'
import { FormEditorState, SaveStatus, DealCategory } from '../types'
import { DEFAULT_FORM_DATA, NOTIFICATION_DURATION } from '../constants'
import { useFormData } from './useFormData'
import { useAutoSave } from './useAutoSave'
import api from '../../../../services/api'

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
	const { fields: loadedFields, loadFields } = useFormData(form?._id || '')
	useAutoSave(state, setState)

	// Синхронизация загруженных полей с состоянием
	useEffect(() => {
		if (loadedFields && loadedFields.length > 0) {
			setState(prev => ({
				...prev,
				fields: loadedFields,
			}))
		}
	}, [loadedFields])

	// Загрузка полей Битрикс и категорий сделок
	const loadBitrixData = useCallback(async () => {
		setState(prev => ({ ...prev, loading: true }))

		try {
			const [bitrixFieldsResponse, dealCategoriesResponse] = await Promise.all([
				api.get('/api/form-fields/bitrix/fields'),
				api.get('/api/forms/bitrix/deal-categories'),
			])

			// Безопасное извлечение данных категорий
			let dealCategoriesData: DealCategory[] = []
			try {
				const rawData = dealCategoriesResponse.data
				if (rawData && rawData.data && Array.isArray(rawData.data)) {
					dealCategoriesData = rawData.data
				} else if (Array.isArray(rawData)) {
					dealCategoriesData = rawData
				}
			} catch (categoryError) {
				console.error('Ошибка обработки категорий сделок:', categoryError)
			}

			setState(prev => ({
				...prev,
				bitrixFields: bitrixFieldsResponse.data.result || {},
				dealCategories: dealCategoriesData,
				loading: false,
			}))
		} catch (error: any) {
			console.error('Ошибка загрузки данных Битрикс24:', error)
			setState(prev => ({
				...prev,
				error:
					'Ошибка загрузки данных Битрикс24: ' +
					(error.message || 'Неизвестная ошибка'),
				loading: false,
			}))
		}
	}, [])

	// Загружаем данные Битрикс при монтировании компонента
	useEffect(() => {
		loadBitrixData()
	}, [loadBitrixData])

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
			const formToSave = {
				name: state.formData.name || '',
				title: state.formData.title || '',
				description: state.formData.description || '',
				isActive: state.formData.isActive || false,
				bitrixDealCategory: state.formData.bitrixDealCategory,
				successMessage: state.formData.successMessage || '',
			}

			let savedForm: Form
			if (state.formData._id) {
				// При обновлении добавляем связанные поля только если они есть
				const fieldIds = state.fields.map(field => field._id).filter(id => id)
				if (fieldIds.length > 0) {
					;(formToSave as any).fields = fieldIds
				}

				savedForm = await FormService.updateForm(
					state.formData._id,
					formToSave as any
				)
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
		loadFields,
	}
}
