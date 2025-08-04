import { Request, Response } from 'express'
import FormField from '../models/FormField'
import Form from '../models/Form'
import bitrix24Service from '../services/bitrix24Service'

// Получение всех полей формы
export const getAllFields = async (
	req: Request,
	res: Response
): Promise<void> => {
	try {
		const fields = await FormField.find().sort({ order: 1 })
		res.status(200).json(fields)
	} catch (error: any) {
		res.status(500).json({ message: error.message })
	}
}

// Получение конкретного поля формы по ID
export const getFieldById = async (
	req: Request,
	res: Response
): Promise<void> => {
	try {
		let field = await FormField.findById(req.params.id)
		
		if (!field) {
			// Пробуем найти по строковому значению _id
			console.log('findById не нашел поле, пробуем найти по _id как строке...')
			field = await FormField.findOne({ _id: req.params.id })
			
			if (!field) {
				// Найдем поле вручную из всех полей
				console.log('Поле все еще не найдено. Пробуем ручной поиск...')
				const allFields = await FormField.find({}) // Загружаем ВСЕ данные сразу
				const targetField = allFields.find(f => f._id.toString() === req.params.id)
				
				if (targetField) {
					console.log('Поле найдено через ручной поиск в массиве!')
					// Используем найденное поле напрямую
					field = targetField
				}
			}
		}
		
		if (!field) {
			res.status(404).json({ message: 'Поле не найдено' })
			return
		}
		res.status(200).json(field)
	} catch (error: any) {
		res.status(500).json({ message: error.message })
	}
}

// Создание нового поля формы
export const createField = async (
	req: Request,
	res: Response
): Promise<void> => {
	try {
		const fieldData = req.body
		console.log('📝 Создание поля с данными:', {
			name: fieldData.name,
			type: fieldData.type,
			formId: fieldData.formId,
		})

		const field = new FormField(fieldData)
		const savedField = await field.save()

		// Автоматически добавляем поле в форму
		if (fieldData.formId) {
			// Используем formId из запроса
			const form = await Form.findById(fieldData.formId)
			if (form) {
				await Form.findByIdAndUpdate(fieldData.formId, {
					$push: { fields: savedField._id },
				})
				console.log(
					`📋 Поле ${savedField.name} добавлено в форму ${form.title} (ID: ${fieldData.formId})`
				)
			} else {
				console.warn(`⚠️ Форма с ID ${fieldData.formId} не найдена`)
			}
		} else {
			// Если formId не передан, используем первую найденную форму (backward compatibility)
			const form = await Form.findOne()
			if (form) {
				await Form.findByIdAndUpdate(form._id, {
					$push: { fields: savedField._id },
				})
				console.log(
					`📋 Поле ${savedField.name} добавлено в первую найденную форму ${form.title} (ID: ${form._id})`
				)
			} else {
				console.warn(
					'⚠️ Ни одной формы не найдено, поле создано но не привязано'
				)
			}
		}

		res.status(201).json(savedField)
	} catch (error: any) {
		console.error('❌ Ошибка при создании поля:', error)
		res.status(400).json({ message: error.message })
	}
}

