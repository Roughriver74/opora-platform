import { useState, useEffect, useCallback } from 'react'
import { Form } from '../../../../types'
import { FormService } from '../../../../services/formService'
import { FormEditorState } from '../types'
import { AUTOSAVE_DELAY, NOTIFICATION_DURATION } from '../constants'

export const useAutoSave = (
	state: FormEditorState,
	setState: React.Dispatch<React.SetStateAction<FormEditorState>>
) => {
	const [saveTimeout, setSaveTimeout] = useState<NodeJS.Timeout | null>(null)

	// Автосохранение
	const autoSave = useCallback(async () => {
		if (
			state.hasChanges &&
			!state.saving &&
			!state.autoSaving &&
			state.formData._id
		) {
			setState(prev => ({ ...prev, autoSaving: true }))

			try {
				// Создаем копию данных формы без полей для автосохранения
				// Поля сохраняются отдельно через свой API
				const formToSave = {
					title: state.formData.title || '',
					description: state.formData.description || '',
					fields: state.fields || [],
				}

				// Автосохранение только для существующих форм
				const savedForm = await FormService.updateForm(
					state.formData._id,
					formToSave
				)

				setState(prev => ({
					...prev,
					hasChanges: false,
					lastSaved: new Date(),
					autoSaving: false,
				}))

			} catch (err: any) {
				console.error('Ошибка автосохранения:', err)

				// Не показываем ошибки автосохранения пользователю, только логируем
				setState(prev => ({
					...prev,
					autoSaving: false,
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

	// Эффект автосохранения
	useEffect(() => {
		if (state.hasChanges && !state.saving && !state.autoSaving) {
			if (saveTimeout) clearTimeout(saveTimeout)
			const timeout = setTimeout(autoSave, AUTOSAVE_DELAY)
			setSaveTimeout(timeout)
		}

		return () => {
			if (saveTimeout) clearTimeout(saveTimeout)
		}
	}, [state.hasChanges, state.saving, state.autoSaving, autoSave])

	return { autoSave }
}
