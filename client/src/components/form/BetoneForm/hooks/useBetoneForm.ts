import { useState } from 'react'
import { useFormik } from 'formik'
import { FormField as FormFieldType } from '../../../../types'
import { SubmitResult } from '../types'
import { SubmissionService } from '../../../../services/submissionService'
import {
	generateValidationSchema,
	generateInitialValues,
} from '../utils/validationHelpers'
import { useFormSections } from './useFormSections'
import { useScrollBehavior } from './useScrollBehavior'
import { useNotificationHelpers } from '../../../../contexts/notification'

/**
 * Основной хук для управления состоянием формы BetoneForm
 * @param formId - ID формы
 * @param fields - массив полей формы
 * @param editData - данные для редактирования заявки
 * @returns объект с состоянием и методами для работы с формой
 */
export const useBetoneForm = (
	formId: string,
	fields: FormFieldType[],
	editData?: {
		submissionId?: string
		formId: string
		formData: Record<string, any>
		isCopy?: boolean
		originalTitle?: string
		originalSubmissionNumber?: string
	},
	preloadedOptions?: Record<string, any[]>
) => {
	const [submitting, setSubmitting] = useState(false)
	const [submitResult, setSubmitResult] = useState<SubmitResult | null>(null)
	const { showSuccess, showError } = useNotificationHelpers()

	// Инициализация formik с оптимизированными настройками
	const formik = useFormik({
		initialValues: generateInitialValues(fields, editData?.formData),
		validationSchema: generateValidationSchema(fields),
		validateOnChange: false, // Отключаем валидацию при каждом изменении
		validateOnBlur: true,    // Включаем валидацию только при blur
		onSubmit: async values => {
			setSubmitting(true)
			setSubmitResult(null)

			try {
				let result

				if (editData?.submissionId) {
					// Режим редактирования - обновляем существующую заявку
					result = await SubmissionService.updateSubmission(
						editData.submissionId,
						values
					)
				} else {
					// Режим создания - создаем новую заявку
					const submission = {
						formId: formId,
						formData: values,
					}

					result = await SubmissionService.submitForm(
						formId,
						values,
						submission
					)
				}

				if (result.success) {
					const successMessage = (result as any).message ||
						(editData?.submissionId
							? 'Заявка успешно обновлена!'
							: 'Заявка успешно отправлена!')

					// Показываем глобальное уведомление поверх экрана
					showSuccess(successMessage, {
						title: editData?.submissionId ? 'Обновлено!' : 'Отправлено!',
						autoHideDuration: 3000,
						onAfterHide: () => {
							// Обновляем страницу только для новых заявок, не для редактирования
							if (!editData?.submissionId) {
								window.location.reload()
							}
						}
					})

					// Устанавливаем результат для совместимости с существующими компонентами
					setSubmitResult({
						success: true,
						message: successMessage,
					})

					// Для редактирования - загружаем свежие данные из Битрикс24
					if (editData?.submissionId) {
						try {
							const updatedData = await SubmissionService.getSubmissionForEdit(
								editData.submissionId
							)
							if (updatedData.success && updatedData.data.formData) {
								// Обновляем форму свежими данными
								formik.setValues(updatedData.data.formData)
							}
						} catch (error) {
							console.error('Ошибка загрузки обновленных данных:', error)
						}
					}
				} else {
					const errorMessage = (result as any).message ||
						(editData?.submissionId
							? 'Произошла ошибка при обновлении заявки.'
							: 'Произошла ошибка при отправке заявки.')

					// Показываем глобальное уведомление об ошибке
					showError(errorMessage, {
						title: 'Ошибка!',
						autoHideDuration: 5000,
					})

					// Устанавливаем результат для совместимости с существующими компонентами
					setSubmitResult({
						success: false,
						message: errorMessage,
					})
				}
			} catch (error) {
				console.error('Ошибка отправки формы:', error)
				const errorMessage = 'Произошла ошибка при отправке заявки. Попробуйте еще раз.'

				// Показываем глобальное уведомление об ошибке
				showError(errorMessage, {
					title: 'Ошибка!',
					autoHideDuration: 5000,
				})

				// Устанавливаем результат для совместимости с существующими компонентами
				setSubmitResult({
					success: false,
					message: errorMessage,
				})
			} finally {
				setSubmitting(false)
			}
		},
	})

	// Подключаем хуки для дополнительной функциональности
	const sectionsLogic = useFormSections(fields)
	const scrollBehavior = useScrollBehavior()

	// Метод для очистки результата отправки
	const clearSubmitResult = () => {
		setSubmitResult(null)
	}

	// Метод для сброса формы
	const resetForm = () => {
		formik.resetForm()
		setSubmitResult(null)
		sectionsLogic.setActiveSection(0)
		// Сбрасываем развернутые секции и разворачиваем только первую
		sectionsLogic.setExpandedSections?.(new Set([0]))
	}

	return {
		// Formik
		formik,

		// Состояние отправки
		submitting,
		submitResult,
		clearSubmitResult,
		resetForm,

		// Логика секций
		...sectionsLogic,

		// Логика прокрутки
		...scrollBehavior,

		// Вспомогательные методы
		handleFieldChange: (name: string, value: any) => {
			formik.setFieldValue(name, value)
		},

		getFieldError: (fieldName: string) => {
			return formik.touched[fieldName]
				? (formik.errors[fieldName] as string)
				: undefined
		},
	}
}
