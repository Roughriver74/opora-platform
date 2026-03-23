import * as yup from 'yup'
import { FormField as FormFieldType } from '../../../../types'
import { NON_VALIDATABLE_TYPES, FORM_CONSTANTS } from '../constants'

/**
 * Создает схему валидации Yup на основе полей формы
 * Исключает неактивные поля из валидации
 * @param fields - массив полей формы
 * @returns объект схемы валидации Yup
 */
export const generateValidationSchema = (fields: FormFieldType[]) => {
	const schemaFields: Record<string, any> = {}

	// Фильтруем только активные поля
	const activeFields = fields.filter(field => field.isActive !== false)

	activeFields.forEach(field => {
		// Пропускаем поля, которые не требуют валидации
		if (
			NON_VALIDATABLE_TYPES.includes(
				field.type as (typeof NON_VALIDATABLE_TYPES)[number]
			)
		) {
			return
		}

		let fieldSchema: any

		// Определяем базовый тип валидации
		switch (field.type) {
			case 'number':
				fieldSchema = yup
					.number()
					.typeError(FORM_CONSTANTS.VALIDATION_MESSAGES.number)
				break

			case 'text':
				fieldSchema = yup.string()
				break

			case 'textarea':
				fieldSchema = yup.string()
				break

			case 'date':
				fieldSchema = yup.date().typeError('Введите корректную дату')
				break

			case 'select':
				fieldSchema = yup.string()
				break

			case 'autocomplete':
				fieldSchema = yup.string()
				break

			case 'checkbox':
				fieldSchema = yup.boolean()
				break

			case 'radio':
				fieldSchema = yup.string()
				break

			case 'product_table':
				fieldSchema = yup.array().of(
					yup.object().shape({
						nomenclatureId: yup.string().required(),
						quantity: yup.number().positive('Количество должно быть больше 0').required('Укажите количество'),
						price: yup.number().min(0, 'Цена не может быть отрицательной').required(),
						discount: yup.number().min(0).max(100).optional(),
					})
				)
				break

			default:
				fieldSchema = yup.string()
		}

		// Добавляем обязательность на основе поля required
		if (field.required) {
			fieldSchema = fieldSchema.required(
				FORM_CONSTANTS.VALIDATION_MESSAGES.required
			)
		}

		schemaFields[field.name] = fieldSchema
	})

	return yup.object().shape(schemaFields)
}

/**
 * Генерирует начальные значения для формы
 * Исключает неактивные поля
 * @param fields - массив полей формы
 * @param editData - данные для предзаполнения (при редактировании)
 * @returns объект с начальными значениями
 */
export const generateInitialValues = (
	fields: FormFieldType[],
	editData?: Record<string, any>
): Record<string, any> => {
	const initialValues: Record<string, any> = {}

	// Фильтруем только активные поля
	const activeFields = fields.filter(field => field.isActive !== false)

	activeFields.forEach(field => {
		// Пропускаем поля без значений
		if (
			NON_VALIDATABLE_TYPES.includes(
				field.type as (typeof NON_VALIDATABLE_TYPES)[number]
			)
		) {
			return
		}

		// Сначала проверяем, есть ли данные для предзаполнения
		if (editData && editData[field.name] !== undefined) {
			initialValues[field.name] = editData[field.name]
			return
		}

		// Устанавливаем значение по умолчанию в зависимости от типа
		switch (field.type) {
			case 'number':
				initialValues[field.name] = ''
				break
			case 'checkbox':
				initialValues[field.name] = false
				break
			case 'radio':
				initialValues[field.name] = ''
				break
			case 'product_table':
				initialValues[field.name] = []
				break
			case 'text':
			case 'textarea':
			case 'date':
			case 'select':
			case 'autocomplete':
			default:
				initialValues[field.name] = ''
		}
	})

	return initialValues
}
