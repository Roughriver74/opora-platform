import { Request, Response } from 'express'
import Form from '../models/Form'
import FormField, { IFormField } from '../models/FormField'
import Submission from '../models/Submission'
import SubmissionHistory from '../models/SubmissionHistory'
import User from '../models/User'
import bitrix24Service from '../services/bitrix24Service'

// Обработка отправки формы заявки - НОВАЯ ЛОГИКА
export const submitForm = async (req: Request, res: Response) => {
	try {
		const { formId, formData } = req.body

		if (!formId || !formData) {
			return res.status(400).json({
				message: 'Необходимо указать ID формы и данные формы',
			})
		}

		// Проверяем валидность ObjectId
		const mongoose = require('mongoose')
		if (!mongoose.Types.ObjectId.isValid(formId)) {
			return res.status(400).json({
				message: 'Некорректный ID формы',
			})
		}

		console.log('[SUBMIT NEW] Начало обработки заявки')
		console.log('[SUBMIT NEW] Form ID:', formId)
		console.log('[SUBMIT NEW] Form Data:', Object.keys(formData))

		// Получаем форму с полями для маппинга
		const form = await Form.findById(formId).populate('fields')
		if (!form) {
			return res.status(404).json({ message: 'Форма не найдена' })
		}

		// Проверяем, активна ли форма
		if (!form.isActive) {
			return res.status(400).json({ message: 'Форма не активна' })
		}

		console.log('[SUBMIT NEW] Форма найдена:', form.name)
		console.log('[SUBMIT NEW] Полей в форме:', form.fields.length)

		// Подготавливаем данные для создания сделки в Битрикс24
		const dealData: Record<string, any> = {}

		// Динамически определяем TITLE из поля формы
		let dealTitle = `Заявка ${Date.now()}` // fallback

		// Проходим по всем полям формы и заполняем данные для сделки
		for (const field of form.fields as unknown as IFormField[]) {
			// Проверяем, есть ли значение для этого поля
			if (formData[field.name] !== undefined && field.bitrixFieldId) {
				const value = formData[field.name]
				dealData[field.bitrixFieldId] = value

				// Если это поле маппится на TITLE, используем его как название
				if (field.bitrixFieldId === 'TITLE' && value) {
					dealTitle = value
				}

				console.log(
					`[SUBMIT NEW] Поле ${field.name} -> ${field.bitrixFieldId}: "${value}"`
				)
			} else if (field.required) {
				// Если поле обязательное, но значение не предоставлено
				return res.status(400).json({
					message: `Поле "${field.label}" обязательно для заполнения`,
				})
			}
		}

		// Устанавливаем название сделки
		dealData['TITLE'] = dealTitle

		// Устанавливаем начальный статус
		dealData['STAGE_ID'] = 'C1:NEW'

		// Если пользователь авторизован, добавляем информацию о нем
		if (req.user?.id) {
			const user = await User.findById(req.user.id)
			if (user && user.bitrix_id) {
				dealData['ASSIGNED_BY_ID'] = user.bitrix_id
				console.log(`[SUBMIT NEW] Ответственный: ${user.bitrix_id}`)
			}
		}

		// Устанавливаем категорию сделки (по умолчанию 1, если не указана)
		const categoryId = form.bitrixDealCategory || '1'
		dealData['CATEGORY_ID'] = categoryId
		console.log(`[SUBMIT NEW] Категория: ${categoryId}`)

		console.log('[SUBMIT NEW] Данные для Битрикс24:', dealData)

		let submission: any = null

		try {
			// СНАЧАЛА создаем заявку в БД для получения ID
			console.log('[SUBMIT NEW] Создание заявки в БД...')
			submission = new Submission({
				formId: formId,
				userId: req.user?.id || null,
				title: dealTitle,
				status: 'C1:NEW',
				priority: 'medium',
				// bitrixDealId не указываем - заполним после создания сделки
				bitrixCategoryId: categoryId,
				bitrixSyncStatus: 'pending',
			})

			await submission.save()

			console.log(
				`[SUBMIT NEW] Заявка сохранена в БД: ${submission.submissionNumber}, ID: ${submission._id}`
			)

			// Добавляем ID заявки в поле UF_CRM_1750107484181
			dealData['UF_CRM_1750107484181'] = submission._id.toString()
			console.log(
				`[SUBMIT NEW] ✅ Добавлен ID заявки в поле UF_CRM_1750107484181:`
			)
			console.log(`[SUBMIT NEW] - FormID: ${formId}`)
			console.log(`[SUBMIT NEW] - Submission ID: ${submission._id}`)
			console.log(
				`[SUBMIT NEW] - Submission Number: ${submission.submissionNumber}`
			)
			console.log(
				`[SUBMIT NEW] - Значение в UF_CRM_1750107484181: ${dealData['UF_CRM_1750107484181']}`
			)

			// ТЕПЕРЬ создаем сделку в Битрикс24 с ID заявки
			console.log('[SUBMIT NEW] Создание сделки в Битрикс24...')
			console.log('[SUBMIT NEW] 📋 Все данные для Битрикс24:')
			console.log(JSON.stringify(dealData, null, 2))
			const dealResponse = await bitrix24Service.createDeal(dealData)

			console.log(
				'[SUBMIT NEW] Сделка создана в Битрикс24:',
				dealResponse.result
			)

			// Обновляем заявку с полученным bitrixDealId
			submission.bitrixDealId = dealResponse.result.toString()
			submission.bitrixSyncStatus = 'synced'
			await submission.save()

			console.log(
				`[SUBMIT NEW] Заявка обновлена с bitrixDealId: ${submission.bitrixDealId}`
			)

			// Добавляем запись в историю
			await new SubmissionHistory({
				submissionId: submission._id,
				action: 'created',
				changeType: 'data_update',
				description: 'Заявка создана в Битрикс24',
				newValue: { bitrixDealId: dealResponse.result, title: dealTitle },
				changedBy: req.user?.id || null,
			}).save()

			// Возвращаем успешный ответ
			res.status(200).json({
				success: true,
				message:
					form.successMessage || 'Спасибо! Ваша заявка успешно отправлена.',
				submissionId: submission._id,
				submissionNumber: submission.submissionNumber,
				dealId: submission.bitrixDealId,
			})
		} catch (bitrixError: any) {
			console.error(
				'[SUBMIT NEW] КРИТИЧЕСКАЯ ОШИБКА - не удалось создать сделку в Битрикс24:',
				bitrixError
			)

			// Удаляем созданную заявку из БД, если не удалось создать сделку в Битрикс24
			if (submission && submission._id) {
				try {
					await Submission.findByIdAndDelete(submission._id)
					console.log(
						`[SUBMIT NEW] Заявка ${submission._id} удалена из БД после ошибки Битрикс24`
					)
				} catch (deleteError) {
					console.error(
						`[SUBMIT NEW] Ошибка удаления заявки ${submission._id}:`,
						deleteError
					)
				}
			}

			return res.status(500).json({
				message: 'Ошибка создания заявки в системе',
				error: bitrixError.message,
			})
		}
	} catch (error: any) {
		console.error('[SUBMIT NEW] Общая ошибка при отправке формы:', error)
		res.status(500).json({
			message: 'Произошла ошибка при обработке заявки',
			error: error.message,
		})
	}
}

