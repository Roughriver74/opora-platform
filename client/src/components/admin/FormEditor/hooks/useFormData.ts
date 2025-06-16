import React, { useEffect } from 'react'
import { Form, FormField } from '../../../../types'
import { FormService } from '../../../../services/formService'
import { FormFieldService } from '../../../../services/formFieldService'
import { FormEditorState } from '../types'

export const useFormData = (
	form: Form | undefined,
	setState: React.Dispatch<React.SetStateAction<FormEditorState>>
) => {
	// Функция перезагрузки полей из БД
	const reloadFields = React.useCallback(async () => {
		if (form && form._id && form.fields && typeof form.fields[0] === 'string') {
			try {
				const allFields = await FormFieldService.getAllFields()
				const formFields = allFields.filter((field: FormField) =>
					(form.fields as string[]).includes(field._id!)
				)

				// КРИТИЧЕСКИ ВАЖНО: Сортируем поля по order для корректного отображения
				const sortedFields = formFields.sort(
					(a: FormField, b: FormField) => (a.order || 0) - (b.order || 0)
				)

				console.log(
					'🔄 Перезагружены поля формы:',
					sortedFields.map((f: FormField) => ({
						name: f.name,
						type: f.type,
						order: f.order,
						id: f._id,
					}))
				)

				setState(prev => ({ ...prev, fields: sortedFields }))
			} catch (err: any) {
				console.error('Ошибка при перезагрузке полей:', err)
			}
		}
	}, [form, setState])
	// Загрузка данных из Битрикс24
	useEffect(() => {
		const loadBitrixData = async () => {
			setState(prev => ({ ...prev, loading: true, error: null }))

			try {
				const [fieldsResponse, categoriesResponse] = await Promise.all([
					FormFieldService.getBitrixFields(),
					FormService.getDealCategories(),
				])

				setState(prev => ({
					...prev,
					bitrixFields: fieldsResponse?.result || {},
					dealCategories: categoriesResponse?.result || [],
					loading: false,
				}))
			} catch (err: any) {
				setState(prev => ({
					...prev,
					error: 'Ошибка при загрузке данных из Битрикс24: ' + err.message,
					loading: false,
				}))
			}
		}

		loadBitrixData()
	}, [setState])

	// Загрузка полей формы
	useEffect(() => {
		if (form && form._id && form.fields) {
			if (typeof form.fields[0] === 'string') {
				const loadFields = async () => {
					setState(prev => ({ ...prev, loading: true }))

					try {
						const allFields = await FormFieldService.getAllFields()
						const formFields = allFields.filter((field: FormField) =>
							(form.fields as string[]).includes(field._id!)
						)

						// КРИТИЧЕСКИ ВАЖНО: Сортируем поля по order для корректного отображения
						const sortedFields = formFields.sort(
							(a: FormField, b: FormField) => (a.order || 0) - (b.order || 0)
						)

						console.log(
							'🔄 Загружены поля формы:',
							sortedFields.map((f: FormField) => ({
								name: f.name,
								type: f.type,
								order: f.order,
								id: f._id,
							}))
						)

						setState(prev => ({
							...prev,
							fields: sortedFields,
							loading: false,
						}))
					} catch (err: any) {
						setState(prev => ({
							...prev,
							error: 'Ошибка при загрузке полей формы: ' + err.message,
							loading: false,
						}))
					}
				}
				loadFields()
			} else {
				// Если поля уже загружены как объекты, тоже сортируем их
				const sortedFields = (form.fields as FormField[]).sort(
					(a, b) => (a.order || 0) - (b.order || 0)
				)
				setState(prev => ({ ...prev, fields: sortedFields }))
			}
		}
	}, [form, setState])

	return { reloadFields }
}