// Обновление существующего поля формы
export const updateField = async (
	req: Request,
	res: Response
): Promise<void> => {
	try {
		console.log('🚀 updateField ВХОД - ID:', req.params.id, 'тип:', typeof req.params.id)
		console.log('🔄 Обновление поля ID:', req.params.id)
		console.log('📝 Данные для обновления:', JSON.stringify(req.body, null, 2))

		console.log('🔍 Пробуем findById...')
		let field = await FormField.findById(req.params.id)
		console.log('📊 Результат findById:', field ? 'НАЙДЕНО' : 'НЕ НАЙДЕНО')
		
		if (!field) {
			// Пробуем найти по строковому значению _id
			console.log('🔍 findById не нашел поле, пробуем найти по _id как строке...')
			field = await FormField.findOne({ _id: req.params.id })
			console.log('📊 Результат findOne({ _id: string }):', field ? 'НАЙДЕНО' : 'НЕ НАЙДЕНО')
			
			if (!field) {
				// Выведем все поля для отладки
				console.log('🔍 Поле все еще не найдено. Пробуем ручной поиск...')
				const allFields = await FormField.find({}) // Загружаем ВСЕ данные сразу
				console.log(`📊 Всего полей в базе: ${allFields.length}`)
				
				// Найдем поле вручную из всех полей
				const targetField = allFields.find(f => f._id.toString() === req.params.id)
				console.log('📊 Ручной поиск:', targetField ? 'НАЙДЕНО' : 'НЕ НАЙДЕНО')
				
				if (targetField) {
					console.log('✅ Поле найдено через ручной поиск в массиве!', {
						id: targetField._id.toString(),
						name: targetField.name,
						label: targetField.label
					})
					// Используем найденное поле напрямую (оно уже полное)
					field = targetField
					console.log('📊 Используем найденное поле:', field ? 'УСПЕШНО' : 'НЕУДАЧНО')
				} else {
					console.log('❌ Список первых 5 полей для отладки:')
					allFields.slice(0, 5).forEach(f => {
						console.log(`- ID: ${f._id}, тип: ${typeof f._id}, name: ${f.name}, label: ${f.label}`)
						console.log(`  Сравнение с искомым ID: ${f._id.toString() === req.params.id}`)
					})
				}
			}
		}
		
		if (!field) {
			console.log('❌ Поле окончательно не найдено:', req.params.id)
			res.status(404).json({ message: 'Поле не найдено' })
			return
		}

		console.log('📋 Оригинальное поле:', {
			_id: field._id,
			name: field.name,
			label: field.label,
			type: field.type,
			order: field.order,
		})

		Object.assign(field, req.body)

		console.log('📝 Поле после объединения данных:', {
			_id: field._id,
			name: field.name,
			label: field.label,
			type: field.type,
			order: field.order,
		})

		// Пробуем разные способы обновления
		console.log('🔄 Пробуем findByIdAndUpdate...')
		let updatedField = await FormField.findByIdAndUpdate(
			field._id,
			req.body,
			{ new: true, runValidators: true }
		)

		if (!updatedField) {
			console.log('❌ findByIdAndUpdate не сработал, пробуем updateOne...')
			const updateResult = await FormField.updateOne(
				{ _id: field._id },
				req.body
			)
			
			console.log('📊 Результат updateOne:', updateResult)
			
			if (updateResult.matchedCount === 0) {
				console.log('🔄 Пробуем updateOne с _id как строкой...')
				const stringUpdateResult = await FormField.updateOne(
					{ _id: req.params.id },
					req.body
				)
				console.log('📊 Результат updateOne со строкой:', stringUpdateResult)
				
				if (stringUpdateResult.matchedCount > 0) {
					// Получаем обновленное поле через ручной поиск
					const allFields = await FormField.find({})
					updatedField = allFields.find(f => f._id.toString() === req.params.id)
				}
			} else if (updateResult.matchedCount > 0) {
				// Получаем обновленное поле через ручной поиск
				const allFields = await FormField.find({})
				updatedField = allFields.find(f => f._id.toString() === req.params.id)
			}
		}

		if (!updatedField) {
			console.log('⚠️ Не удалось обновить поле в БД (старые данные), возвращаем виртуальное обновление')
			// Для старых полей, которые не могут быть обновлены из-за коррупции данных,
			// возвращаем исходное поле с примененными изменениями
			const virtuallyUpdatedField = {
				...field.toObject ? field.toObject() : field,
				...req.body,
				updatedAt: new Date()
			}
			
			// Инвалидируем кэш даже для виртуального обновления
			const { formCache } = require('../services/cacheService')
			await formCache.clearFormCache()
			console.log('🗑️ Кэш форм инвалидирован после виртуального обновления поля')
			
			res.status(200).json(virtuallyUpdatedField)
			return
		}

		console.log('✅ Поле успешно обновлено через findByIdAndUpdate:', {
			_id: updatedField._id,
			name: updatedField.name,
			label: updatedField.label,
			type: updatedField.type,
			order: updatedField.order,
		})

		// Инвалидируем кэш форм после обновления поля
		const { formCache } = require('../services/cacheService')
		await formCache.clearFormCache()
		console.log('🗑️ Кэш форм инвалидирован после обновления поля')

		res.status(200).json(updatedField)
	} catch (error: any) {
		console.error('❌ Ошибка при обновлении поля:', error)
		console.error('📋 Детали ошибки:', error.message)
		if (error.name === 'ValidationError') {
			console.error('💥 Ошибки валидации:', error.errors)
		}
		res.status(400).json({ message: error.message })
	}
}