// Получение всех заявок (для админов)
export const getAllSubmissions = async (req: Request, res: Response) => {
	try {
		const {
			page = 1,
			limit = 20,
			status,
			priority,
			assignedTo,
			userId,
			dateFrom,
			dateTo,
			search,
			tags,
		} = req.query

		// Строим фильтр
		const filter: any = {}

		if (status) filter.status = status
		if (priority) filter.priority = priority
		if (assignedTo) filter.assignedTo = assignedTo
		if (userId) filter.userId = userId
		if (tags && Array.isArray(tags)) filter.tags = { $in: tags }

		// Фильтр по дате
		if (dateFrom || dateTo) {
			filter.createdAt = {}
			if (dateFrom) filter.createdAt.$gte = new Date(dateFrom as string)
			if (dateTo) filter.createdAt.$lte = new Date(dateTo as string)
		}

		// Поиск по номеру заявки или названию
		if (search) {
			filter.$or = [
				{ submissionNumber: { $regex: search, $options: 'i' } },
				{ title: { $regex: search, $options: 'i' } },
			]
		}

		const skip = (Number(page) - 1) * Number(limit)

		const submissions = await Submission.find(filter)
			.populate('formId', 'name title')
			.populate('userId', 'firstName lastName email')
			.populate('assignedTo', 'firstName lastName email')
			.sort({ createdAt: -1 })
			.skip(skip)
			.limit(Number(limit))

		const total = await Submission.countDocuments(filter)

		res.json({
			success: true,
			data: submissions,
			pagination: {
				page: Number(page),
				limit: Number(limit),
				total,
				pages: Math.ceil(total / Number(limit)),
			},
		})
	} catch (error: any) {
		console.error('Ошибка получения заявок:', error)
		res.status(500).json({
			success: false,
			message: 'Ошибка получения заявок',
		})
	}
}

