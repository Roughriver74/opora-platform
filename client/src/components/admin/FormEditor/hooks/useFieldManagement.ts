import { useCallback } from 'react'
import { FormField } from '../../../../types'
import { FormFieldService } from '../../../../services/formFieldService'
import { FormEditorState } from '../types'
import { DEFAULT_FIELD_DATA } from '../constants'
import {
	getNextSectionOrder,
	getNextFieldOrder,
	getNextFieldOrderInSection,
	ORDER_CONSTANTS,
} from '../utils/orderUtils'

export const useFieldManagement = (
	state: FormEditorState,
	setState: React.Dispatch<React.SetStateAction<FormEditorState>>,
	loadFields?: () => Promise<void>,
	formId?: string
) => {
	// Сохранение поля
	const handleFieldSave = useCallback(
		async (index: number, updatedField: Partial<FormField>) => {
			try {
				console.log('🔍 handleFieldSave called with:', {
					index,
					updatedField,
					hasId: !!updatedField._id,
					hasRegularId: !!updatedField.id,
					fieldName: updatedField.name,
					stateFieldsCount: state.fields.length
				})

				let savedField: FormField
				const fieldId = updatedField._id || updatedField.id

				if (fieldId) {
					// Обновляем существующее поле
					// Находим оригинальное поле для получения всех данных
					const originalField = state.fields.find(
						f => (f._id === fieldId) || (f.id === fieldId)
					)
					if (!originalField) {
						throw new Error('Оригинальное поле не найдено')
					}

					// Объединяем оригинальные данные с обновлениями
					const completeField = {
						...originalField,
						...updatedField,
						_id: originalField._id || originalField.id,
						id: originalField.id || originalField._id,
						formId: originalField.formId || formId, // Сохраняем правильный formId
					} as FormField

					console.log('Field update debug:', {
						original: originalField,
						updates: updatedField,
						complete: completeField,
						fieldId,
					})

					savedField = await FormFieldService.updateField(
						fieldId,
						completeField
					)
				} else {
					// Создаем новое поле
					console.log('🆕 Creating new field because no _id found:', {
						fieldName: updatedField.name,
						formId,
						existingFieldsWithSameName: state.fields.filter(f => f.name === updatedField.name)
					})

					// Проверяем, есть ли уже поле с таким именем в state
					const existingField = state.fields.find(f => f.name === updatedField.name)
					const existingFieldId = existingField?._id || existingField?.id
					if (existingField && existingFieldId) {
						console.log('🔄 Found existing field with same name, switching to update mode:', existingField)
						// Переключаемся на режим обновления
						const completeField = {
							...existingField,
							...updatedField,
							_id: existingField._id || existingField.id,
							id: existingField.id || existingField._id,
							formId: existingField.formId || formId, // Сохраняем правильный formId
						} as FormField
						
						savedField = await FormFieldService.updateField(
							existingFieldId,
							completeField
						)
					} else {
						const fieldToCreate = {
							...updatedField,
							order: updatedField.order || state.fields.length + 1,
							formId: formId,
						} as Omit<FormField, '_id'>

						savedField = await FormFieldService.createFormField(
							formId || '',
							fieldToCreate
						)
					}
				}

				setState(prev => {
					const updatedFields = [...prev.fields]

					if (index >= 0 && index < updatedFields.length) {
						// Обновляем существующее поле по индексу
						updatedFields[index] = savedField
					} else {
						// Если индекс -1 или неверный, добавляем в конец
						updatedFields.push(savedField)
					}

					// ВСЕГДА сортируем поля по порядку для корректного отображения
					const sortedFields = updatedFields.sort(
						(a, b) => (a.order || 0) - (b.order || 0)
					)

					console.log(
					'🔄 Поля после сохранения:',
						sortedFields.map(f => ({
							name: f.name,
							type: f.type,
							order: f.order,
							id: f._id,
						}))
					)

					return {
						...prev,
						fields: sortedFields,
						hasChanges: true,
					}
				})


				// НЕ перезагружаем поля автоматически, чтобы избежать прокрутки страницы
				// Состояние уже обновлено выше и поля отсортированы
				// Перезагрузка происходит только при явном запросе пользователя
			} catch (err: any) {
				console.error('Ошибка при сохранении поля:', err)

				// Специальная обработка ошибок авторизации
				if (err.isAuthError || (err.response && err.response.status === 401)) {
					setState(prev => ({
						...prev,
						error: 'Ошибка авторизации. Пожалуйста, войдите в систему заново.',
					}))
					return // Не продолжаем обработку, чтобы избежать редиректа
				}

				let errorMessage = 'Неизвестная ошибка при сохранении поля'

				if (err.response?.data?.message) {
					errorMessage = err.response.data.message
				} else if (err.message) {
					errorMessage = err.message
				}

				setState(prev => ({
					...prev,
					error: 'Ошибка при сохранении поля: ' + errorMessage,
				}))
			}
		},
		[state.fields, setState, loadFields, formId]
	)

	// Добавление нового поля
	const addNewField = useCallback(() => {
		// Используем новую систему порядка
		const newOrder = getNextFieldOrder(state.fields)

		const newField: Partial<FormField> = {
			name: `field_${Date.now()}`,
			label: `Поле ${state.fields.length + 1}`,
			order: newOrder,
			formId: formId,
			...DEFAULT_FIELD_DATA,
		}

		console.log('🔧 Создаём поле:', {
			name: newField.name,
			order: newField.order,
			formId: newField.formId,
			section:
				Math.floor(newOrder / ORDER_CONSTANTS.SECTION_STEP) *
				ORDER_CONSTANTS.SECTION_STEP,
		});

		// Вместо добавления в состояние, сразу сохраняем в БД
		handleFieldSave(-1, newField)
	}, [state.fields, handleFieldSave, formId])

	// Добавление нового раздела
	const addNewSection = useCallback(() => {
		// Используем новую систему порядка для разделов
		const sectionOrder = getNextSectionOrder(state.fields)

		const newSection: Partial<FormField> = {
			name: `section_${Date.now()}`,
			label: `Раздел ${Math.floor(
				sectionOrder / ORDER_CONSTANTS.SECTION_STEP
			)}`,
			type: 'header',
			order: sectionOrder,
			required: false,
			formId: formId,
			headerData: {
				label: `Раздел ${Math.floor(
					sectionOrder / ORDER_CONSTANTS.SECTION_STEP
				)}`,
				level: 2,
			},
		}

		console.log('🔧 Создаём раздел:', {
			name: newSection.name,
			label: newSection.label,
			order: newSection.order,
			formId: newSection.formId,
		});

		// Сразу сохраняем в БД
		handleFieldSave(-1, newSection)
	}, [state.fields, handleFieldSave, formId])

	// Добавление поля в конкретный раздел
	const addFieldToSection = useCallback(
		(sectionOrder: number) => {
			const newOrder = getNextFieldOrderInSection(state.fields, sectionOrder)

			const newField: Partial<FormField> = {
				name: `field_${Date.now()}`,
				label: `Поле ${new Date().getTime() % 1000}`,
				order: newOrder,
				formId: formId,
				...DEFAULT_FIELD_DATA,
			}

			console.log('🔧 Добавляем поле в раздел:', {
				name: newField.name,
				order: newField.order,
				formId: newField.formId,
				sectionOrder,
			});

			handleFieldSave(-1, newField);
		},
		[state.fields, handleFieldSave, formId]
	)

	// Удаление поля
	const handleFieldDelete = useCallback(
		async (index: number) => {
			const field = state.fields[index]

			if (field._id) {
				try {
					await FormFieldService.deleteFormField(field._id)
				} catch (err: any) {
					setState(prev => ({
						...prev,
						error: 'Ошибка при удалении поля: ' + err.message,
					}))
					return
				}
			}

			setState(prev => ({
				...prev,
				fields: prev.fields.filter((_, i) => i !== index),
				hasChanges: true,
			}))
		},
		[state.fields, setState]
	)

	// Перемещение поля в конкретный раздел
	const moveFieldToSection = useCallback(
		async (
			fieldId: string,
			targetSectionOrder: number,
			newPosition?: number
		) => {
			try {
				// Находим поле для перемещения
				const fieldToMove = state.fields.find(f => f._id === fieldId)
				if (!fieldToMove) {
					console.error('Поле для перемещения не найдено:', fieldId)
					return
				}

				// Определяем новый order
				let newOrder: number

				if (newPosition !== undefined) {
					// Если указана конкретная позиция, используем её
					newOrder = newPosition
				} else {
					// Иначе размещаем в конце раздела
					const sectionFields = state.fields.filter(
						f =>
							f.order > targetSectionOrder && f.order < targetSectionOrder + 100
					)
					const maxSectionOrder =
						sectionFields.length > 0
							? Math.max(...sectionFields.map(f => f.order || 0))
							: targetSectionOrder
					newOrder = maxSectionOrder + 1
				}

				console.log('🔄 Перемещение поля:', {
					fieldName: fieldToMove.name,
					oldOrder: fieldToMove.order,
					newOrder,
					targetSection: targetSectionOrder,
				});

				// Обновляем поле с новым order
				const updatedField = { ...fieldToMove, order: newOrder }
				await handleFieldSave(
					state.fields.findIndex(f => f._id === fieldId),
					updatedField
				)
			} catch (error) {
				console.error('Ошибка при перемещении поля:', error)
				setState(prev => ({
					...prev,
					error: 'Ошибка при перемещении поля: ' + (error as Error).message,
				}))
			}
		},
		[state.fields, handleFieldSave, setState]
	)

	// Нормализация порядка полей
	const normalizeOrders = useCallback(async () => {
		try {
			console.log('🔄 Нормализация порядка полей');

			// Группируем поля по типам
			const sections = state.fields
				.filter(f => f.type === 'header')
				.sort((a, b) => (a.order || 0) - (b.order || 0))
			const regularFields = state.fields.filter(f => f.type !== 'header')

			const updates: Promise<any>[] = []
			const localUpdates: FormField[] = []

			// Первый проход: пересчитываем разделы на основе их текущего порядка
			// НЕ меняем порядок разделов, только нормализуем поля внутри разделов
			console.log(
				'📋 Разделы в текущем порядке:',
				sections.map(s => ({ label: s.label, order: s.order }))
			);

			// Переупорядочиваем поля внутри каждого раздела
			sections.forEach(section => {
				const sectionOrder = section.order || 0

				// Находим поля этого раздела
				const sectionFields = regularFields
					.filter(field => {
						const fieldOrder = field.order || 0
						return fieldOrder > sectionOrder && fieldOrder < sectionOrder + 100
					})
					.sort((a, b) => (a.order || 0) - (b.order || 0))

				console.log(
					`📁 Раздел "${section.label}" (${sectionOrder}): ${sectionFields.length} полей`
				);

				// Переупорядочиваем поля: sectionOrder+1, sectionOrder+2, sectionOrder+3...
				sectionFields.forEach((field, fieldIndex) => {
					const newOrder = sectionOrder + 1 + fieldIndex
					if (field.order !== newOrder && field._id) {
						console.log(
							`🔹 Поле "${field.label}": ${field.order} → ${newOrder}`
						);
						updates.push(
							FormFieldService.updateField(field._id, { order: newOrder })
						)

						// Обновляем локальное состояние
						localUpdates.push({ ...field, order: newOrder })
					}
				})
			})

			// Обрабатываем поля без раздела (если есть)
			const orphanFields = regularFields.filter(field => {
				const fieldOrder = field.order || 0
				return !sections.some(section => {
					const sectionOrder = section.order || 0
					return fieldOrder > sectionOrder && fieldOrder < sectionOrder + 100
				})
			})

			if (orphanFields.length > 0) {
				console.warn(
					'⚠️ Найдены поля без раздела:',
					orphanFields.map(f => ({ label: f.label, order: f.order }))
				)

				// Размещаем поля без раздела в начале (order: 1, 2, 3...)
				orphanFields.forEach((field, index) => {
					const newOrder = index + 1
					if (field.order !== newOrder && field._id) {
						console.log(
							`🔸 Поле без раздела "${field.label}": ${field.order} → ${newOrder}`
						);
						updates.push(
							FormFieldService.updateField(field._id, { order: newOrder })
						)
						localUpdates.push({ ...field, order: newOrder })
					}
				})
			}

			// Выполняем все обновления
			if (updates.length > 0) {
				await Promise.all(updates)

				// Обновляем локальное состояние без перезагрузки из БД
				setState(prev => ({
					...prev,
					fields: prev.fields
						.map(field => {
							const updatedField = localUpdates.find(u => u._id === field._id)
							return updatedField || field
						})
						.sort((a, b) => (a.order || 0) - (b.order || 0)),
					hasChanges: true,
				}))
			} else {
				console.log('✅ Нормализация не требуется - все поля уже упорядочены');
			}
		} catch (error) {
			console.error('❌ Ошибка при нормализации порядка:', error)
			setState(prev => ({
				...prev,
				error:
					'Ошибка при нормализации порядка полей: ' + (error as Error).message,
			}))
		}
	}, [state.fields, setState])

	return {
		addNewField,
		addNewSection,
		addFieldToSection,
		handleFieldSave,
		handleFieldDelete,
		moveFieldToSection,
		normalizeOrders,
	}
}