// Удаление поля формы
export const deleteField = async (
	req: Request,
	res: Response
): Promise<void> => {
	try {
		let field = await FormField.findById(req.params.id)
		
		if (!field) {
			// Пробуем найти по строковому значению _id
			console.log('findById не нашел поле для удаления, пробуем найти по _id как строке...')
			field = await FormField.findOne({ _id: req.params.id })
			
			if (!field) {
				// Найдем поле вручную из всех полей
				console.log('Поле все еще не найдено. Пробуем ручной поиск...')
				const allFields = await FormField.find({}) // Загружаем ВСЕ данные сразу
				const targetField = allFields.find(f => f._id.toString() === req.params.id)
				
				if (targetField) {
					console.log('Поле найдено через ручной поиск в массиве!')
					// Используем найденное поле напрямую
					field = targetField
				}
			}
		}
		
		if (!field) {
			res.status(404).json({ message: 'Поле не найдено' })
			return
		}

		// Удаляем поле из всех форм
		await Form.updateMany(
			{ fields: req.params.id },
			{ $pull: { fields: req.params.id } }
		)

		// Удаляем само поле
		await FormField.findByIdAndDelete(req.params.id)

		console.log(`🗑️ Поле ${field.name} удалено из базы и всех форм`)
		res.status(200).json({ message: 'Поле успешно удалено' })
	} catch (error: any) {
		console.error('❌ Ошибка при удалении поля:', error)
		res.status(500).json({ message: error.message })
	}
}

// Получение доступных полей из Битрикс24
export const getBitrixFields = async (
	req: Request,
	res: Response
): Promise<void> => {
	try {
		const fieldsResponse = await bitrix24Service.getDealFields()

		if (!fieldsResponse || !fieldsResponse.result) {
			res.status(404).json({ message: 'Не удалось получить поля из Битрикс24' })
			return
		}

		const formattedFields = Object.entries(fieldsResponse.result).reduce(
			(acc: any, [fieldCode, fieldData]: [string, any]) => {
				const fieldName =
					fieldData.formLabel ||
					fieldData.listLabel ||
					fieldData.title ||
					fieldCode

				acc[fieldCode] = {
					code: fieldCode,
					name: fieldName,
					type: fieldData.type,
					isRequired: fieldData.isRequired,
					isMultiple: fieldData.isMultiple,
					items: fieldData.items, // Для полей типа enumeration
					originalData: fieldData, // Сохраняем исходные данные для полной совместимости
				}

				return acc
			},
			{}
		)

		res.status(200).json({
			result: formattedFields,
			time: fieldsResponse.time,
		})
	} catch (error: any) {
		console.error('Ошибка при получении полей из Битрикс24:', error)
		res.status(500).json({ message: error.message })
	}
}

// Получение номенклатуры из Битрикс24 для динамических полей
export const getProductsList = async (
	req: Request,
	res: Response
): Promise<void> => {
	try {
		const { query } = req.query
		const products = await bitrix24Service.getProducts(query as string)
		res.status(200).json(products)
	} catch (error: any) {
		res.status(500).json({ message: error.message })
	}
}

// Получение списка компаний из Битрикс24
export const getCompaniesList = async (
	req: Request,
	res: Response
): Promise<void> => {
	try {
		const { query } = req.query
		const user = req.user // Получаем пользователя из middleware

		// Определяем параметры фильтрации
		let assignedFilter = null
		if (user && user.settings?.onlyMyCompanies && user.bitrix_id) {
			assignedFilter = user.bitrix_id
		}

		console.log('🔍 Запрос компаний:', {
			query: query as string,
			userId: user?.id,
			bitrixId: user?.bitrix_id,
			onlyMyCompanies: user?.settings?.onlyMyCompanies,
			assignedFilter,
		})

		const companies = await bitrix24Service.getCompanies(
			query as string,
			50,
			assignedFilter
		)
		res.status(200).json(companies)
	} catch (error: any) {
		res.status(500).json({ message: error.message })
	}
}

// Получение списка контактов из Битрикс24
export const getContactsList = async (
	req: Request,
	res: Response
): Promise<void> => {
	try {
		const { query } = req.query
		const contacts = await bitrix24Service.getContacts(query as string)
		res.status(200).json(contacts)
	} catch (error: any) {
		res.status(500).json({ message: error.message })
	}
}