// Получение заявок текущего пользователя
export const getMySubmissions = async (req: Request, res: Response) => {
	try {
		const { page = 1, limit = 20 } = req.query
		const userId = req.user?.id

		if (!userId) {
			return res.status(401).json({
				success: false,
				message: 'Пользователь не авторизован',
			})
		}

		const skip = (Number(page) - 1) * Number(limit)

		const submissions = await Submission.find({ userId })
			.populate('formId', 'name title')
			.populate('assignedTo', 'firstName lastName email')
			.sort({ createdAt: -1 })
			.skip(skip)
			.limit(Number(limit))

		const total = await Submission.countDocuments({ userId })

		res.json({
			success: true,
			data: submissions,
			pagination: {
				page: Number(page),
				limit: Number(limit),
				total,
				pages: Math.ceil(total / Number(limit)),
			},
		})
	} catch (error: any) {
		console.error('Ошибка получения заявок пользователя:', error)
		res.status(500).json({
			success: false,
			message: 'Ошибка получения заявок',
		})
	}
}

// Получение заявки по ID
export const getSubmissionById = async (req: Request, res: Response) => {
	try {
		const { id } = req.params
		const userId = req.user?.id
		const isAdmin = req.isAdmin

		const submission = await Submission.findById(id)
			.populate('formId', 'name title')
			.populate('userId', 'firstName lastName email')
			.populate('assignedTo', 'firstName lastName email')

		if (!submission) {
			return res.status(404).json({
				success: false,
				message: 'Заявка не найдена',
			})
		}

		// Проверяем права доступа
		if (!isAdmin && submission.userId?.toString() !== userId) {
			return res.status(403).json({
				success: false,
				message: 'Нет прав для просмотра этой заявки',
			})
		}

		// Получаем историю изменений
		const history = await SubmissionHistory.find({ submissionId: id })
			.populate('changedBy', 'firstName lastName email')
			.sort({ createdAt: -1 })

		res.json({
			success: true,
			data: {
				submission,
				history,
			},
		})
	} catch (error: any) {
		console.error('Ошибка получения заявки:', error)
		res.status(500).json({
			success: false,
			message: 'Ошибка получения заявки',
		})
	}
}

// Обновление статуса заявки
export const updateSubmissionStatus = async (req: Request, res: Response) => {
	try {
		const { id } = req.params
		const { status, comment } = req.body
		const userId = req.user?.id

		const submission = await Submission.findById(id)
		if (!submission) {
			return res.status(404).json({
				success: false,
				message: 'Заявка не найдена',
			})
		}

		const oldStatus = submission.status
		submission.status = status
		await submission.save()

		// Добавляем запись в историю
		await new SubmissionHistory({
			submissionId: id,
			action: 'status_changed',
			changeType: 'status_change',
			description: `Статус изменен с "${oldStatus}" на "${status}"`,
			oldValue: oldStatus,
			newValue: status,
			comment,
			changedBy: userId,
		}).save()

		// Синхронизируем с Битрикс24 если есть dealId
		if (submission.bitrixDealId) {
			try {
				await bitrix24Service.updateDealStatus(
					submission.bitrixDealId,
					status,
					submission.bitrixCategoryId
				)
				submission.bitrixSyncStatus = 'synced'
				await submission.save()
			} catch (bitrixError: any) {
				console.error('Ошибка синхронизации статуса с Битрикс24:', bitrixError)
				submission.bitrixSyncStatus = 'failed'
				submission.bitrixSyncError = bitrixError.message
				await submission.save()
			}
		}

		res.json({
			success: true,
			message: 'Статус заявки обновлен',
		})
	} catch (error: any) {
		console.error('Ошибка обновления статуса:', error)
		res.status(500).json({
			success: false,
			message: 'Ошибка обновления статуса',
		})
	}
}

