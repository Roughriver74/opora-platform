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
		validateOnBlur: true, // Включаем валидацию только при blur
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
					const successMessage =
						(result as any).message ||
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
						},
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
					const errorMessage =
						(result as any).message ||
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
				const errorMessage =
					'Произошла ошибка при отправке заявки. Попробуйте еще раз.'

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

	// Обновляем значения формы при изменении editData (для копирования и редактирования)
	useEffect(() => {
		if (editData?.formData && Object.keys(editData.formData).length > 0) {
			console.log(
				'[FORM] Обновление значений формы из editData:',
				editData.formData
			)
			console.log('[FORM] Режим копирования:', editData.isCopy)
			console.log('[FORM] Текущие значения formik:', formik.values)

			// Используем setTimeout для обеспечения корректного обновления после рендера
			setTimeout(() => {
				// Объединяем текущие значения с новыми данными
				const newValues = {
					...formik.values,
					...editData.formData,
				}
				console.log('[FORM] Новые значения для установки:', newValues)
				formik.setValues(newValues)
			}, 100) // Увеличиваем задержку для корректной инициализации
		}
	}, [editData]) // eslint-disable-line react-hooks/exhaustive-deps

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

	// Метод для очистки конкретной секции
	const clearSection = (sectionIndex: number) => {
		const section = sectionsLogic.fieldSections[sectionIndex]
		if (!section) return

		// Создаем объект с пустыми значениями для полей этой секции
		const clearedValues: Record<string, any> = {}

		section.fields.forEach(field => {
			// Определяем значение по умолчанию в зависимости от типа поля
			switch (field.type) {
				case 'text':
				case 'textarea':
				case 'number':
					clearedValues[field.name] = ''
					break
				case 'select':
				case 'radio':
				case 'autocomplete':
					clearedValues[field.name] = ''
					break
				case 'checkbox':
					clearedValues[field.name] = false
					break
				case 'date':
					clearedValues[field.name] = ''
					break
				default:
					clearedValues[field.name] = ''
			}
		})

		// Обновляем значения формы
		formik.setValues({
			...formik.values,
			...clearedValues,
		})

		// Сбрасываем ошибки валидации для очищенных полей
		const clearedTouched: Record<string, boolean> = {}
		const clearedErrors: Record<string, string> = {}

		section.fields.forEach(field => {
			clearedTouched[field.name] = false
			delete clearedErrors[field.name]
		})

		formik.setTouched({
			...formik.touched,
			...clearedTouched,
		})

		formik.setErrors({
			...formik.errors,
			...clearedErrors,
		})
	}

	return {
		// Formik
		formik,

		// Состояние отправки
		submitting,
		submitResult,
		clearSubmitResult,
		resetForm,
		clearSection,

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
