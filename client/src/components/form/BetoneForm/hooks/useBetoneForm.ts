import { useState, useEffect } from 'react'
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
					setSubmitResult({
						success: true,
						message:
							(result as any).message ||
							(editData?.submissionId
								? 'Заявка успешно обновлена!'
								: 'Заявка успешно отправлена!'),
					})
					// Сбрасываем форму только для новых заявок, не для редактирования
					if (!editData?.submissionId) {
						formik.resetForm()
					} else {
						// Для редактирования - загружаем свежие данные из Битрикс24
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
					setSubmitResult({
						success: false,
						message:
							(result as any).message ||
							(editData?.submissionId
								? 'Произошла ошибка при обновлении заявки.'
								: 'Произошла ошибка при отправке заявки.'),
					})
				}
			} catch (error) {
				console.error('Ошибка отправки формы:', error)
				setSubmitResult({
					success: false,
					message: 'Произошла ошибка при отправке заявки. Попробуйте еще раз.',
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