// Получение заявки с актуальными данными из Битрикс24 для редактирования - НОВАЯ ЛОГИКА
export const getSubmissionWithBitrixData = async (
	req: Request,
	res: Response
) => {
	try {
		const { id } = req.params
		const userId = req.user?.id

		console.log(`[EDIT NEW] Получение заявки ${id} для редактирования`)
		console.log(`[EDIT NEW] Пользователь: ${userId}, админ: ${req.isAdmin}`)

		const submission = await Submission.findById(id)
			.populate('userId', 'name firstName lastName email bitrixId')
			.populate('formId')

		if (!submission) {
			console.log(`[EDIT NEW] Заявка ${id} не найдена`)
			return res.status(404).json({
				success: false,
				message: 'Заявка не найдена',
			})
		}

		console.log(`[EDIT NEW] Заявка найдена:`)
		console.log(`[EDIT NEW] - Номер: ${submission.submissionNumber}`)
		console.log(`[EDIT NEW] - Название: ${submission.title}`)
		console.log(`[EDIT NEW] - Битрикс Deal ID: ${submission.bitrixDealId}`)
		console.log(
			`[EDIT NEW] - Статус синхронизации: ${submission.bitrixSyncStatus}`
		)

		// Проверяем права доступа
		const isAdmin = req.isAdmin

		console.log(`[EDIT NEW] Проверка прав доступа:`)
		console.log(`[EDIT NEW] - isAdmin: ${isAdmin}`)
		console.log(`[EDIT NEW] - userId из токена: ${userId}`)
		console.log(`[EDIT NEW] - submission.userId: ${submission.userId}`)
		console.log(`[EDIT NEW] - submission.userId._id: ${submission.userId?._id}`)
		console.log(
			`[EDIT NEW] - submission.userId._id.toString(): ${submission.userId?._id?.toString()}`
		)

		// Исправляем проверку: сравниваем _id из populate объекта
		const submissionUserId =
			submission.userId?._id?.toString() || submission.userId?.toString()
		console.log(
			`[EDIT NEW] - Сравнение: ${submissionUserId} === ${userId} -> ${
				submissionUserId === userId
			}`
		)

		if (!isAdmin && submissionUserId !== userId) {
			console.log(
				`[EDIT NEW] ❌ ДОСТУП ЗАПРЕЩЕН: Пользователь ${userId} пытается получить заявку пользователя ${submissionUserId}`
			)
			return res.status(403).json({
				success: false,
				message: 'Нет прав для просмотра этой заявки',
			})
		}

		console.log(
			`[EDIT NEW] ✅ ДОСТУП РАЗРЕШЕН: Пользователь имеет права для просмотра заявки`
		)

		// Получаем актуальные данные из Битрикс24
		let formDataFromBitrix = {}
		let preloadedOptions: Record<string, any[]> = {}

		try {
			console.log(
				`[EDIT NEW] Получение актуальных данных сделки ${submission.bitrixDealId}`
			)

			// Получаем данные сделки из Битрикс24
			const dealResponse = await bitrix24Service.getDeal(
				submission.bitrixDealId
			)

			console.log(`[EDIT NEW] Ответ от Битрикс24:`, dealResponse)

			if (dealResponse?.result) {
				const dealData = dealResponse.result
				console.log(
					`[EDIT NEW] Данные сделки из Битрикс24:`,
					Object.keys(dealData)
				)

				// Получаем форму для правильного маппинга полей
				const form = await Form.findById(submission.formId).populate('fields')
				if (form) {
					console.log(`[EDIT NEW] Форма найдена, полей: ${form.fields.length}`)

					// Отладка полей формы
					console.log('[EDIT NEW] Поля формы с bitrixFieldId:')
					console.log(
						'[EDIT NEW] RAW form.fields:',
						JSON.stringify(form.fields, null, 2)
					)
					form.fields.forEach((field: any, index: number) => {
						console.log(`[EDIT NEW] Поле ${index}:`, field)
						console.log(
							`[EDIT NEW] Поле ${index}: name="${field.name}", bitrixFieldId="${field.bitrixFieldId}"`
						)
					})

					// Собираем предзагруженные опции для автокомплита

					// Конвертируем данные из Битрикс24 обратно в формат формы
					for (const field of form.fields as unknown as IFormField[]) {
						console.log(
							`[EDIT NEW] Проверяем поле: ${field.name}, bitrixFieldId: ${field.bitrixFieldId}`
						)

						if (
							field.bitrixFieldId &&
							dealData[field.bitrixFieldId] !== undefined
						) {
							let bitrixValue = dealData[field.bitrixFieldId]

							// Для полей автокомплита с товарами - загружаем название товара
							if (
								field.type === 'autocomplete' &&
								field.dynamicSource?.enabled &&
								field.dynamicSource.source === 'catalog' &&
								bitrixValue
							) {
								try {
									console.log(
										`[EDIT NEW] 🔍 Загрузка названия товара для ID: ${bitrixValue}`
									)
									const productResponse = await bitrix24Service.getProduct(
										bitrixValue
									)
									if (productResponse?.result) {
										const productName = productResponse.result.NAME
										console.log(
											`[EDIT NEW] 📦 Товар ${bitrixValue}: "${productName}"`
										)

										// Добавляем в предзагруженные опции
										preloadedOptions[field.name] = [
											{
												value: bitrixValue,
												label: productName,
											},
										]
									}
								} catch (productError) {
									console.error(
										`[EDIT NEW] ❌ Ошибка загрузки товара ${bitrixValue}:`,
										productError
									)
									// Оставляем ID если не удалось загрузить название
								}
							}

							// Для полей автокомплита с компаниями - загружаем название компании
							if (
								field.type === 'autocomplete' &&
								field.dynamicSource?.enabled &&
								field.dynamicSource.source === 'companies' &&
								bitrixValue &&
								bitrixValue !== '0' // Пропускаем пустые компании
							) {
								try {
									console.log(
										`[EDIT NEW] 🔍 Загрузка названия компании для ID: ${bitrixValue}`
									)
									const companyResponse = await bitrix24Service.getCompany(
										bitrixValue
									)
									if (companyResponse?.result) {
										const companyName = companyResponse.result.TITLE
										console.log(
											`[EDIT NEW] 🏢 Компания ${bitrixValue}: "${companyName}"`
										)

										// Добавляем в предзагруженные опции
										preloadedOptions[field.name] = [
											{
												value: bitrixValue,
												label: companyName,
											},
										]
									}
								} catch (companyError) {
									console.error(
										`[EDIT NEW] ❌ Ошибка загрузки компании ${bitrixValue}:`,
										companyError
									)
									// Оставляем ID если не удалось загрузить название
								}
							}

							formDataFromBitrix[field.name] = bitrixValue

							console.log(
								`[EDIT NEW] ✅ Маппинг ${field.bitrixFieldId} -> ${field.name}:`,
								bitrixValue
							)
						} else {
							console.log(
								`[EDIT NEW] ❌ Пропуск поля ${field.name}: bitrixFieldId=${
									field.bitrixFieldId
								}, значение в Bitrix=${dealData[field.bitrixFieldId]}`
							)
						}
					}

					console.log(
						'[EDIT NEW] FormData восстановлен из Битрикс24:',
						Object.keys(formDataFromBitrix)
					)
					console.log(
						'[EDIT NEW] Предзагруженные опции:',
						JSON.stringify(preloadedOptions, null, 2)
					)
				} else {
					console.log('[EDIT NEW] Форма не найдена')
				}
			} else {
				console.log('[EDIT NEW] Пустой ответ от Битрикс24')
			}

			// Обновляем статус синхронизации
			submission.bitrixSyncStatus = 'synced'
			await submission.save()
		} catch (bitrixError: any) {
			console.error(
				'[EDIT NEW] Ошибка получения данных из Битрикс24:',
				bitrixError
			)
			// Не блокируем выдачу заявки, если есть ошибки с Битрикс24
			submission.bitrixSyncStatus = 'failed'
			submission.bitrixSyncError = bitrixError.message
			await submission.save()

			// В случае ошибки возвращаем пустую форму
			formDataFromBitrix = {}
		}

		// Возвращаем заявку с данными из Битрикс24
		const responseData = {
			_id: submission._id,
			submissionNumber: submission.submissionNumber,
			title: submission.title,
			status: submission.status,
			priority: submission.priority,
			bitrixDealId: submission.bitrixDealId,
			bitrixCategoryId: submission.bitrixCategoryId,
			bitrixSyncStatus: submission.bitrixSyncStatus,
			bitrixSyncError: submission.bitrixSyncError,
			formId: submission.formId,
			userId: submission.userId,
			createdAt: submission.createdAt,
			updatedAt: submission.updatedAt,
			formData: formDataFromBitrix, // Данные ВСЕГДА из Битрикс24
			preloadedOptions: preloadedOptions, // Предзагруженные опции для автокомплита
		}

		console.log(`[EDIT NEW] Возвращаем данные заявки`)

		res.json({
			success: true,
			data: responseData,
		})
	} catch (error: any) {
		console.error('[EDIT NEW] Ошибка получения заявки:', error)
		res.status(500).json({
			success: false,
			message: 'Ошибка получения заявки',
		})
	}
}

