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
		if (!form?._id) {
			console.warn('⚠️ Нет ID формы для перезагрузки полей')
			return
		}

		try {
			setState(prev => ({ ...prev, loading: true }))

			// Получаем обновленную форму и все поля
			const [updatedForm, allFields] = await Promise.all([
				FormService.getFormById(form._id),
				FormFieldService.getAllFields(),
			])

			console.log('🔄 Перезагрузка данных:', {
				formFieldsCount: updatedForm.fields?.length || 0,
				allFieldsCount: allFields.length,
			})

			// Фильтруем поля, которые принадлежат форме
			let formFields: FormField[] = []

			if (updatedForm.fields && updatedForm.fields.length > 0) {
				if (typeof updatedForm.fields[0] === 'string') {
					// ID полей - нужно найти соответствующие объекты
					formFields = allFields.filter((field: FormField) =>
						(updatedForm.fields as string[]).includes(field._id!)
					)
				} else {
					// Уже объекты полей
					formFields = updatedForm.fields as FormField[]
				}
			}

			// Сортируем поля по order
			const sortedFields = formFields.sort(
				(a: FormField, b: FormField) => (a.order || 0) - (b.order || 0)
			)

			console.log(
				'✅ Перезагружены поля формы:',
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
				formData: { ...prev.formData, ...updatedForm },
				loading: false,
			}))
		} catch (err: any) {
			console.error('❌ Ошибка при перезагрузке полей:', err)
			setState(prev => ({
				...prev,
				error: 'Ошибка при перезагрузке полей: ' + err.message,
				loading: false,
			}))
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
		console.log('🔍 useFormData: Checking form data...', {
			hasForm: !!form,
			formId: form?._id,
			fieldsType: form?.fields ? typeof form.fields[0] : 'no fields',
			fieldsLength: form?.fields?.length || 0,
		})

		if (form && form._id && form.fields) {
			if (typeof form.fields[0] === 'string') {
				const loadFields = async () => {
					console.log('🚀 useFormData: Starting to load fields...')
					setState(prev => ({ ...prev, loading: true }))

					try {
						console.log(
							'🌐 useFormData: Calling FormFieldService.getAllFields...'
						)
						const allFields = await FormFieldService.getAllFields()
						console.log(
							'📥 useFormData: Received fields from API:',
							allFields.length
						)

						const formFields = allFields.filter((field: FormField) =>
							(form.fields as string[]).includes(field._id!)
						)
						console.log(
							'🔍 useFormData: Filtered fields for form:',
							formFields.length
						)

						// КРИТИЧЕСКИ ВАЖНО: Сортируем поля по order для корректного отображения
						const sortedFields = formFields.sort(
							(a: FormField, b: FormField) => (a.order || 0) - (b.order || 0)
						)

						console.log(
							'🔄 Загружены поля формы:',
							sortedFields.slice(0, 10).map((f: FormField) => ({
								name: f.name,
								type: f.type,
								order: f.order,
								id: f._id,
							}))
						)
						console.log(
							'📊 useFormData: Total sorted fields:',
							sortedFields.length
						)

						setState(prev => ({
							...prev,
							fields: sortedFields,
							loading: false,
						}))
					} catch (err: any) {
						console.error('❌ useFormData: Error loading fields:', err)
						setState(prev => ({
							...prev,
							error: 'Ошибка при загрузке полей формы: ' + err.message,
							loading: false,
						}))
					}
				}
				loadFields()
			} else {
				console.log('📋 useFormData: Fields already loaded as objects')
				// Если поля уже загружены как объекты, тоже сортируем их
				const sortedFields = (form.fields as FormField[]).sort(
					(a, b) => (a.order || 0) - (b.order || 0)
				)
				setState(prev => ({ ...prev, fields: sortedFields }))
			}
		} else {
			console.log('⚠️ useFormData: Missing form data:', {
				hasForm: !!form,
				hasFormId: !!form?._id,
				hasFields: !!form?.fields,
				fieldsLength: form?.fields?.length || 0,
			})
		}
	}, [form, setState])

	return { reloadFields }
}
