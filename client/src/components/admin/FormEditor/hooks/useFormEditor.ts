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

	// Используем выделенные хуки - передаем ID только если форма существует
	const { fields: loadedFields, loadFields, reloadFormData } = useFormData(form?._id || form?.id || '')
	useAutoSave(state, setState)

	// Обновляем formData при изменении form prop
	useEffect(() => {
		if (form) {
			setState(prev => ({
				...prev,
				formData: form,
			}))
			// Перезагружаем данные формы если ID изменился
			if (form._id || form.id) {
				reloadFormData()
			}
		}
	}, [form, reloadFormData])

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
			const formId = state.formData._id || state.formData.id
			if (formId) {
				// При обновлении не отправляем поля - они управляются через отдельный API
				// Удаляем поля из объекта, чтобы не было конфликта с backend
				const { fields, ...formDataWithoutFields } = formToSave as any

				savedForm = await FormService.updateForm(
					formId,
					formDataWithoutFields
				)
			} else {
				savedForm = await FormService.createForm(
					formToSave as Omit<Form, '_id'>
				)

				// Обновляем состояние с новым ID
				setState(prev => ({
					...prev,
					formData: { ...prev.formData, _id: savedForm._id || savedForm.id, id: savedForm.id || savedForm._id },
				}))
			}

			setState(prev => ({
				...prev,
				hasChanges: false,
				lastSaved: new Date(),
				showSuccess: true,
				saving: false,
			}))

			// Перезагружаем поля после сохранения формы для обеспечения актуальности данных
			if (savedForm._id || savedForm.id) {
				await loadFields()
			}

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
	}, [state.formData, onSave, loadFields])

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