// Обновление заявки - НОВАЯ ЛОГИКА: сразу в Битрикс24
export const updateSubmission = async (req: Request, res: Response) => {
	try {
		const { id } = req.params
		const updateData = req.body // Это formData из клиента
		const userId = req.user?.id

		console.log(`[UPDATE NEW] Обновление заявки ${id}`)
		console.log(`[UPDATE NEW] Данные для обновления:`, Object.keys(updateData))

		const submission = await Submission.findById(id).populate('userId')
		if (!submission) {
			return res.status(404).json({
				success: false,
				message: 'Заявка не найдена',
			})
		}

		// Проверяем права доступа
		const isAdmin = req.isAdmin

		console.log(`[UPDATE NEW] Проверка прав доступа:`)
		console.log(`[UPDATE NEW] - isAdmin: ${isAdmin}`)
		console.log(`[UPDATE NEW] - userId из токена: ${userId}`)
		console.log(
			`[UPDATE NEW] - submission.userId._id: ${submission.userId?._id}`
		)

		// Исправляем проверку: сравниваем _id из populate объекта
		const submissionUserId =
			submission.userId?._id?.toString() || submission.userId?.toString()
		console.log(
			`[UPDATE NEW] - Сравнение: ${submissionUserId} === ${userId} -> ${
				submissionUserId === userId
			}`
		)

		if (!isAdmin && submissionUserId !== userId) {
			console.log(
				`[UPDATE NEW] ❌ ДОСТУП ЗАПРЕЩЕН: Пользователь ${userId} пытается обновить заявку пользователя ${submissionUserId}`
			)
			return res.status(403).json({
				success: false,
				message: 'Нет прав для редактирования этой заявки',
			})
		}

		console.log(
			`[UPDATE NEW] ✅ ДОСТУП РАЗРЕШЕН: Пользователь имеет права для обновления заявки`
		)

		console.log(`[UPDATE NEW] Заявка найдена: ${submission.submissionNumber}`)
		console.log(`[UPDATE NEW] Битрикс Deal ID: ${submission.bitrixDealId}`)

		try {
			console.log(
				`[UPDATE NEW] Обновление сделки ${submission.bitrixDealId} в Битрикс24`
			)

			// Получаем форму для правильного маппинга полей
			const form = await Form.findById(submission.formId).populate('fields')
			if (!form) {
				throw new Error('Форма не найдена')
			}

			console.log(`[UPDATE NEW] Форма найдена, полей: ${form.fields.length}`)

			// Формируем данные для обновления сделки
			const dealData: any = {}
			let newTitle = submission.title // fallback

			// Проходим по всем полям формы и маппим данные в поля Битрикс24
			for (const field of form.fields as unknown as IFormField[]) {
				// Проверяем, есть ли значение для этого поля в updateData
				if (updateData[field.name] !== undefined && field.bitrixFieldId) {
					const value = updateData[field.name]
					dealData[field.bitrixFieldId] = value

					// Если это поле маппится на TITLE, обновляем название
					if (field.bitrixFieldId === 'TITLE' && value) {
						newTitle = value
					}

					console.log(
						`[UPDATE NEW] Поле ${field.name} -> ${field.bitrixFieldId}: "${value}"`
					)
				}
			}

			console.log('[UPDATE NEW] Данные для обновления в Битрикс24:', dealData)

			// Обновляем сделку в Битрикс24
			await bitrix24Service.updateDeal(submission.bitrixDealId, dealData)

			// Обновляем только название в БД для быстрого доступа
			submission.title = newTitle
			submission.bitrixSyncStatus = 'synced'
			submission.bitrixSyncError = undefined
			await submission.save()

			console.log(
				`[UPDATE NEW] Сделка ${submission.bitrixDealId} успешно обновлена`
			)

			// Добавляем запись в историю
			await new SubmissionHistory({
				submissionId: id,
				action: 'updated',
				changeType: 'data_update',
				description: 'Заявка обновлена в Битрикс24',
				newValue: { title: newTitle, updatedFields: Object.keys(dealData) },
				changedBy: userId,
			}).save()

			res.json({
				success: true,
				data: {
					_id: submission._id,
					submissionNumber: submission.submissionNumber,
					title: newTitle,
					bitrixDealId: submission.bitrixDealId,
					bitrixSyncStatus: 'synced',
				},
				message: 'Заявка успешно обновлена',
			})
		} catch (bitrixError: any) {
			console.error(
				'[UPDATE NEW] Ошибка обновления сделки в Битрикс24:',
				bitrixError
			)

			submission.bitrixSyncStatus = 'failed'
			submission.bitrixSyncError = bitrixError.message
			await submission.save()

			res.status(500).json({
				success: false,
				message: 'Ошибка обновления заявки в Битрикс24',
				error: bitrixError.message,
			})
		}
	} catch (error: any) {
		console.error('[UPDATE NEW] Ошибка обновления заявки:', error)
		res.status(500).json({
			success: false,
			message: 'Ошибка обновления заявки',
		})
	}
}

