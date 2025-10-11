import { useState, useEffect, useCallback } from 'react'
import { FormField as FormFieldType } from '../../../../types'
import { periodSubmissionService } from '../../../../services/periodSubmissionService'
import { validateDateRange } from '../utils/dateHelpers'

/**
 * Хук для управления периодическими заявками
 */
export const usePeriodSubmission = (fields: FormFieldType[]) => {
	const [isPeriodMode, setIsPeriodMode] = useState(false)
	const [periodStartDate, setPeriodStartDate] = useState('')
	const [periodEndDate, setPeriodEndDate] = useState('')
	const [dateFieldName, setDateFieldName] = useState<string>('')
	const [dateRangeError, setDateRangeError] = useState<string | null>(null)

	// Находим поле "Дата отгрузки" (field_1750311865385) или любое поле с типом "date"
	useEffect(() => {
		// Сначала ищем конкретное поле "Дата отгрузки"
		let dateField = fields.find(f => f.name === 'field_1750311865385')

		// Если не найдено, ищем любое поле с типом "date"
		if (!dateField) {
			dateField = fields.find(f => f.type === 'date')
		}

		if (dateField) {
			setDateFieldName(dateField.name)
		}
	}, [fields])

	// Валидация диапазона дат
	useEffect(() => {
		if (isPeriodMode && periodStartDate && periodEndDate) {
			const error = validateDateRange(periodStartDate, periodEndDate)
			setDateRangeError(error)
		} else {
			setDateRangeError(null)
		}
	}, [isPeriodMode, periodStartDate, periodEndDate])

	/**
	 * Переключение режима периодических заявок
	 */
	const togglePeriodMode = useCallback((enabled: boolean) => {
		setIsPeriodMode(enabled)
		if (!enabled) {
			setPeriodStartDate('')
			setPeriodEndDate('')
			setDateRangeError(null)
		}
	}, [])

	/**
	 * Проверка, можно ли использовать периодические заявки
	 */
	const hasDateField = useCallback(() => {
		return !!dateFieldName
	}, [dateFieldName])

	/**
	 * Валидация перед отправкой
	 */
	const validatePeriodSubmission = useCallback((): boolean => {
		if (!isPeriodMode) return true

		if (!dateFieldName) {
			setDateRangeError('Поле с датой не найдено в форме')
			return false
		}

		const error = validateDateRange(periodStartDate, periodEndDate)
		if (error) {
			setDateRangeError(error)
			return false
		}

		return true
	}, [isPeriodMode, dateFieldName, periodStartDate, periodEndDate])

	/**
	 * Создание периодических заявок
	 */
	const submitPeriodSubmissions = useCallback(
		async (formId: string, formData: Record<string, any>) => {
			if (!validatePeriodSubmission()) {
				throw new Error(dateRangeError || 'Ошибка валидации периода')
			}

			const response = await periodSubmissionService.createPeriodSubmissions({
				formId,
				formData,
				periodConfig: {
					startDate: periodStartDate,
					endDate: periodEndDate,
					dateFieldName,
				},
			})

			return response
		},
		[
			periodStartDate,
			periodEndDate,
			dateFieldName,
			validatePeriodSubmission,
			dateRangeError,
		]
	)

	return {
		// Состояние
		isPeriodMode,
		periodStartDate,
		periodEndDate,
		dateFieldName,
		dateRangeError,
		hasDateField: hasDateField(),

		// Методы
		togglePeriodMode,
		setPeriodStartDate,
		setPeriodEndDate,
		validatePeriodSubmission,
		submitPeriodSubmissions,
	}
}
