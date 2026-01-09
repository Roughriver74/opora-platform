import { Request, Response } from 'express'
import { getFormService } from '../services/FormService'
import { getSubmissionService } from '../services/SubmissionService'
import { getUserService } from '../services/UserService'
import bitrix24Service from '../services/bitrix24Service'
import { elasticsearchService } from '../services/elasticsearchService'
import {
	BitrixSyncStatus,
	SubmissionPriority,
} from '../database/entities/Submission.entity'

const formService = getFormService()
const submissionService = getSubmissionService()
const userService = getUserService()

// Обработка отправки формы заявки
export const submitForm = async (req: Request, res: Response) => {
	try {
		const { formId, formData } = req.body

		if (!formId || !formData) {
			return res.status(400).json({
				message: 'Необходимо указать ID формы и данные формы',
			})
		}

		const form = await formService.findWithFields(formId)
		if (!form) {
			return res.status(404).json({ message: 'Форма не найдена' })
		}

		if (!form.isActive) {
			return res.status(400).json({ message: 'Форма не активна' })
		}

		const validation = await formService.validateFormData(formId, formData)
		if (!validation.isValid) {
			return res.status(400).json({
				message: 'Ошибка валидации данных',
				errors: validation.errors,
			})
		}

		const dealData: Record<string, any> = {}
		let dealTitle = `Заявка ${Date.now()}`

		for (const field of form.fields) {
			if (formData[field.name] !== undefined && field.bitrixFieldId) {
				const value = formData[field.name]
				dealData[field.bitrixFieldId] = value
				if (field.bitrixFieldId === 'TITLE' && value) {
					dealTitle = value
				}
			}
		}

		dealData.TITLE = dealTitle
		dealData.STAGE_ID = 'C1:NEW'

		// Определяем пользователя для заявки
		let userId = req.user?.id || null
		let userName = null
		let userEmail = null

		if (req.user?.id) {
			const user = await userService.findById(req.user.id)
			if (user) {
				userId = user.id
				userName = user.fullName
				userEmail = user.email
				if (user.bitrixUserId) {
					dealData.ASSIGNED_BY_ID = user.bitrixUserId
				}
			}
		} else {
			// Если пользователь не авторизован, пытаемся извлечь данные из формы
			if (formData.email) {
				userEmail = formData.email
			}
			if (formData.firstName && formData.lastName) {
				userName = `${formData.firstName} ${formData.lastName}`
			} else if (formData.name) {
				userName = formData.name
			}
		}

		const categoryId = form.bitrixDealCategory || '1'
		dealData.CATEGORY_ID = categoryId

		let submission: any = null
		let dealResponse: any = null

		try {
			// ШАГ 1: Сначала создаем сделку в Bitrix24
			console.log('[SUBMIT_FORM] Шаг 1: Создание сделки в Bitrix24...')
			dealResponse = await bitrix24Service.createDeal(dealData)
			const bitrixDealId = dealResponse.result?.toString?.()
			console.log(
				`[SUBMIT_FORM] ✅ Сделка создана в Bitrix24, ID: ${bitrixDealId}`
			)

			// ШАГ 2: Только после успешного создания в Bitrix сохраняем в БД
			console.log('[SUBMIT_FORM] Шаг 2: Сохранение заявки в БД...')
			const submissionData = {
				formId: formId,
				userId: userId,
				title: dealTitle,
				notes: 'Заявка создана через форму',
				formData: formData,
				bitrixDealId: bitrixDealId,
				// Добавляем денормализованные данные пользователя
				userName: userName,
				userEmail: userEmail,
			}

			submission = await submissionService.createSubmission(submissionData)
			console.log(
				`[SUBMIT_FORM] ✅ Заявка сохранена в БД, ID: ${submission.id}, номер: ${submission.submissionNumber}`
			)

			// ШАГ 3: Обновляем Bitrix24 с ID заявки для обратной связи
			console.log('[SUBMIT_FORM] Шаг 3: Обновление Bitrix24 с ID заявки...')
			try {
				await bitrix24Service.updateDeal(bitrixDealId, {
					UF_CRM_1750107484181: submission.id,
				})
				console.log(
					`[SUBMIT_FORM] ✅ Bitrix24 обновлен с ID заявки: ${submission.id}`
				)
			} catch (updateError: any) {
				// Не критично, если не удалось обновить поле - заявка уже создана
				console.warn(
					`[SUBMIT_FORM] ⚠️ Не удалось обновить поле UF_CRM_1750107484181 в Bitrix24:`,
					updateError.message
				)
			}

			await submissionService.updateSyncStatus(
				submission.id,
				BitrixSyncStatus.SYNCED,
				bitrixDealId
			)

			// Автоматическая индексация заявки в Elasticsearch
			try {
				// Очищаем formData от пустых значений
				const cleanedFormData = submission.formData
					? Object.fromEntries(
							Object.entries(submission.formData).filter(
								([key, value]) =>
									value !== null && value !== undefined && value !== ''
							)
					  )
					: {}

				const submissionData = {
					id: `submission_${submission.id}`,
					name: submission.title || `Заявка #${submission.submissionNumber}`,
					description: submission.notes || '',
					type: 'submission' as const,
					status: submission.status,
					priority: submission.priority,
					tags: submission.tags || [],
					formData: cleanedFormData,
					submissionNumber: submission.submissionNumber,
					userName: submission.userName,
					userEmail: submission.userEmail,
					formName: form.name,
					formTitle: form.title,
					assignedToName: submission.assignedToName,
					createdAt: submission.createdAt.toISOString(),
					updatedAt: submission.updatedAt.toISOString(),
					searchableText: `${submission.title || ''} ${
						submission.notes || ''
					} ${submission.submissionNumber || ''} ${submission.userName || ''} ${
						form.name || ''
					}`.toLowerCase(),
				}

				await elasticsearchService.indexDocument(submissionData)
				console.log(
					`✅ Заявка ${submission.submissionNumber} автоматически проиндексирована в Elasticsearch`
				)
			} catch (indexError) {
				console.error(
					`❌ Ошибка при автоматической индексации заявки ${submission.submissionNumber}:`,
					indexError
				)
				// Не прерываем выполнение, если индексация не удалась
			}

			console.log(
				`[SUBMIT_FORM] ✅ Заявка успешно создана. ID: ${submission.id}, Bitrix Deal: ${dealResponse.result?.toString?.()}`
			)

			return res.status(200).json({
				success: true,
				message:
					form.successMessage || 'Спасибо! Ваша заявка успешно отправлена.',
				submissionId: submission.id,
				submissionNumber: submission.submissionNumber,
				dealId: dealResponse.result?.toString?.(),
			})
		} catch (error: any) {
			// Логируем детали ошибки
			console.error('[SUBMIT_FORM] ❌ Ошибка при создании заявки:', {
				stage: submission ? 'after_db_save' : 'before_db_save',
				bitrixDealCreated: !!dealResponse?.result,
				bitrixDealId: dealResponse?.result?.toString?.(),
				submissionCreated: !!submission?.id,
				submissionId: submission?.id,
				error: error.message,
				stack: error.stack,
			})

			// Если заявка была создана в БД, но произошла ошибка после - НЕ УДАЛЯЕМ
			// Это может быть ошибка индексации или обновления Bitrix, но данные уже сохранены
			if (submission?.id) {
				console.warn(
					`[SUBMIT_FORM] ⚠️ Заявка ${submission.id} создана в БД и Bitrix, но произошла ошибка на финальном этапе. Заявка сохранена.`
				)

				// Проверяем, есть ли у нас Bitrix Deal ID - если да, то основная синхронизация прошла успешно
				const hasBitrixDealId = !!dealResponse?.result

				// Некритичные ошибки (Elasticsearch, обновление дополнительных полей) - статус SYNCED
				// Критичные ошибки (нет Bitrix Deal ID) - статус FAILED
				try {
					await submissionService.updateSyncStatus(
						submission.id,
						hasBitrixDealId ? BitrixSyncStatus.SYNCED : BitrixSyncStatus.FAILED,
						dealResponse?.result?.toString?.(),
						hasBitrixDealId ? undefined : `Финальная ошибка: ${error.message}`
					)
					console.log(
						`[SUBMIT_FORM] ℹ️ Статус синхронизации: ${hasBitrixDealId ? 'SYNCED (есть Bitrix ID)' : 'FAILED (нет Bitrix ID)'}`
					)
				} catch {}

				// Возвращаем успех, т.к. основные данные сохранены
				return res.status(200).json({
					success: true,
					message:
						form.successMessage ||
						'Спасибо! Ваша заявка успешно отправлена.',
					submissionId: submission.id,
					submissionNumber: submission.submissionNumber,
					dealId: dealResponse?.result?.toString?.(),
					warning: hasBitrixDealId ? undefined : 'Заявка создана, но индексация может быть неполной',
				})
			}

			// Если сделка создана в Bitrix, но не удалось сохранить в БД
			if (dealResponse?.result) {
				console.error(
					`[SUBMIT_FORM] ❌ КРИТИЧЕСКАЯ ОШИБКА: Сделка создана в Bitrix24 (ID: ${dealResponse.result}), но не сохранена в БД!`
				)
				// Попытаемся создать заявку еще раз
				try {
					const recoverySubmissionData = {
						formId: formId,
						userId: userId,
						title: dealTitle,
						notes:
							'Заявка создана через форму (восстановлена после ошибки БД)',
						formData: formData,
						bitrixDealId: dealResponse.result?.toString?.(),
						userName: userName,
						userEmail: userEmail,
					}
					const recoveredSubmission = await submissionService.createSubmission(
						recoverySubmissionData
					)
					console.log(
						`[SUBMIT_FORM] ✅ Заявка восстановлена в БД: ${recoveredSubmission.id}`
					)

					return res.status(200).json({
						success: true,
						message:
							form.successMessage ||
							'Спасибо! Ваша заявка успешно отправлена.',
						submissionId: recoveredSubmission.id,
						submissionNumber: recoveredSubmission.submissionNumber,
						dealId: dealResponse.result?.toString?.(),
					})
				} catch (recoveryError: any) {
					console.error(
						`[SUBMIT_FORM] ❌ Не удалось восстановить заявку в БД:`,
						recoveryError
					)
					// Сохраняем информацию для ручного восстановления, но сообщаем пользователю об успехе
					// т.к. заявка уже создана в Bitrix24 и её можно восстановить вручную
					return res.status(500).json({
						success: false,
						message:
							'Заявка создана в Bitrix24, но произошла ошибка сохранения в системе. Обратитесь в поддержку с указанием номера сделки.',
						bitrixDealId: dealResponse.result?.toString?.(),
						error: error.message,
						recoveryData: {
							formId,
							dealTitle,
							formData,
						},
					})
				}
			}

			// Если ошибка на этапе создания Bitrix сделки - ничего не создано
			console.error(
				`[SUBMIT_FORM] ❌ Ошибка создания сделки в Bitrix24, ничего не сохранено`
			)
			return res.status(500).json({
				success: false,
				message: 'Ошибка создания заявки в системе. Пожалуйста, попробуйте еще раз.',
				error: error?.message,
			})
		}
	} catch (error: any) {
		console.error('[SUBMIT_FORM] ❌ Неожиданная ошибка при обработке заявки:', error)
		return res.status(500).json({
			success: false,
			message: 'Произошла ошибка при обработке заявки. Пожалуйста, попробуйте еще раз.',
			error: error?.message,
		})
	}
}