// Удаление заявки
export const deleteSubmission = async (req: Request, res: Response) => {
	try {
		const { id } = req.params

		const submission = await Submission.findById(id)
		if (!submission) {
			return res.status(404).json({
				success: false,
				message: 'Заявка не найдена',
			})
		}

		await Submission.findByIdAndDelete(id)
		await SubmissionHistory.deleteMany({ submissionId: id })

		res.json({
			success: true,
			message: 'Заявка удалена',
		})
	} catch (error: any) {
		console.error('Ошибка удаления заявки:', error)
		res.status(500).json({
			success: false,
			message: 'Ошибка удаления заявки',
		})
	}
}

// Получение статусов из Битрикс24
export const getBitrixStages = async (req: Request, res: Response) => {
	try {
		const { categoryId } = req.params

		// Возвращаем только нужные статусы
		const allowedStages = [
			{
				id: 'C1:NEW',
				name: 'Новая',
				sort: 10,
			},
			{
				id: 'C1:UC_GJLIZP',
				name: 'Отправлено',
				sort: 20,
			},
			{
				id: 'C1:WON',
				name: 'Отгружено',
				sort: 30,
			},
		]

		res.json({
			success: true,
			data: allowedStages,
		})
	} catch (error: any) {
		console.error('Ошибка получения статусов:', error)
		res.status(500).json({
			success: false,
			message: 'Ошибка получения статусов',
		})
	}
}

