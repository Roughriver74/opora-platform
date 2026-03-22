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
	const [periodTime, setPeriodTime] = useState('')
	const [dateFieldName, setDateFieldName] = useState<string>('')
	const [timeFieldName, setTimeFieldName] = useState<string>('')
	const [dateRangeError, setDateRangeError] = useState<string | null>(null)

	// Находим поле с типом "date" для даты отгрузки
	// И поле времени (ищем по label или bitrixFieldId, содержащим "время" или "time")
	useEffect(() => {
		// Ищем любое поле с типом "date"
		const dateField = fields.find(f => f.type === 'date')

		if (dateField) {
			setDateFieldName(dateField.name)
		}

		// Ищем поле времени по label или bitrixFieldId
		// Например, поле с label "Время" или bitrixFieldId содержащим "time"
		const timeField = fields.find(
			f =>
				f.label?.toLowerCase().includes('время') ||
				f.label?.toLowerCase().includes('time') ||
				f.bitrixFieldId?.toLowerCase().includes('time')
		)
		if (timeField) {
			setTimeFieldName(timeField.name)
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
			setPeriodTime('')
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

			const periodConfig: any = {
				startDate: periodStartDate,
				endDate: periodEndDate,
				dateFieldName,
			}

			// Добавляем время из интерфейса периода (если указано)
			if (periodTime) {
				// Используем timeFieldName, если есть
				if (timeFieldName) {
					periodConfig.timeFieldName = timeFieldName
				}
				periodConfig.time = periodTime
			}

			const response = await periodSubmissionService.createPeriodSubmissions({
				formId,
				formData,
				periodConfig,
			})

			return response
		},
		[
			periodStartDate,
			periodEndDate,
			periodTime,
			dateFieldName,
			timeFieldName,
			validatePeriodSubmission,
			dateRangeError,
		]
	)

	return {
		// Состояние
		isPeriodMode,
		periodStartDate,
		periodEndDate,
		periodTime,
		dateFieldName,
		timeFieldName,
		dateRangeError,
		hasDateField: hasDateField(),
		hasTimeField: !!timeFieldName,

		// Методы
		togglePeriodMode,
		setPeriodStartDate,
		setPeriodEndDate,
		setPeriodTime,
		validatePeriodSubmission,
		submitPeriodSubmissions,
	}
}
