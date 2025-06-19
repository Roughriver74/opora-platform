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
	reloadFields?: () => Promise<void>,
	formId?: string
) => {
	// Сохранение поля
	const handleFieldSave = useCallback(
		async (index: number, updatedField: Partial<FormField>) => {
			try {
				console.log('Сохранение поля:', { index, updatedField })

				let savedField: FormField

				if (updatedField._id) {
					// Обновляем существующее поле
					savedField = await FormFieldService.updateField(
						updatedField._id,
						updatedField as FormField
					)
					console.log('Поле обновлено:', savedField)
				} else {
					// Создаем новое поле
					const fieldToCreate = {
						...updatedField,
						order: updatedField.order || state.fields.length + 1,
						formId: formId,
					} as Omit<FormField, '_id'>

					savedField = await FormFieldService.createField(fieldToCreate)
					console.log('Поле создано:', savedField)
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

				console.log('Поле успешно сохранено')

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
		[state.fields, setState, reloadFields, formId]
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

		console.log('➕ Добавляется новое поле:', {
			name: newField.name,
			order: newField.order,
			formId: newField.formId,
			section:
				Math.floor(newOrder / ORDER_CONSTANTS.SECTION_STEP) *
				ORDER_CONSTANTS.SECTION_STEP,
		})

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

		console.log('📁 Добавляется новый раздел:', {
			name: newSection.name,
			label: newSection.label,
			order: newSection.order,
			formId: newSection.formId,
		})

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

			console.log('➕ Добавляется поле в раздел:', {
				name: newField.name,
				order: newField.order,
				formId: newField.formId,
				sectionOrder,
			})

			handleFieldSave(-1, newField)
		},
		[state.fields, handleFieldSave, formId]
	)

	// Удаление поля
	const handleFieldDelete = useCallback(
		async (index: number) => {
			const field = state.fields[index]

			if (field._id) {
				try {
					await FormFieldService.deleteField(field._id)
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
				})

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
			console.log('🔧 Начинаем нормализацию порядка полей...')

			// Группируем поля по типам
			const sections = state.fields
				.filter(f => f.type === 'header')
				.sort((a, b) => (a.order || 0) - (b.order || 0))
			const regularFields = state.fields.filter(f => f.type !== 'header')

			const updates: Promise<any>[] = []

			// Переупорядочиваем разделы: 100, 200, 300...
			sections.forEach((section, index) => {
				const newOrder = (index + 1) * ORDER_CONSTANTS.SECTION_STEP
				if (section.order !== newOrder && section._id) {
					console.log(
						`📁 Раздел "${section.label}": ${section.order} → ${newOrder}`
					)
					updates.push(
						FormFieldService.updateField(section._id, { order: newOrder })
					)
				}
			})

			// Переупорядочиваем поля внутри разделов
			sections.forEach((section, sectionIndex) => {
				const sectionOrder = (sectionIndex + 1) * ORDER_CONSTANTS.SECTION_STEP

				// Находим поля этого раздела
				const sectionFields = regularFields
					.filter(field => {
						const fieldOrder = field.order || 0
						return (
							fieldOrder > sectionOrder &&
							fieldOrder < sectionOrder + ORDER_CONSTANTS.SECTION_STEP
						)
					})
					.sort((a, b) => (a.order || 0) - (b.order || 0))

				// Переупорядочиваем поля: 101, 102, 103...
				sectionFields.forEach((field, fieldIndex) => {
					const newOrder =
						sectionOrder + ORDER_CONSTANTS.FIELD_START_OFFSET + fieldIndex
					if (field.order !== newOrder && field._id) {
						console.log(
							`🔹 Поле "${field.label}": ${field.order} → ${newOrder}`
						)
						updates.push(
							FormFieldService.updateField(field._id, { order: newOrder })
						)
					}
				})
			})

			// Обрабатываем поля без раздела (если есть)
			const orphanFields = regularFields.filter(field => {
				const fieldOrder = field.order || 0
				return !sections.some(section => {
					const sectionOrder = section.order || 0
					return (
						fieldOrder > sectionOrder &&
						fieldOrder < sectionOrder + ORDER_CONSTANTS.SECTION_STEP
					)
				})
			})

			if (orphanFields.length > 0) {
				console.warn(
					'⚠️ Найдены поля без раздела:',
					orphanFields.map(f => f.label)
				)
				// Можно добавить логику для их размещения
			}

			// Выполняем все обновления
			if (updates.length > 0) {
				await Promise.all(updates)
				console.log(`✅ Обновлено ${updates.length} полей`)

				// Перезагружаем поля
				if (reloadFields) {
					await reloadFields()
				}

				setState(prev => ({
					...prev,
					hasChanges: true,
				}))
			} else {
				console.log('✅ Порядок полей уже корректный')
			}
		} catch (error) {
			console.error('❌ Ошибка при нормализации порядка:', error)
			setState(prev => ({
				...prev,
				error:
					'Ошибка при нормализации порядка полей: ' + (error as Error).message,
			}))
		}
	}, [state.fields, setState, reloadFields])

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
