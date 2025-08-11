import { Request, Response } from 'express'
import { getFormService } from '../services/FormService'
import { getSubmissionService } from '../services/SubmissionService'
import { getUserService } from '../services/UserService'
import bitrix24Service from '../services/bitrix24Service'
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

		if (req.user?.id) {
			const user = await userService.findById(req.user.id)
			if (user && user.bitrixUserId) {
				dealData.ASSIGNED_BY_ID = user.bitrixUserId
			}
		}

		const categoryId = form.bitrixDealCategory || '1'
		dealData.CATEGORY_ID = categoryId

		let submission: any = null

		try {
			const submissionData = {
				formId: formId,
				userId: req.user?.id,
				title: dealTitle,
				notes: 'Заявка создана через форму',
			}

			submission = await submissionService.createSubmission(submissionData)
			dealData.UF_CRM_1750107484181 = submission.id

			const dealResponse = await bitrix24Service.createDeal(dealData)

			await submissionService.updateSyncStatus(
				submission.id,
				BitrixSyncStatus.SYNCED,
				dealResponse.result?.toString?.()
			)

			return res.status(200).json({
				success: true,
				message:
					form.successMessage || 'Спасибо! Ваша заявка успешно отправлена.',
				submissionId: submission.id,
				submissionNumber: submission.submissionNumber,
				dealId: dealResponse.result?.toString?.(),
			})
		} catch (bitrixError: any) {
			if (submission && submission.id) {
				try {
					await submissionService.delete(submission.id)
				} catch {}
			}

			return res.status(500).json({
				message: 'Ошибка создания заявки в системе',
				error: bitrixError?.message,
			})
		}
	} catch (error: any) {
		return res.status(500).json({
			message: 'Произошла ошибка при обработке заявки',
			error: error?.message,
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
			formId,
			bitrixSyncStatus,
			sortBy = 'createdAt',
			sortOrder = 'desc',
		} = req.query

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

		// Используем сервис для получения заявок
		const result = await submissionService.searchSubmissions({
			...filters,
			...pagination,
		})

		res.status(200).json({
			success: true,
			...result,
		})
	} catch (error: any) {
		console.error('Ошибка при получении заявок:', error)
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
		} = req.query
		const userId = req.user?.id

		if (!userId) {
			return res.status(401).json({
				success: false,
				message: 'Пользователь не авторизован',
			})
		}

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
			sortBy: 'createdAt',
			sortOrder: 'desc' as const,
		}

		const result = await submissionService.getUserSubmissions(userId, filters)

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

		// Получаем историю изменений
		const history = await submissionService.getSubmissionHistory(id)

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

// Обновление заявки - сразу в Битрикс24
export const updateSubmission = async (req: Request, res: Response) => {
	try {
		const { id } = req.params
		const updateData = req.body
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
				.json({
					success: false,
					message: 'Нет прав для редактирования этой заявки',
				})
		}

		try {
			const form = await formService.findWithFields(submission.formId)
			if (!form) {
				throw new Error('Форма не найдена')
			}

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

			await bitrix24Service.updateDeal(submission.bitrixDealId!, dealData)

			await submissionService.updateSubmission(id, { title: newTitle }, userId)
			await submissionService.updateSyncStatus(id, BitrixSyncStatus.SYNCED)

			return res.json({
				success: true,
				data: {
					id: submission.id,
					submissionNumber: submission.submissionNumber,
					title: newTitle,
					bitrixDealId: submission.bitrixDealId,
					bitrixSyncStatus: BitrixSyncStatus.SYNCED,
				},
				message: 'Заявка успешно обновлена',
			})
		} catch (bitrixError: any) {
			await submissionService.updateSyncStatus(
				id,
				BitrixSyncStatus.FAILED,
				undefined,
				bitrixError?.message
			)

			return res.status(500).json({
				success: false,
				message: 'Ошибка обновления заявки в Битрикс24',
				error: bitrixError?.message,
			})
		}
	} catch (error: any) {
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

// Копирование заявки
export const copySubmission = async (req: Request, res: Response) => {
	try {
		const { id } = req.params
		const userId = req.user?.id

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

						if (field.type === 'autocomplete' && bitrixValue) {
							try {
								if (field.bitrixEntity === 'product') {
									const productResponse = await bitrix24Service.getProduct(
										String(bitrixValue)
									)
									const productName = productResponse?.result?.NAME
									if (productName) {
										preloadedOptions[field.name] = [
											{ value: bitrixValue, label: productName },
										]
									}
								} else if (field.bitrixEntity === 'contact') {
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
								} else if (field.bitrixEntity === 'company') {
									const companyResponse = await bitrix24Service.getCompany(
										String(bitrixValue)
									)
									const companyName = companyResponse?.result?.TITLE
									if (companyName) {
										preloadedOptions[field.name] = [
											{ value: bitrixValue, label: companyName },
										]
									}
								}
							} catch {}
						}
					}
				}
			} catch {}
		}

		return res.json({
			success: true,
			message: 'Данные заявки получены для копирования',
			data: {
				formId: originalSubmission.formId,
				formData: formDataFromBitrix,
				preloadedOptions,
				originalTitle: originalSubmission.title,
				originalSubmissionNumber: originalSubmission.submissionNumber,
				isCopy: true,
			},
		})
	} catch (error: any) {
		return res.status(500).json({
			success: false,
			message: 'Ошибка копирования заявки',
			error: error?.message,
		})
	}
}