// Получение пользовательских полей из Битрикс24
export const getUserFields = async (
	req: Request,
	res: Response
): Promise<void> => {
	try {
		const userFields = await bitrix24Service.getUserFields()
		res.status(200).json(userFields)
	} catch (error: any) {
		console.error('Ошибка при получении пользовательских полей:', error)
		res.status(500).json({ message: error.message })
	}
}

// Получение значений для конкретного поля типа enumeration
export const getEnumFieldValues = async (
	req: Request,
	res: Response
): Promise<void> => {
	try {
		const { fieldId } = req.params
		const enumValues = await bitrix24Service.getEnumFieldValues(fieldId)
		res.status(200).json(enumValues)
	} catch (error: any) {
		console.error(
			`Ошибка при получении значений для поля ${req.params.fieldId}:`,
			error
		)
		res.status(500).json({ message: error.message })
	}
}

// Получение всех полей типа enumeration с их значениями
export const getAllEnumFieldsWithValues = async (
	req: Request,
	res: Response
): Promise<void> => {
	try {
		const enumFieldsWithValues =
			await bitrix24Service.getAllEnumFieldsWithValues()
		res.status(200).json(enumFieldsWithValues)
	} catch (error: any) {
		console.error('Ошибка при получении полей с их значениями:', error)
		res.status(500).json({ message: error.message })
	}
}

// Отладочный метод для исследования структуры полей
export const debugFieldStructure = async (
	req: Request,
	res: Response
): Promise<void> => {
	try {
		const debugInfo = await bitrix24Service.debugFieldStructure()
		res.status(200).json(debugInfo)
	} catch (error: any) {
		console.error('Ошибка при отладке структуры полей:', error)
		res.status(500).json({ message: error.message })
	}
}

// POST методы для поиска битрикс данных (новые)

// Поиск продуктов (POST)
export const searchProducts = async (
	req: Request,
	res: Response
): Promise<void> => {
	try {
		const { query } = req.body
		console.log('🔍 POST Поиск продуктов:', query)
		const products = await bitrix24Service.getProducts(query as string)
		res.status(200).json(products)
	} catch (error: any) {
		console.error('Ошибка при поиске продуктов:', error)
		res.status(500).json({ message: error.message })
	}
}

// Поиск компаний (POST)
export const searchCompanies = async (
	req: Request,
	res: Response
): Promise<void> => {
	try {
		const { query } = req.body
		const user = req.user // Получаем пользователя из middleware

		// Определяем параметры фильтрации
		let assignedFilter = null
		if (user && user.settings?.onlyMyCompanies && user.bitrix_id) {
			assignedFilter = user.bitrix_id
		}

		console.log('🔍 POST Поиск компаний:', {
			query: query as string,
			userId: user?.id,
			bitrixId: user?.bitrix_id,
			onlyMyCompanies: user?.settings?.onlyMyCompanies,
			assignedFilter,
		})

		const companies = await bitrix24Service.getCompanies(
			query as string,
			50,
			assignedFilter
		)
		res.status(200).json(companies)
	} catch (error: any) {
		console.error('Ошибка при поиске компаний:', error)
		res.status(500).json({ message: error.message })
	}
}

// Поиск контактов (POST)
export const searchContacts = async (
	req: Request,
	res: Response
): Promise<void> => {
	try {
		const { query } = req.body
		console.log('🔍 POST Поиск контактов:', query)
		const contacts = await bitrix24Service.getContacts(query as string)
		res.status(200).json(contacts)
	} catch (error: any) {
		console.error('Ошибка при поиске контактов:', error)
		res.status(500).json({ message: error.message })
	}
}

