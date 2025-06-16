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
				const formToSave: Partial<Form> = {
					name: state.formData.name,
					title: state.formData.title,
					description: state.formData.description,
					isActive: state.formData.isActive,
					bitrixDealCategory: state.formData.bitrixDealCategory,
					successMessage: state.formData.successMessage,
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

				console.log('Автосохранение успешно:', savedForm._id)
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
