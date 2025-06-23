import { useState, useEffect, useCallback } from 'react'
import { FormFieldService } from '../../../../services/formFieldService'
import { FormField } from '../../../../types'
import { validateFieldOrder } from '../utils/sectionUtils'

interface UseFormFieldsReturn {
	data: FormField[] | null
	isLoading: boolean
	error: string | null
	updateField: (id: string, updates: Partial<FormField>) => Promise<void>
	reloadData: () => Promise<void>
}

export const useFormFields = (): UseFormFieldsReturn => {
	const [data, setData] = useState<FormField[] | null>(null)
	const [isLoading, setIsLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)

	const loadData = useCallback(async () => {
		try {
			setIsLoading(true)
			setError(null)
			const fields = await FormFieldService.getAllFields()

			// Сортируем по порядку для удобства просмотра
			const sortedFields = fields.sort(
				(a: FormField, b: FormField) => (a.order || 0) - (b.order || 0)
			)

			setData(sortedFields)
		} catch (err: any) {
			console.error('Ошибка загрузки полей формы:', err)
			setError(err.message || 'Неизвестная ошибка')
		} finally {
			setIsLoading(false)
		}
	}, [])

	const updateField = useCallback(
		async (id: string, updates: Partial<FormField>) => {
			try {
				console.log('🔄 Обновление поля:', { id, updates })

				// Находим поле которое обновляем
				const currentField = data?.find(f => f._id === id)
				if (!currentField) {
					throw new Error('Поле не найдено')
				}

				// Валидируем новый порядок если он изменяется
				if (updates.order !== undefined && data) {
					const validation = validateFieldOrder(
						currentField,
						updates.order,
						data
					)
					if (!validation.isValid) {
						throw new Error(validation.message || 'Неверный порядок поля')
					}
				}

				// Отправляем обновление на сервер
				await FormFieldService.updateField(id, updates)
				console.log('✅ Поле успешно обновлено на сервере')

				// Перезагружаем данные чтобы получить актуальное состояние
				await loadData()
			} catch (err: any) {
				console.error('❌ Ошибка обновления поля:', err)
				throw err
			}
		},
		[data, loadData]
	)

	const reloadData = useCallback(async () => {
		await loadData()
	}, [loadData])

	useEffect(() => {
		loadData()
	}, [loadData])

	return {
		data,
		isLoading,
		error,
		updateField,
		reloadData,
	}
}