// Обновление статуса заявки по Битрикс ID (публичный API)
export const updateStatusByBitrixId = async (req: Request, res: Response) => {
	try {
		const { bitrixid, status } = req.query

		// Валидация параметров
		if (!bitrixid || !status) {
			return res.status(400).json({
				success: false,
				message: 'Параметры bitrixid и status обязательны',
				example:
					'/api/submissions/update-status?bitrixid=123&status=C1:EXECUTING',
			})
		}

		console.log(`[API UPDATE STATUS] Поиск заявки с bitrixDealId: ${bitrixid}`)

		// Ищем заявку по bitrixDealId
		const submission = await Submission.findOne({ bitrixDealId: bitrixid })
		if (!submission) {
			return res.status(404).json({
				success: false,
				message: `Заявка с bitrixDealId ${bitrixid} не найдена`,
			})
		}

		console.log(
			`[API UPDATE STATUS] Заявка найдена: ${submission.submissionNumber}`
		)
		console.log(`[API UPDATE STATUS] Старый статус: ${submission.status}`)
		console.log(`[API UPDATE STATUS] Новый статус: ${status}`)

		const oldStatus = submission.status
		submission.status = status as string
		await submission.save()

		console.log(`[API UPDATE STATUS] Статус успешно обновлен в БД`)

		// Добавляем запись в историю (от системы)
		await new SubmissionHistory({
			submissionId: submission._id,
			action: 'status_changed',
			changeType: 'status_change',
			description: `Статус изменен автоматически с "${oldStatus}" на "${status}" через API`,
			oldValue: oldStatus,
			newValue: status,
			comment: 'Автоматическое обновление через внешний API',
			changedBy: null, // null означает системное изменение
		}).save()

		console.log(`[API UPDATE STATUS] Запись в историю добавлена`)

		res.json({
			success: true,
			message: 'Статус заявки обновлен успешно',
			data: {
				submissionNumber: submission.submissionNumber,
				bitrixDealId: submission.bitrixDealId,
				oldStatus,
				newStatus: status,
				updatedAt: new Date(),
			},
		})

		console.log(`[API UPDATE STATUS] Ответ отправлен`)
	} catch (error: any) {
		console.error('[API UPDATE STATUS] Ошибка:', error)
		res.status(500).json({
			success: false,
			message: 'Внутренняя ошибка сервера',
			error: error.message,
		})
	}
}

