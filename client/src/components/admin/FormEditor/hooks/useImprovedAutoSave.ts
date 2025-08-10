import { useEffect, useCallback, useRef } from 'react'
import { Form } from '../../../../types'
import { FormService } from '../../../../services/formService'
import { FormEditorState } from '../types'
import { AUTOSAVE_DELAY } from '../constants'

export const useImprovedAutoSave = (
	state: FormEditorState,
	setState: React.Dispatch<React.SetStateAction<FormEditorState>>
) => {
	const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
	const isMountedRef = useRef(true)

	// Очистка при размонтировании
	useEffect(() => {
		return () => {
			isMountedRef.current = false
			if (saveTimeoutRef.current) {
				clearTimeout(saveTimeoutRef.current)
				saveTimeoutRef.current = null
			}
		}
	}, [])

	// Функция автосохранения
	const autoSave = useCallback(async () => {
		// Проверяем, что компонент все еще смонтирован
		if (!isMountedRef.current) {
			return
		}

		// Проверяем условия для автосохранения
		if (
			!state.hasChanges ||
			state.saving ||
			state.autoSaving ||
			!state.formData._id
		) {
			return
		}

		// Безопасно обновляем состояние
		if (isMountedRef.current) {
			setState(prev => ({ ...prev, autoSaving: true }))
		}

		try {
			// Создаем копию данных формы без полей для автосохранения
			const formToSave = {
				title: state.formData.title || '',
				description: state.formData.description || '',
				fields: state.fields || [],
			}

			// Выполняем автосохранение
			const savedForm = await FormService.updateForm(
				state.formData._id,
				formToSave
			)

			// Проверяем, что компонент все еще смонтирован перед обновлением состояния
			if (isMountedRef.current) {
				setState(prev => ({
					...prev,
					hasChanges: false,
					lastSaved: new Date(),
					autoSaving: false,
				}))
			}

		} catch (err: any) {
			console.error('❌ Ошибка автосохранения:', err)

			// Безопасно обновляем состояние ошибки
			if (isMountedRef.current) {
				setState(prev => ({
					...prev,
					autoSaving: false,
					// Не показываем ошибки автосохранения пользователю
				}))
			}
		}
	}, [
		state.hasChanges,
		state.saving,
		state.autoSaving,
		state.formData,
		setState,
	])

	// Эффект для запуска автосохранения
	useEffect(() => {
		// Очищаем предыдущий таймер
		if (saveTimeoutRef.current) {
			clearTimeout(saveTimeoutRef.current)
			saveTimeoutRef.current = null
		}

		// Запускаем автосохранение если есть изменения
		if (
			state.hasChanges &&
			!state.saving &&
			!state.autoSaving &&
			state.formData._id
		) {
			saveTimeoutRef.current = setTimeout(() => {
				// Проверяем, что компонент все еще смонтирован
				if (isMountedRef.current) {
					autoSave()
				}
			}, AUTOSAVE_DELAY)
		}

		// Cleanup функция
		return () => {
			if (saveTimeoutRef.current) {
				clearTimeout(saveTimeoutRef.current)
				saveTimeoutRef.current = null
			}
		}
	}, [
		state.hasChanges,
		state.saving,
		state.autoSaving,
		state.formData._id,
		autoSave,
	])

	// Функция для принудительного автосохранения
	const forceAutoSave = useCallback(() => {
		if (saveTimeoutRef.current) {
			clearTimeout(saveTimeoutRef.current)
			saveTimeoutRef.current = null
		}
		autoSave()
	}, [autoSave])

	// Функция для отмены автосохранения
	const cancelAutoSave = useCallback(() => {
		if (saveTimeoutRef.current) {
			clearTimeout(saveTimeoutRef.current)
			saveTimeoutRef.current = null
		}
	}, [])

	return {
		forceAutoSave,
		cancelAutoSave,
		isAutoSaving: state.autoSaving,
	}
}