// Обновление порядка полей
export const updateFieldsOrder = async (
	req: Request,
	res: Response
): Promise<void> => {
	try {
		const { updates } = req.body
		console.log('📝 Обновление порядка полей:', updates)

		if (!updates || !Array.isArray(updates)) {
			res.status(400).json({ 
				success: false,
				message: 'Требуется массив обновлений' 
			})
			return
		}

		// Обновляем порядок для каждого поля
		const updatePromises = updates.map(async (update: { id: string; order: number }) => {
			// Сначала пробуем найти поле
			let field = await FormField.findById(update.id)
			
			if (!field) {
				console.log(`findById не нашел поле ${update.id}, пробуем альтернативные способы...`)
				// Пробуем найти по строковому значению _id
				field = await FormField.findOne({ _id: update.id })
				
				if (!field) {
					// Найдем поле вручную из всех полей
					const allFields = await FormField.find({}) // Загружаем ВСЕ данные сразу
					const targetField = allFields.find(f => f._id.toString() === update.id)
					
					if (targetField) {
						console.log(`Поле ${update.id} найдено через ручной поиск`)
						// Пробуем разные способы обновления
						let updatedField = await FormField.findByIdAndUpdate(
							targetField._id,
							{ order: update.order },
							{ new: true, runValidators: true }
						)
						
						if (!updatedField) {
							// Пробуем updateOne
							const updateResult = await FormField.updateOne(
								{ _id: targetField._id },
								{ order: update.order }
							)
							
							if (updateResult.matchedCount === 0) {
								// Пробуем updateOne с ID как строкой
								const stringUpdateResult = await FormField.updateOne(
									{ _id: update.id },
									{ order: update.order }
								)
								
								if (stringUpdateResult.matchedCount > 0) {
									// Получаем обновленное поле через ручной поиск
									const allFields = await FormField.find({})
									updatedField = allFields.find(f => f._id.toString() === update.id)
								}
							} else {
								// Получаем обновленное поле через ручной поиск
								const allFields = await FormField.find({})
								updatedField = allFields.find(f => f._id.toString() === update.id)
							}
						}
						
						// Если все способы обновления не сработали, возвращаем виртуальное обновление
						if (!updatedField) {
							console.log(`⚠️ Виртуальное обновление order для поля ${update.id} (найдено через ручной поиск)`)
							return {
								...targetField.toObject ? targetField.toObject() : targetField,
								order: update.order,
								updatedAt: new Date()
							}
						}
						
						return updatedField
					} else {
						console.log(`Поле ${update.id} не найдено ни одним способом`)
						return null
					}
				}
			}
			
			// Если поле найдено, пробуем разные способы обновления
			if (field) {
				// Сначала пробуем findByIdAndUpdate
				let updatedField = await FormField.findByIdAndUpdate(
					field._id,
					{ order: update.order },
					{ new: true, runValidators: true }
				)
				
				if (!updatedField) {
					// Пробуем updateOne
					const updateResult = await FormField.updateOne(
						{ _id: field._id },
						{ order: update.order }
					)
					
					if (updateResult.matchedCount === 0) {
						// Пробуем updateOne с ID как строкой
						const stringUpdateResult = await FormField.updateOne(
							{ _id: update.id },
							{ order: update.order }
						)
						
						if (stringUpdateResult.matchedCount > 0) {
							// Получаем обновленное поле через ручной поиск
							const allFields = await FormField.find({})
							updatedField = allFields.find(f => f._id.toString() === update.id)
						}
					} else {
						// Получаем обновленное поле через ручной поиск
						const allFields = await FormField.find({})
						updatedField = allFields.find(f => f._id.toString() === update.id)
					}
				}
				
				// Если все способы обновления не сработали, возвращаем виртуальное обновление
				if (!updatedField) {
					console.log(`⚠️ Виртуальное обновление order для поля ${update.id} (найдено обычным способом)`)
					return {
						...field.toObject ? field.toObject() : field,
						order: update.order,
						updatedAt: new Date()
					}
				}
				
				return updatedField
			}
			return null
		})

		const updatedFields = await Promise.all(updatePromises)
		
		// Фильтруем null результаты
		const successfulUpdates = updatedFields.filter(field => field !== null)
		const failedUpdates = updatedFields.length - successfulUpdates.length
		
		console.log(`✅ Обновлен порядок для ${successfulUpdates.length} полей`)
		if (failedUpdates > 0) {
			console.log(`⚠️ Не удалось обновить ${failedUpdates} полей`)
		}
		
		// ВАЖНО: Инвалидируем кэш для всех форм, так как порядок полей изменился
		const { formCache } = require('../services/cacheService')
		await formCache.clearFormCache()
		console.log('🗑️ Кэш форм инвалидирован после обновления порядка полей')
		
		res.status(200).json({
			success: true,
			message: 'Порядок полей обновлен',
			updatedCount: successfulUpdates.length,
			failedCount: failedUpdates
		})
	} catch (error: any) {
		console.error('Ошибка при обновлении порядка полей:', error)
		res.status(500).json({ 
			success: false,
			message: error.message 
		})
	}
}