// Получение всех заявок (для админов)
export const getAllSubmissions = async (req: Request, res: Response) => {
	try {
		console.log('🔍 getAllSubmissions: начало обработки запроса')
		console.log('🔍 getAllSubmissions: query параметры:', req.query)

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
			formId,
			bitrixSyncStatus,
			sortBy = 'createdAt',
			sortOrder = 'desc',
		} = req.query

		console.log('🔍 getAllSubmissions: извлеченные параметры:', {
			page,
			limit,
			status,
			priority,
			assignedTo,
			userId,
			dateFrom,
			dateTo,
			search,
			tags,
			formId,
			bitrixSyncStatus,
			sortBy,
			sortOrder,
		})

		// Подготовка фильтров
		const filters = {
			status: status as string,
			priority: priority as SubmissionPriority,
			assignedToId: assignedTo as string,
			userId: userId as string,
			dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
			dateTo: dateTo ? new Date(dateTo as string) : undefined,
			search: search as string,
			tags: Array.isArray(tags)
				? (tags as string[])
				: tags
				? [tags as string]
				: undefined,
			formId: formId as string,
			bitrixSyncStatus: bitrixSyncStatus as BitrixSyncStatus,
		}

		// Подготовка пагинации
		const pagination = {
			page: Number(page),
			limit: Number(limit),
			sortBy: sortBy as string,
			sortOrder: (sortOrder as string).toUpperCase() as 'ASC' | 'DESC',
		}

		console.log('🔍 getAllSubmissions: подготовленные фильтры:', filters)
		console.log('🔍 getAllSubmissions: подготовленная пагинация:', pagination)

		console.log(
			'🔍 getAllSubmissions: вызываем submissionService.searchSubmissions'
		)

		// Используем сервис для получения заявок
		const result = await submissionService.searchSubmissions({
			...filters,
			...pagination,
		})

		console.log('🔍 getAllSubmissions: получен результат от сервиса:', {
			dataCount: result.data?.length || 0,
			total: result.total,
			page: result.page,
			limit: result.limit,
		})

		res.status(200).json({
			success: true,
			...result,
		})
	} catch (error: any) {
		console.error('❌ getAllSubmissions: ошибка при получении заявок:', error)
		res.status(500).json({
			success: false,
			message: 'Ошибка при получении заявок',
			error: error.message,
		})
	}
}