// Проверка поля UF_CRM_1750107484181 в Битрикс24 (для отладки)
export const checkBitrixField = async (req: Request, res: Response) => {
	try {
		const { dealId } = req.params

		if (!dealId) {
			return res.status(400).json({
				success: false,
				message: 'Параметр dealId обязателен',
			})
		}

		console.log(
			`[CHECK FIELD] Проверка поля UF_CRM_1750107484181 для сделки ${dealId}`
		)

		// Получаем данные сделки из Битрикс24
		const dealData = await bitrix24Service.getDeal(dealId)

		if (!dealData?.result) {
			return res.status(404).json({
				success: false,
				message: `Сделка с ID ${dealId} не найдена в Битрикс24`,
			})
		}

		const fieldValue = dealData.result.UF_CRM_1750107484181

		console.log(
			`[CHECK FIELD] Значение поля UF_CRM_1750107484181: ${fieldValue}`
		)

		res.json({
			success: true,
			data: {
				dealId: dealId,
				fieldValue: fieldValue,
				allFields: dealData.result,
			},
		})
	} catch (error: any) {
		console.error('[CHECK FIELD] Ошибка:', error)
		res.status(500).json({
			success: false,
			message: 'Ошибка получения данных из Битрикс24',
			error: error.message,
		})
	}
}

// Копирование заявки
export const copySubmission = async (req: Request, res: Response) => {
	try {
		const { id } = req.params
		const userId = req.user?.id

		console.log(`[COPY] Копирование заявки ${id} пользователем ${userId}`)

		// Проверяем валидность ObjectId
		const mongoose = require('mongoose')
		if (!mongoose.Types.ObjectId.isValid(id)) {
			return res.status(400).json({
				success: false,
				message: 'Некорректный ID заявки',
			})
		}

		// Получаем оригинальную заявку
		const originalSubmission = await Submission.findById(id)
			.populate('formId')
			.populate('userId')

		if (!originalSubmission) {
			return res.status(404).json({
				success: false,
				message: 'Заявка не найдена',
			})
		}

		// Проверяем права доступа - пользователь может копировать только свои заявки или админ может копировать любые
		const user = await User.findById(userId)
		const isAdmin = user && user.role === 'admin'

		if (!isAdmin && originalSubmission.userId?.toString() !== userId) {
			return res.status(403).json({
				success: false,
				message: 'Нет прав для копирования этой заявки',
			})
		}

		console.log(`[COPY] Найдена заявка: ${originalSubmission.title}`)

		// Получаем данные формы с полями
		const form = await Form.findById(originalSubmission.formId).populate(
			'fields'
		)
		if (!form) {
			return res.status(404).json({
				success: false,
				message: 'Форма не найдена',
			})
		}

		// Получаем данные из Битрикс24 сделки для восстановления значений полей
		let formData: Record<string, any> = {}

		if (originalSubmission.bitrixDealId) {
			try {
				console.log(
					`[COPY] Получение данных из Битрикс24 сделки ${originalSubmission.bitrixDealId}`
				)
				const dealData = await bitrix24Service.getDeal(
					originalSubmission.bitrixDealId
				)

				// Мапим данные обратно в формат формы
				for (const field of form.fields as unknown as IFormField[]) {
					if (
						field.bitrixFieldId &&
						dealData[field.bitrixFieldId] !== undefined
					) {
						formData[field.name] = dealData[field.bitrixFieldId]
					}
				}

				console.log(
					`[COPY] Восстановлено ${
						Object.keys(formData).length
					} полей из Битрикс24`
				)
			} catch (bitrixError) {
				console.error(
					'[COPY] Ошибка получения данных из Битрикс24:',
					bitrixError
				)
				// Продолжаем с пустыми данными
			}
		}

		// Возвращаем данные для формы (без создания новой заявки)
		res.json({
			success: true,
			message: 'Данные заявки получены для копирования',
			data: {
				formId: originalSubmission.formId._id,
				formData: formData,
				originalTitle: originalSubmission.title,
				originalSubmissionNumber: originalSubmission.submissionNumber,
			},
		})
	} catch (error: any) {
		console.error('[COPY] Ошибка копирования заявки:', error)
		res.status(500).json({
			success: false,
			message: 'Ошибка копирования заявки',
			error: error.message,
		})
	}
}