// Получение заявок текущего пользователя
export const getMySubmissions = async (req: Request, res: Response) => {
	try {
		const {
			page = 1,
			limit = 20,
			status,
			priority,
			assignedTo,
			dateFrom,
			dateTo,
			search,
			tags,
			sortBy = 'shipmentDate',
			sortOrder = 'desc',
		} = req.query
		const userId = req.user?.id

		if (!userId) {
			return res.status(401).json({
				success: false,
				message: 'Пользователь не авторизован',
			})
		}

		// Валидация параметров сортировки
		const allowedSortFields = ['shipmentDate', 'createdAt']
		const validSortBy = allowedSortFields.includes(sortBy as string)
			? (sortBy as string)
			: 'shipmentDate'
		const validSortOrder = ['asc', 'desc'].includes(
			(sortOrder as string).toLowerCase()
		)
			? ((sortOrder as string).toUpperCase() as 'ASC' | 'DESC')
			: 'DESC'

		// Подготовка фильтров
		const filters = {
			userId,
			status: status as string,
			priority: priority as SubmissionPriority,
			assignedToId: assignedTo as string,
			dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
			dateTo: dateTo ? new Date(dateTo as string) : undefined,
			search: search as string,
			tags: Array.isArray(tags)
				? (tags as string[])
				: tags
				? [tags as string]
				: undefined,
		}

		// Подготовка пагинации
		const pagination = {
			page: Number(page),
			limit: Number(limit),
			sortBy: validSortBy,
			sortOrder: validSortOrder,
		}

		const result = await submissionService.getUserSubmissions(
			userId,
			filters,
			pagination
		)

		res.json({
			success: true,
			...result,
		})
	} catch (error: any) {
		console.error('Ошибка получения заявок:', error)
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

		console.log(`[GET_SUBMISSION] Starting getSubmissionById for ID: ${id}`)

		const submission = await submissionService.findById(id)

		if (!submission) {
			console.log(`[GET_SUBMISSION] Submission not found for ID: ${id}`)
			return res.status(404).json({
				success: false,
				message: 'Заявка не найдена',
			})
		}

		console.log(
			`[GET_SUBMISSION] Found submission: ${submission.submissionNumber}, bitrixDealId: ${submission.bitrixDealId}`
		)

		// Проверяем права доступа
		if (!isAdmin && submission.userId !== userId) {
			console.log(
				`[GET_SUBMISSION] Access denied for user ${userId} to submission ${id}`
			)
			return res.status(403).json({
				success: false,
				message: 'Нет прав для просмотра этой заявки',
			})
		}

		console.log(`[GET_SUBMISSION] Access granted, starting data enrichment`)

		// Получаем историю изменений
		const history = await submissionService.getSubmissionHistory(id)
		console.log(
			`[GET_SUBMISSION] History loaded, entries: ${history?.length || 0}`
		)

		// Получаем поля формы для отображения названий полей
		let formFields = []
		// Копируем все исходные данные формы, затем обогащаем только нужные поля
		let enrichedFormData = { ...(submission.formData || {}) }

		if (submission.formId) {
			const formService = getFormService()
			const form = await formService.findById(submission.formId)
			if (form && form.fields) {
				formFields = form.fields

				// Обогащаем formData человекочитаемыми значениями для ID полей
				console.log(
					`[GET_SUBMISSION] Starting form data enrichment, form fields count: ${form.fields.length}`
				)
				try {
					for (const field of form.fields) {
						const value = submission.formData?.[field.name]
						if (
							value &&
							(field.type === 'autocomplete' || field.type === 'select')
						) {
							console.log(
								`[GET_SUBMISSION] Processing field ${field.name}, type: ${field.type}, value: ${value}`
							)
							// Для autocomplete полей, которые связаны с Bitrix24
							if (field.dynamicSource?.enabled) {
								console.log(
									`[GET_SUBMISSION] Field has dynamic source: ${field.dynamicSource.source}`
								)
								if (
									field.dynamicSource.source === 'catalog' &&
									typeof value === 'string'
								) {
									try {
										console.log(
											`[GET_SUBMISSION] Fetching product from catalog for ID: ${value}`
										)
										const productResponse = await bitrix24Service.getProduct(
											value
										)
										if (productResponse?.result?.NAME) {
											enrichedFormData[field.name] = productResponse.result.NAME
											console.log(
												`[GET_SUBMISSION] Catalog product enriched: ${field.name} = ${productResponse.result.NAME}`
											)
										} else {
											console.log(
												`[GET_SUBMISSION] No catalog product name found for ID ${value}`
											)
										}
									} catch (error) {
										console.error(
											`[GET_SUBMISSION] Error getting catalog product for ID ${value}:`,
											error.message
										)
									}
								} else if (
									field.dynamicSource.source === 'companies' &&
									typeof value === 'string'
								) {
									try {
										console.log(
											`[GET_SUBMISSION] Fetching company for ID: ${value}`
										)
										const companyResponse = await bitrix24Service.getCompany(
											value
										)
										if (companyResponse?.result?.TITLE) {
											enrichedFormData[field.name] =
												companyResponse.result.TITLE
											console.log(
												`[GET_SUBMISSION] Company enriched: ${field.name} = ${companyResponse.result.TITLE}`
											)
										} else {
											console.log(
												`[GET_SUBMISSION] No company title found for ID ${value}`
											)
										}
									} catch (error) {
										console.error(
											`[GET_SUBMISSION] Error getting company for ID ${value}:`,
											error.message
										)
									}
								} else if (
									field.dynamicSource.source === 'products' &&
									typeof value === 'string'
								) {
									try {
										console.log(
											`[GET_SUBMISSION] Fetching product for ID: ${value}`
										)
										const productResponse = await bitrix24Service.getProduct(
											value
										)
										if (productResponse?.result?.NAME) {
											enrichedFormData[field.name] = productResponse.result.NAME
											console.log(
												`[GET_SUBMISSION] Product enriched: ${field.name} = ${productResponse.result.NAME}`
											)
										} else {
											console.log(
												`[GET_SUBMISSION] No product name found for ID ${value}`
											)
										}
									} catch (error) {
										console.error(
											`[GET_SUBMISSION] Error getting product for ID ${value}:`,
											error.message
										)
									}
								} else if (
									field.dynamicSource.source === 'contacts' &&
									typeof value === 'string'
								) {
									try {
										console.log(
											`[GET_SUBMISSION] Fetching contact for ID: ${value}`
										)
										const contactResponse = await bitrix24Service.getContacts(
											value,
											1
										)
										const contact = Array.isArray(contactResponse?.result)
											? contactResponse.result[0]
											: contactResponse?.result
										if (contact) {
											const contactName = `${contact.NAME || ''} ${
												contact.LAST_NAME || ''
											}`.trim()
											if (contactName) {
												enrichedFormData[field.name] = contactName
												console.log(
													`[GET_SUBMISSION] Contact enriched: ${field.name} = ${contactName}`
												)
											}
										} else {
											console.log(
												`[GET_SUBMISSION] No contact found for ID ${value}`
											)
										}
									} catch (error) {
										console.error(
											`[GET_SUBMISSION] Error getting contact for ID ${value}:`,
											error.message
										)
									}
								}
							} else if (field.options && Array.isArray(field.options)) {
								// Для обычных select полей ищем в опциях
								const option = field.options.find(
									(opt: any) => opt.value === value
								)
								if (option) {
									enrichedFormData[field.name] = option.label
									console.log(
										`[GET_SUBMISSION] Select option enriched: ${field.name} = ${option.label}`
									)
								}
							}
						}
					}
				} catch (error) {
					console.error(
						'[GET_SUBMISSION] Critical error during form data enrichment:',
						error
					)
				}
			}
		}

		console.log(
			`[GET_SUBMISSION] Enrichment completed, responding with success`
		)
		res.json({
			success: true,
			data: {
				submission: {
					...submission,
					formData: enrichedFormData,
				},
				history,
				formFields,
			},
		})
	} catch (error: any) {
		console.error(
			'[GET_SUBMISSION] Critical error in getSubmissionById:',
			error
		)
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

		const submission = await submissionService.findById(id)
		if (!submission) {
			return res.status(404).json({
				success: false,
				message: 'Заявка не найдена',
			})
		}

		// Обновляем статус
		await submissionService.updateStatus(id, status, userId)

		// Добавляем комментарий если есть
		if (comment) {
			await submissionService.addComment(id, comment, userId)
		}

		// Синхронизируем с Битрикс24 если есть dealId
		if (submission.bitrixDealId) {
			try {
				await bitrix24Service.updateDealStatus(
					submission.bitrixDealId,
					status,
					submission.bitrixCategoryId || '1'
				)
				await submissionService.updateSyncStatus(id, BitrixSyncStatus.SYNCED)
			} catch (bitrixError: any) {
				await submissionService.updateSyncStatus(
					id,
					BitrixSyncStatus.FAILED,
					undefined,
					bitrixError.message
				)
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

// Получение заявки с актуальными данными из Битрикс24 для редактирования
export const getSubmissionWithBitrixData = async (
	req: Request,
	res: Response
) => {
	try {
		const { id } = req.params
		const userId = req.user?.id

		const submission = await submissionService.findById(id)
		if (!submission) {
			return res
				.status(404)
				.json({ success: false, message: 'Заявка не найдена' })
		}

		const isAdmin = req.isAdmin
		if (!isAdmin && submission.userId !== userId) {
			return res
				.status(403)
				.json({ success: false, message: 'Нет прав доступа' })
		}

		let formDataFromBitrix: Record<string, any> = {}
		let preloadedOptions: Record<string, { value: any; label: string }[]> = {}

		try {
			if (submission.bitrixDealId) {
				const dealResponse = await bitrix24Service.getDeal(
					submission.bitrixDealId
				)
				const dealData = dealResponse?.result || {}

				const form = await formService.findWithFields(submission.formId)
				if (form) {
					for (const field of form.fields) {
						if (field.bitrixFieldId) {
							const bitrixValue = dealData[field.bitrixFieldId]
							if (bitrixValue !== undefined) {
								formDataFromBitrix[field.name] = bitrixValue

								if (
									field.type === 'autocomplete' &&
									field.dynamicSource?.enabled
								) {
									try {
										if (field.dynamicSource.source === 'products') {
											const productResponse = await bitrix24Service.getProduct(
												String(bitrixValue)
											)
											const productName = productResponse?.result?.NAME
											if (productName) {
												preloadedOptions[field.name] = [
													{ value: bitrixValue, label: productName },
												]
											}
										} else if (field.dynamicSource.source === 'companies') {
											const companyResponse = await bitrix24Service.getCompany(
												String(bitrixValue)
											)
											const companyName = companyResponse?.result?.TITLE
											if (companyName) {
												preloadedOptions[field.name] = [
													{ value: bitrixValue, label: companyName },
												]
											}
										} else if (field.dynamicSource.source === 'catalog') {
											const productResponse = await bitrix24Service.getProduct(
												String(bitrixValue)
											)
											const productName = productResponse?.result?.NAME
											if (productName) {
												preloadedOptions[field.name] = [
													{ value: bitrixValue, label: productName },
												]
											}
										}
									} catch {}
								}
							}
						}
					}
				}
			}

			await submissionService.updateSyncStatus(
				submission.id,
				BitrixSyncStatus.SYNCED
			)
		} catch (bitrixError: any) {
			await submissionService.updateSyncStatus(
				submission.id,
				BitrixSyncStatus.FAILED,
				undefined,
				bitrixError?.message
			)
			formDataFromBitrix = {}
		}

		const responseData = {
			id: submission.id,
			formId: submission.formId,
			formData: formDataFromBitrix,
			preloadedOptions,
		}

		return res.json({ success: true, data: responseData })
	} catch (error: any) {
		return res
			.status(500)
			.json({ success: false, message: 'Ошибка получения заявки' })
	}
}

// Обновление заявки - OFFLINE-FIRST подход (сначала БД, потом Bitrix24)
export const updateSubmission = async (req: Request, res: Response) => {
	try {
		const { id } = req.params
		const updateData = req.body
		const userId = req.user?.id

		console.log(`[UPDATE_SUBMISSION] Начало обновления заявки ${id}`)

		const submission = await submissionService.findById(id)
		if (!submission) {
			console.log(`[UPDATE_SUBMISSION] Заявка ${id} не найдена`)
			return res
				.status(404)
				.json({ success: false, message: 'Заявка не найдена' })
		}

		const isAdmin = req.isAdmin
		if (!isAdmin && submission.userId !== userId) {
			console.log(
				`[UPDATE_SUBMISSION] Нет прав для редактирования заявки ${id}`
			)
			return res.status(403).json({
				success: false,
				message: 'Нет прав для редактирования этой заявки',
			})
		}

		try {
			const form = await formService.findWithFields(submission.formId)
			if (!form) {
				throw new Error('Форма не найдена')
			}

			// Подготовка данных для Bitrix24
			const dealData: Record<string, any> = {}
			let newTitle: string = submission.title

			for (const field of form.fields) {
				if (updateData[field.name] !== undefined && field.bitrixFieldId) {
					const value = updateData[field.name]
					dealData[field.bitrixFieldId] = value
					if (field.bitrixFieldId === 'TITLE' && value) {
						newTitle = value
					}
				}
			}

			// ШАГ 1: СНАЧАЛА сохраняем в локальной БД (OFFLINE-FIRST!)
			console.log(`[UPDATE_SUBMISSION] Шаг 1: Сохранение в БД для заявки ${id}`)
			await submissionService.updateSubmission(
				id,
				{
					title: newTitle,
					formData: updateData,
				},
				userId
			)
			console.log(`[UPDATE_SUBMISSION] ✅ Данные сохранены в БД для заявки ${id}`)

			// Устанавливаем статус "в процессе синхронизации"
			await submissionService.updateSyncStatus(id, BitrixSyncStatus.PENDING)

			// ШАГ 2: ПОТОМ пытаемся синхронизировать с Bitrix24
			console.log(
				`[UPDATE_SUBMISSION] Шаг 2: Попытка синхронизации с Bitrix24 для заявки ${id}`
			)
			try {
				await bitrix24Service.updateDeal(submission.bitrixDealId!, dealData)
				await submissionService.updateSyncStatus(id, BitrixSyncStatus.SYNCED)
				console.log(
					`[UPDATE_SUBMISSION] ✅ Синхронизация с Bitrix24 успешна для заявки ${id}`
				)
			} catch (bitrixError: any) {
				// Синхронизация не удалась, но данные УЖЕ СОХРАНЕНЫ в БД!
				console.warn(
					`[UPDATE_SUBMISSION] ⚠️ Ошибка синхронизации с Bitrix24 для заявки ${id}:`,
					bitrixError.message
				)
				await submissionService.updateSyncStatus(
					id,
					BitrixSyncStatus.FAILED,
					undefined,
					`Bitrix24: ${bitrixError?.message || 'Ошибка сети'}`
				)
				// НЕ прерываем выполнение - данные сохранены!

			}

			// ШАГ 3: Автоматическая переиндексация заявки в Elasticsearch
			console.log(
				`[UPDATE_SUBMISSION] Шаг 3: Переиндексация в Elasticsearch для заявки ${id}`
			)
			try {
				const updatedSubmission = await submissionService.findById(id)
				if (updatedSubmission) {
					// Очищаем formData от пустых значений
					const cleanedFormData = updatedSubmission.formData
						? Object.fromEntries(
								Object.entries(updatedSubmission.formData).filter(
									([key, value]) =>
										value !== null && value !== undefined && value !== ''
								)
						  )
						: {}

					const submissionData = {
						id: `submission_${updatedSubmission.id}`,
						name:
							updatedSubmission.title ||
							`Заявка #${updatedSubmission.submissionNumber}`,
						description: updatedSubmission.notes || '',
						type: 'submission' as const,
						status: updatedSubmission.status,
						priority: updatedSubmission.priority,
						tags: updatedSubmission.tags || [],
						formData: cleanedFormData,
						submissionNumber: updatedSubmission.submissionNumber,
						userName: updatedSubmission.userName,
						userEmail: updatedSubmission.userEmail,
						formName: form.name,
						formTitle: form.title,
						assignedToName: updatedSubmission.assignedToName,
						createdAt: updatedSubmission.createdAt.toISOString(),
						updatedAt: updatedSubmission.updatedAt.toISOString(),
						searchableText: `${updatedSubmission.title || ''} ${
							updatedSubmission.notes || ''
						} ${updatedSubmission.submissionNumber || ''} ${
							updatedSubmission.userName || ''
						} ${form.name || ''}`.toLowerCase(),
					}

					await elasticsearchService.indexDocument(submissionData)
					console.log(
						`[UPDATE_SUBMISSION] ✅ Переиндексация в Elasticsearch успешна для заявки ${updatedSubmission.submissionNumber}`
					)
				}
			} catch (indexError) {
				console.warn(
					`[UPDATE_SUBMISSION] ⚠️ Ошибка переиндексации в Elasticsearch для заявки ${submission.submissionNumber}:`,
					indexError
				)
				// Не прерываем выполнение, если индексация не удалась
			}

			// ШАГ 4: Получаем финальный статус синхронизации
			const finalSubmission = await submissionService.findById(id)
			const syncStatus = finalSubmission?.bitrixSyncStatus || BitrixSyncStatus.SYNCED

			console.log(
				`[UPDATE_SUBMISSION] ✅ Заявка ${id} успешно обновлена. Статус синхронизации: ${syncStatus}`
			)

			// ВСЕГДА возвращаем успех, если данные сохранены в БД
			return res.json({
				success: true,
				data: {
					id: submission.id,
					submissionNumber: submission.submissionNumber,
					title: newTitle,
					bitrixDealId: submission.bitrixDealId,
					bitrixSyncStatus: syncStatus,
				},
				message: 'Заявка успешно обновлена',
				warning:
					syncStatus === BitrixSyncStatus.FAILED
						? 'Данные сохранены, но синхронизация с Bitrix24 будет выполнена позже'
						: undefined,
			})
		} catch (error: any) {
			// Критическая ошибка на этапе сохранения в БД
			console.error(
				`[UPDATE_SUBMISSION] ❌ Критическая ошибка обновления заявки ${id}:`,
				error
			)
			return res.status(500).json({
				success: false,
				message: 'Ошибка обновления заявки',
				error: error?.message,
			})
		}
	} catch (error: any) {
		console.error(
			`[UPDATE_SUBMISSION] ❌ Неожиданная ошибка при обновлении заявки:`,
			error
		)
		return res
			.status(500)
			.json({ success: false, message: 'Ошибка обновления заявки' })
	}
}

// Удаление заявки
export const deleteSubmission = async (req: Request, res: Response) => {
	try {
		const { id } = req.params

		const submission = await submissionService.findById(id)
		if (!submission) {
			return res.status(404).json({
				success: false,
				message: 'Заявка не найдена',
			})
		}

		await submissionService.delete(id)

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
			{
				id: 'C1:LOSE',
				name: 'Отменено',
				sort: 40,
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

		// Ищем заявку по bitrixDealId
		const submission = await submissionService.findByBitrixDealId(
			bitrixid as string
		)
		if (!submission) {
			return res.status(404).json({
				success: false,
				message: `Заявка с bitrixDealId ${bitrixid} не найдена`,
			})
		}

		// Обновляем статус
		await submissionService.updateStatus(submission.id, status as string)

		// Добавляем комментарий
		await submissionService.addComment(
			submission.id,
			'Автоматическое обновление через внешний API',
			undefined // Системное изменение
		)

		res.json({
			success: true,
			message: 'Статус заявки обновлен успешно',
			data: {
				submissionNumber: submission.submissionNumber,
				bitrixDealId: submission.bitrixDealId,
				oldStatus: submission.status,
				newStatus: status,
				updatedAt: new Date(),
			},
		})
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

		// Получаем данные сделки из Битрикс24
		const dealData = await bitrix24Service.getDeal(dealId)

		if (!dealData?.result) {
			return res.status(404).json({
				success: false,
				message: `Сделка с ID ${dealId} не найдена в Битрикс24`,
			})
		}

		const fieldValue = dealData.result.UF_CRM_1750107484181

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

// Отмена заявки
export const cancelSubmission = async (req: Request, res: Response) => {
	try {
		const { id } = req.params
		const { comment } = req.body
		const userId = req.user?.id
		const isAdmin = req.isAdmin

		const submission = await submissionService.findById(id)
		if (!submission) {
			return res.status(404).json({
				success: false,
				message: 'Заявка не найдена',
			})
		}

		// Проверяем права доступа - только владелец заявки или админ могут отменить
		if (!isAdmin && submission.userId !== userId) {
			return res.status(403).json({
				success: false,
				message: 'Нет прав для отмены этой заявки',
			})
		}

		// Проверяем, можно ли отменить заявку (только NEW и UC_GJLIZP статусы)
		if (!['C1:NEW', 'C1:UC_GJLIZP'].includes(submission.status)) {
			return res.status(400).json({
				success: false,
				message: 'Заявку в данном статусе нельзя отменить',
			})
		}

		// Обновляем статус на отменено
		await submissionService.updateStatus(id, 'C1:LOSE', userId)

		// Добавляем комментарий с причиной отмены
		const cancelComment = comment
			? `Причина отмены: ${comment}`
			: 'Заявка отменена пользователем'
		await submissionService.addComment(id, cancelComment, userId)

		// Синхронизируем с Bitrix24 если есть dealId
		if (submission.bitrixDealId) {
			try {
				await bitrix24Service.updateDealStatus(
					submission.bitrixDealId,
					'C1:LOSE',
					submission.bitrixCategoryId || '1'
				)
				await submissionService.updateSyncStatus(id, BitrixSyncStatus.SYNCED)
			} catch (bitrixError: any) {
				console.warn(
					'Ошибка синхронизации отмены с Bitrix24:',
					bitrixError.message
				)
				await submissionService.updateSyncStatus(
					id,
					BitrixSyncStatus.FAILED,
					undefined,
					bitrixError.message
				)
				// Не прерываем выполнение, заявка все равно отменена локально
			}
		}

		res.json({
			success: true,
			message: 'Заявка успешно отменена',
			data: {
				id: submission.id,
				submissionNumber: submission.submissionNumber,
				status: 'C1:LOSE',
			},
		})
	} catch (error: any) {
		console.error('Ошибка отмены заявки:', error)
		res.status(500).json({
			success: false,
			message: 'Ошибка отмены заявки',
			error: error?.message,
		})
	}
}

// Копирование заявки
export const copySubmission = async (req: Request, res: Response) => {
	console.log('COPY_TEST_LOG')
	console.log('====== COPY FUNCTION ENTERED ======')
	try {
		console.log('====== COPY SUBMISSION START ======')
		const { id } = req.params
		const userId = req.user?.id
		console.log('Copy submission called with ID:', id, 'User ID:', userId)

		const originalSubmission = await submissionService.findById(id)
		if (!originalSubmission) {
			return res
				.status(404)
				.json({ success: false, message: 'Заявка не найдена' })
		}

		const user = userId ? await userService.findById(userId) : null
		if (!user) {
			return res
				.status(404)
				.json({ success: false, message: 'Пользователь не найден' })
		}

		const form = await formService.findWithFields(originalSubmission.formId)
		if (!form) {
			return res
				.status(404)
				.json({ success: false, message: 'Форма не найдена' })
		}

		let formDataFromBitrix: Record<string, any> = {}
		let preloadedOptions: Record<string, { value: any; label: string }[]> = {}

		// Сначала пытаемся получить данные из Битрикс24 (если заявка синхронизирована)
		if (originalSubmission.bitrixDealId) {
			try {
				const dealResponse = await bitrix24Service.getDeal(
					originalSubmission.bitrixDealId
				)
				const dealData = dealResponse?.result || {}

				for (const field of form.fields) {
					if (
						field.bitrixFieldId &&
						dealData[field.bitrixFieldId] !== undefined
					) {
						const bitrixValue = dealData[field.bitrixFieldId]
						formDataFromBitrix[field.name] = bitrixValue

						if (
							field.type === 'autocomplete' &&
							field.dynamicSource?.enabled &&
							bitrixValue
						) {
							try {
								if (field.dynamicSource.source === 'products') {
									const productResponse = await bitrix24Service.getProduct(
										String(bitrixValue)
									)
									const productName = productResponse?.result?.NAME
									if (productName) {
										preloadedOptions[field.name] = [
											{ value: bitrixValue, label: productName },
										]
									}
								} else if (field.dynamicSource.source === 'companies') {
									const companyResponse = await bitrix24Service.getCompany(
										String(bitrixValue)
									)
									const companyName = companyResponse?.result?.TITLE
									if (companyName) {
										preloadedOptions[field.name] = [
											{ value: bitrixValue, label: companyName },
										]
									}
								} else if (field.dynamicSource.source === 'contacts') {
									const contactResponse = await bitrix24Service.getContacts(
										String(bitrixValue),
										1
									)
									const first = Array.isArray(contactResponse?.result)
										? contactResponse.result[0]
										: contactResponse?.result
									const contactName = first
										? `${first.NAME || ''} ${first.LAST_NAME || ''}`.trim()
										: ''
									if (contactName) {
										preloadedOptions[field.name] = [
											{ value: bitrixValue, label: contactName },
										]
									}
								} else if (field.dynamicSource.source === 'catalog') {
									const productResponse = await bitrix24Service.getProduct(
										String(bitrixValue)
									)
									const productName = productResponse?.result?.NAME
									if (productName) {
										preloadedOptions[field.name] = [
											{ value: bitrixValue, label: productName },
										]
									}
								}
							} catch {}
						}
					}
				}
			} catch {}
		}

		// Дополнительно создаем preloadedOptions для всех autocomplete полей на основе данных формы
		console.log('[COPY] Исходные данные формы:', originalSubmission.formData)
		console.log(
			'[COPY] Поля формы для обработки:',
			form.fields.map(f => ({
				name: f.name,
				type: f.type,
				dynamicSource: f.dynamicSource,
			}))
		)

		for (const field of form.fields) {
			if (
				field.type === 'autocomplete' &&
				field.dynamicSource?.enabled &&
				originalSubmission.formData[field.name]
			) {
				const fieldValue = originalSubmission.formData[field.name]
				console.log(
					`[COPY] Обрабатываем autocomplete поле ${field.name} со значением:`,
					fieldValue
				)

				// Если у нас еще нет preloadedOptions для этого поля
				if (!preloadedOptions[field.name] && fieldValue) {
					try {
						if (field.dynamicSource.source === 'companies') {
							console.log(
								`[COPY] Запрашиваем компанию ${fieldValue} из Битрикс24`
							)
							const companyResponse = await bitrix24Service.getCompany(
								String(fieldValue)
							)
							console.log(
								`[COPY] Ответ от Битрикс24 для компании:`,
								companyResponse
							)
							const companyName = companyResponse?.result?.TITLE
							if (companyName) {
								preloadedOptions[field.name] = [
									{ value: fieldValue, label: companyName },
								]
								console.log(
									`[COPY] Добавлены preloadedOptions для ${field.name}:`,
									preloadedOptions[field.name]
								)
							}
						} else if (field.dynamicSource.source === 'contacts') {
							const contactResponse = await bitrix24Service.getContacts(
								String(fieldValue),
								1
							)
							const first = Array.isArray(contactResponse?.result)
								? contactResponse.result[0]
								: contactResponse?.result
							const contactName = first
								? `${first.NAME || ''} ${first.LAST_NAME || ''}`.trim()
								: ''
							if (contactName) {
								preloadedOptions[field.name] = [
									{ value: fieldValue, label: contactName },
								]
							}
						} else if (field.dynamicSource.source === 'products') {
							const productResponse = await bitrix24Service.getProduct(
								String(fieldValue)
							)
							const productName = productResponse?.result?.NAME
							if (productName) {
								preloadedOptions[field.name] = [
									{ value: fieldValue, label: productName },
								]
							}
						}
					} catch (error) {
						console.error(
							`[COPY] Ошибка получения preloadedOptions для поля ${field.name}:`,
							error
						)
					}
				}
			}
		}

		console.log('[COPY] Итоговые preloadedOptions:', preloadedOptions)

		// Объединяем исходные данные формы с актуальными данными из Битрикс24
		const finalFormData = {
			...originalSubmission.formData,
			...formDataFromBitrix,
		}

		return res.json({
			success: true,
			message: 'Данные заявки получены для копирования',
			data: {
				formId: originalSubmission.formId,
				formData: finalFormData,
				preloadedOptions,
				originalTitle: originalSubmission.title,
				originalSubmissionNumber: originalSubmission.submissionNumber,
				isCopy: true,
			},
		})
	} catch (error: any) {
		console.error('====== COPY SUBMISSION ERROR ======')
		console.error('Error in copySubmission:', error)
		console.error('Error stack:', error?.stack)
		return res.status(500).json({
			success: false,
			message: 'Ошибка копирования заявки',
			error: error?.message,
		})
	}
}

// Получение данных полей формы для заявки
export const getSubmissionFormFields = async (req: Request, res: Response) => {
	try {
		const { id } = req.params
		const userId = req.user?.id
		const isAdmin = req.isAdmin

		const submission = await submissionService.findById(id)
		if (!submission) {
			return res.status(404).json({
				success: false,
				message: 'Заявка не найдена',
			})
		}

		// Проверяем права доступа
		if (!isAdmin && submission.userId !== userId) {
			return res.status(403).json({
				success: false,
				message: 'Нет прав для просмотра этой заявки',
			})
		}

		// Получаем данные полей из Elasticsearch
		const formFields = await submissionService.getSubmissionFormFields(id)

		res.json({
			success: true,
			data: {
				formFields,
			},
		})
	} catch (error: any) {
		console.error('Ошибка получения данных полей формы:', error)
		res.status(500).json({
			success: false,
			message: 'Ошибка получения данных полей формы',
		})
	}
}

// Webhook для создания заявки из Bitrix24 (если она потерялась в системе)
export const syncSubmissionFromBitrix = async (
	req: Request,
	res: Response
) => {
	try {
		const { bitrixDealId, formId } = req.body

		console.log(
			`[BITRIX_WEBHOOK] Запрос на синхронизацию сделки ${bitrixDealId}`
		)

		// Проверяем, существует ли уже заявка с таким bitrixDealId
		const existingSubmission = await submissionService.findByBitrixDealId(
			bitrixDealId
		)

		if (existingSubmission) {
			console.log(
				`[BITRIX_WEBHOOK] Заявка для сделки ${bitrixDealId} уже существует: ${existingSubmission.id}`
			)
			return res.json({
				success: true,
				message: 'Заявка уже существует в системе',
				submissionId: existingSubmission.id,
				submissionNumber: existingSubmission.submissionNumber,
			})
		}

		// Получаем данные сделки из Bitrix24
		const dealResponse = await bitrix24Service.getDeal(bitrixDealId)
		if (!dealResponse?.result) {
			return res.status(404).json({
				success: false,
				message: `Сделка ${bitrixDealId} не найдена в Bitrix24`,
			})
		}

		const dealData = dealResponse.result

		// Определяем форму (если не передана)
		let targetFormId = formId
		if (!targetFormId) {
			// Пытаемся определить по категории сделки или используем первую доступную форму
			const forms = await formService.findAll()
			const matchingForm = forms.find(
				f => f.bitrixDealCategory === dealData.CATEGORY_ID
			)
			targetFormId = matchingForm?.id || forms[0]?.id
		}

		if (!targetFormId) {
			return res.status(400).json({
				success: false,
				message: 'Не удалось определить форму для заявки',
			})
		}

		const form = await formService.findWithFields(targetFormId)
		if (!form) {
			return res.status(404).json({
				success: false,
				message: `Форма ${targetFormId} не найдена`,
			})
		}

		// Конвертируем данные Bitrix в формат formData
		const formData: Record<string, any> = {}
		for (const field of form.fields) {
			if (field.bitrixFieldId && dealData[field.bitrixFieldId] !== undefined) {
				formData[field.name] = dealData[field.bitrixFieldId]
			}
		}

		// Находим пользователя по полю ASSIGNED_BY_ID (Ответственный в Bitrix24)
		let assignedUserId: string | undefined = undefined
		let assignedUserName: string | undefined = undefined
		let assignedUserEmail: string | undefined = undefined

		if (dealData.ASSIGNED_BY_ID) {
			console.log(
				`[BITRIX_WEBHOOK] Поиск пользователя по bitrixUserId: ${dealData.ASSIGNED_BY_ID}`
			)
			try {
				const users = await userService.findAll()
				const assignedUser = users.find(
					u => u.bitrixUserId === String(dealData.ASSIGNED_BY_ID)
				)

				if (assignedUser) {
					assignedUserId = assignedUser.id
					assignedUserName = assignedUser.fullName
					assignedUserEmail = assignedUser.email
					console.log(
						`[BITRIX_WEBHOOK] ✅ Найден пользователь: ${assignedUserName} (${assignedUserId})`
					)
				} else {
					console.log(
						`[BITRIX_WEBHOOK] ⚠️ Пользователь с bitrixUserId ${dealData.ASSIGNED_BY_ID} не найден в системе`
					)
				}
			} catch (error: any) {
				console.error(
					`[BITRIX_WEBHOOK] ❌ Ошибка поиска пользователя:`,
					error.message
				)
			}
		}

		// Создаем заявку
		const submissionData = {
			formId: targetFormId,
			userId: assignedUserId,
			title: dealData.TITLE || `Сделка #${bitrixDealId}`,
			notes: 'Заявка восстановлена из Bitrix24 через webhook',
			formData: formData,
			bitrixDealId: bitrixDealId,
			userName: assignedUserName,
			userEmail: assignedUserEmail,
		}

		const submission = await submissionService.createSubmission(submissionData)
		await submissionService.updateSyncStatus(
			submission.id,
			BitrixSyncStatus.SYNCED,
			bitrixDealId
		)

		console.log(
			`[BITRIX_WEBHOOK] ✅ Заявка создана из Bitrix24: ${submission.id} для сделки ${bitrixDealId}`
		)

		res.json({
			success: true,
			message: 'Заявка успешно создана из Bitrix24',
			submissionId: submission.id,
			submissionNumber: submission.submissionNumber,
			bitrixDealId: bitrixDealId,
		})
	} catch (error: any) {
		console.error('[BITRIX_WEBHOOK] ❌ Ошибка синхронизации:', error)
		res.status(500).json({
			success: false,
			message: 'Ошибка создания заявки из Bitrix24',
			error: error.message,
		})
	}
}
