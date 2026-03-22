import { AppDataSource } from '../database/config/database.config'
import {
	SubmissionPeriodGroup,
	PeriodGroupStatus,
} from '../database/entities/SubmissionPeriodGroup.entity'
import {
	Submission,
	BitrixSyncStatus,
	SubmissionPriority,
} from '../database/entities/Submission.entity'
import {
	ScheduledSubmission,
	ScheduledSubmissionStatus,
} from '../database/entities/ScheduledSubmission.entity'
import { getSubmissionPeriodGroupRepository } from '../database/repositories/SubmissionPeriodGroupRepository'
import { getScheduledSubmissionRepository } from '../database/repositories/ScheduledSubmissionRepository'
import { getSubmissionService } from './SubmissionService'
import { getFormService } from './FormService'
import { getSubmissionQueueService } from '../queue/SubmissionQueueService'
import { SubmissionJobType } from '../queue/config'
import bitrix24Service from './bitrix24Service'
import { v4 as uuidv4 } from 'uuid'

/**
 * DTO для создания периодических заявок
 */
export interface CreatePeriodSubmissionsDTO {
	formId: string
	formData: Record<string, any>
	periodConfig: {
		startDate: string | Date
		endDate: string | Date
		dateFieldName: string
		time?: string // Единое время для всех заявок (HH:mm)
		timeFieldName?: string // Название поля времени в форме
	}
	userId?: string
	userName?: string
	userEmail?: string
	assignedToId?: string // ID ответственного пользователя
	priority?: SubmissionPriority
	abnTimeField?: string // ID поля "Время АБН" (настраивается для каждой организации)
}

/**
 * Результат создания периодических заявок
 */
export interface PeriodSubmissionsResult {
	periodGroupId: string
	scheduledSubmissions: Array<{
		id: string
		scheduledDate: Date
		periodPosition: number
	}>
	totalScheduled: number
	period: {
		startDate: Date
		endDate: Date
		daysCount: number
	}
}

/**
 * Сервис для работы с периодическими заявками
 */
export class PeriodSubmissionService {
	private periodGroupRepository = getSubmissionPeriodGroupRepository()
	private submissionService = getSubmissionService()
	private formService = getFormService()

	/**
	 * Генерирует массив дат между startDate и endDate
	 */
	private generateDateRange(startDate: Date, endDate: Date): Date[] {
		const dates: Date[] = []
		const currentDate = new Date(startDate)
		const end = new Date(endDate)

		while (currentDate <= end) {
			dates.push(new Date(currentDate))
			currentDate.setDate(currentDate.getDate() + 1)
		}

		return dates
	}

	/**
	 * Валидация параметров периода
	 */
	private validatePeriodConfig(
		startDate: Date,
		endDate: Date
	): { valid: boolean; error?: string } {
		// Проверка что startDate <= endDate
		if (startDate > endDate) {
			return {
				valid: false,
				error: 'Начальная дата не может быть позже конечной даты',
			}
		}

		// Проверка что период не более 365 дней
		const diffTime = Math.abs(endDate.getTime() - startDate.getTime())
		const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

		if (diffDays > 365) {
			return {
				valid: false,
				error: 'Период не может превышать 365 дней',
			}
		}

		return { valid: true }
	}

	/**
	 * Создает периодические заявки
	 */
	async createPeriodSubmissions(
		data: CreatePeriodSubmissionsDTO
	): Promise<PeriodSubmissionsResult> {
		const queryRunner = AppDataSource.createQueryRunner()
		await queryRunner.connect()
		await queryRunner.startTransaction()

		try {
			// Проверяем userId - обязательное поле для периодических заявок
			if (!data.userId) {
				throw new Error(
					'userId обязателен для создания периодических заявок. Пользователь должен быть авторизован.'
				)
			}

			console.log(
				`[PERIOD_SERVICE] Создание периодических заявок от пользователя: ${data.userId} (${data.userName || 'Неизвестно'})`
			)

			// Логируем полученные данные формы
			console.log('[PERIOD_SERVICE] Полученные данные формы:', {
				formDataKeys: Object.keys(data.formData || {}).length,
				hasFormData: !!data.formData,
				formDataSample: data.formData ? Object.fromEntries(Object.entries(data.formData).slice(0, 5)) : null,
				fullFormData: JSON.stringify(data.formData),
			})

			// Получаем форму
			const form = await this.formService.findWithFields(data.formId)
			if (!form) {
				throw new Error('Форма не найдена')
			}

			// Проверяем что поле с датой существует
			const dateField = form.fields.find(
				f => f.name === data.periodConfig.dateFieldName
			)
			if (!dateField || dateField.type !== 'date') {
				throw new Error('Поле с датой не найдено в форме')
			}

			// Парсим и валидируем даты
			const startDate = new Date(data.periodConfig.startDate)
			const endDate = new Date(data.periodConfig.endDate)

			const validation = this.validatePeriodConfig(startDate, endDate)
			if (!validation.valid) {
				throw new Error(validation.error)
			}

			// Генерируем массив дат
			const dates = this.generateDateRange(startDate, endDate)
			const totalDays = dates.length

			// Проверяем, указано ли время для всех заявок
			const hasTime =
				data.periodConfig.time && data.periodConfig.timeFieldName

			if (hasTime) {
				console.log(
					`[PERIOD_SERVICE] Создание ${totalDays} заявок на период ${startDate.toLocaleDateString(
						'ru-RU'
					)} - ${endDate.toLocaleDateString('ru-RU')} с временем ${data.periodConfig.time}`
				)
			} else {
				console.log(
					`[PERIOD_SERVICE] Создание ${totalDays} заявок на период ${startDate.toLocaleDateString(
						'ru-RU'
					)} - ${endDate.toLocaleDateString('ru-RU')}`
				)
			}

			// Создаем группу периода
			const periodGroup = queryRunner.manager.create(SubmissionPeriodGroup, {
				id: uuidv4(),
				formId: data.formId,
				startDate,
				endDate,
				totalSubmissions: totalDays,
				createdById: data.userId,
				status: PeriodGroupStatus.ACTIVE,
				dateFieldName: data.periodConfig.dateFieldName,
				metadata: {
					originalFormData: data.formData,
				},
			})

			await queryRunner.manager.save(periodGroup)
			console.log(`[PERIOD_SERVICE] Группа периода создана: ${periodGroup.id}`)

			// Массив для хранения созданных запланированных заявок
			const scheduledSubmissions: ScheduledSubmission[] = []
			const assignedToId = data.assignedToId || null // Ответственный пользователь

			// Создаем запланированные заявки для каждой даты
			for (let i = 0; i < dates.length; i++) {
				const date = dates[i]
				const position = i + 1

				console.log(
					`[PERIOD_SERVICE] Создание запланированной заявки ${position}/${totalDays} на дату ${date.toLocaleDateString(
						'ru-RU'
					)}`
				)

				// Клонируем formData и обновляем дату
				const periodFormData = {
					...data.formData,
				}

				// Очищаем поле "Время АБН(дата/время)" если оно есть,
				// так как оно не должно копироваться из исходной заявки
				// (это поле должно заполняться отдельно, не из периодических заявок)
				if (data.abnTimeField && periodFormData[data.abnTimeField]) {
					delete periodFormData[data.abnTimeField!]
				}

				// Устанавливаем дату с временем или только дату
				if (hasTime && data.periodConfig.time) {
					// Объединяем дату и время в формат datetime для Bitrix24
					const dateStr = date.toISOString().split('T')[0] // "2025-10-30"
					const timeStr = data.periodConfig.time // "14:30"
					const dateTimeStr = `${dateStr} ${timeStr}:00` // "2025-10-30 14:30:00"

					periodFormData[data.periodConfig.dateFieldName] = dateTimeStr

					// Если timeFieldName отличается от dateFieldName, устанавливаем время отдельно
					if (data.periodConfig.timeFieldName &&
					    data.periodConfig.timeFieldName !== data.periodConfig.dateFieldName) {
						periodFormData[data.periodConfig.timeFieldName] = data.periodConfig.time
					}
				} else {
					// Только дата без времени
					periodFormData[data.periodConfig.dateFieldName] = date.toISOString().split('T')[0]
				}

				// Логируем periodFormData перед созданием scheduled submission
				console.log(`[PERIOD_SERVICE] periodFormData для заявки ${position}/${totalDays}:`, {
					periodFormDataKeys: Object.keys(periodFormData).length,
					periodFormDataSample: Object.fromEntries(Object.entries(periodFormData).slice(0, 5)),
					fullPeriodFormData: JSON.stringify(periodFormData),
				})

				// Создаем запланированную заявку
				const scheduledSubmission = queryRunner.manager.create(ScheduledSubmission, {
					id: uuidv4(),
					periodGroupId: periodGroup.id,
					formId: data.formId,
					formData: periodFormData,
					scheduledDate: date,
					scheduledTime: data.periodConfig.time, // Время отправки, если указано
					assignedToId: assignedToId, // Ответственный
					status: ScheduledSubmissionStatus.PENDING,
					attempts: 0,
					// Метаданные периода
					periodPosition: position,
					totalInPeriod: totalDays,
					periodStartDate: startDate,
					periodEndDate: endDate,
					// Денормализованные данные
					userId: data.userId,
					userName: data.userName,
					userEmail: data.userEmail,
					formName: form.name,
					formTitle: form.title,
					priority: data.priority || SubmissionPriority.MEDIUM,
				})

				await queryRunner.manager.save(scheduledSubmission)
				scheduledSubmissions.push(scheduledSubmission)

				console.log(
					`[PERIOD_SERVICE] Запланированная заявка ${position}/${totalDays} создана для даты ${date.toLocaleDateString(
						'ru-RU'
					)}`
				)
			}

			// Коммитим транзакцию
			await queryRunner.commitTransaction()

			console.log(
				`[PERIOD_SERVICE] ✅ Успешно создано ${scheduledSubmissions.length} запланированных заявок для периода ${periodGroup.id}`
			)

			// Добавляем ВСЕ задачи в очередь для немедленной обработки
			// Заявки будут созданы в Bitrix24 сразу с сохранением информации о запланированной дате
			const queueService = getSubmissionQueueService()

			console.log(
				`[PERIOD_SERVICE] Добавление всех ${scheduledSubmissions.length} заявок в очередь для немедленной обработки...`
			)

			for (const scheduled of scheduledSubmissions) {
				const scheduledDate = new Date(scheduled.scheduledDate)
				scheduledDate.setHours(0, 0, 0, 0)

				try {
					await queueService.addCreateSubmissionJob({
						type: SubmissionJobType.CREATE_SCHEDULED,
						scheduledSubmissionId: scheduled.id,
						formId: scheduled.formId,
						formData: scheduled.formData,
						userId: scheduled.userId,
						userName: scheduled.userName,
						userEmail: scheduled.userEmail,
						assignedToId: scheduled.assignedToId,
						priority: scheduled.priority,
						metadata: {
							periodGroupId: scheduled.periodGroupId,
							periodPosition: scheduled.periodPosition,
							totalInPeriod: scheduled.totalInPeriod,
							scheduledDate: scheduled.scheduledDate.toISOString(),
							scheduledTime: scheduled.scheduledTime,
						},
					})

					console.log(
						`[PERIOD_SERVICE] Заявка ${scheduled.periodPosition}/${scheduled.totalInPeriod} на дату ${scheduledDate.toLocaleDateString('ru-RU')} добавлена в очередь`
					)
				} catch (error) {
					console.error(
						`[PERIOD_SERVICE] Ошибка добавления заявки в очередь:`,
						error
					)
				}
			}

			console.log(
				`[PERIOD_SERVICE] ✅ Все ${scheduledSubmissions.length} заявок добавлены в очередь для обработки`
			)

			return {
				periodGroupId: periodGroup.id,
				scheduledSubmissions: scheduledSubmissions.map(s => ({
					id: s.id,
					scheduledDate: s.scheduledDate,
					periodPosition: s.periodPosition || 0,
				})),
				totalScheduled: scheduledSubmissions.length,
				period: {
					startDate,
					endDate,
					daysCount: totalDays,
				},
			}
		} catch (error: any) {
			// Откатываем транзакцию при ошибке
			await queryRunner.rollbackTransaction()
			console.error(
				'[PERIOD_SERVICE] ❌ Ошибка создания периодических заявок:',
				error
			)

			// TODO: Реализовать компенсационные транзакции для удаления сделок в Bitrix24
			// которые были созданы до ошибки

			throw error
		} finally {
			await queryRunner.release()
		}
	}

	/**
	 * Получает информацию о группе периода
	 */
	async getPeriodGroup(
		periodGroupId: string
	): Promise<SubmissionPeriodGroup | null> {
		return this.periodGroupRepository.findByIdWithSubmissions(periodGroupId)
	}

	/**
	 * Получает все заявки периода
	 */
	async getPeriodSubmissions(periodGroupId: string): Promise<Submission[]> {
		const group = await this.periodGroupRepository.findByIdWithSubmissions(
			periodGroupId
		)
		return group?.submissions || []
	}

	/**
	 * Отменяет все заявки периода
	 */
	async cancelPeriodGroup(
		periodGroupId: string,
		userId?: string
	): Promise<void> {
		const group = await this.periodGroupRepository.findByIdWithSubmissions(
			periodGroupId
		)

		if (!group) {
			throw new Error('Группа периода не найдена')
		}

		if (group.status === PeriodGroupStatus.CANCELLED) {
			throw new Error('Группа периода уже отменена')
		}

		// Отменяем все заявки
		if (group.submissions && group.submissions.length > 0) {
			for (const submission of group.submissions) {
				try {
					// Обновляем статус заявки
					await this.submissionService.updateStatus(
						submission.id,
						'C1:LOSE',
						userId
					)

					// Синхронизируем с Bitrix24
					if (submission.bitrixDealId) {
						try {
							await bitrix24Service.updateDealStatus(
								submission.bitrixDealId,
								'C1:LOSE',
								submission.bitrixCategoryId || '1'
							)
						} catch (bitrixError) {
							console.warn(
								`[PERIOD_SERVICE] Ошибка синхронизации отмены с Bitrix24 для заявки ${submission.id}`
							)
						}
					}

					await this.submissionService.addComment(
						submission.id,
						'Заявка отменена вместе с периодом',
						userId
					)
				} catch (error) {
					console.error(
						`[PERIOD_SERVICE] Ошибка отмены заявки ${submission.id}:`,
						error
					)
				}
			}
		}

		// Обновляем статус группы
		await this.periodGroupRepository.updateStatus(
			periodGroupId,
			PeriodGroupStatus.CANCELLED
		)

		console.log(
			`[PERIOD_SERVICE] ✅ Группа периода ${periodGroupId} успешно отменена`
		)
	}

	/**
	 * Обновляет все заявки периода (кроме даты доставки)
	 */
	async updatePeriodSubmissions(
		periodGroupId: string,
		updates: Partial<Record<string, any>>,
		userId?: string
	): Promise<void> {
		const group = await this.periodGroupRepository.findByIdWithSubmissions(
			periodGroupId
		)

		if (!group) {
			throw new Error('Группа периода не найдена')
		}

		if (group.status !== PeriodGroupStatus.ACTIVE) {
			throw new Error('Можно обновлять только активные группы периодов')
		}

		// Исключаем поле с датой из обновления
		const { [group.dateFieldName]: _, ...safeUpdates } = updates

		if (group.submissions && group.submissions.length > 0) {
			for (const submission of group.submissions) {
				try {
					// Обновляем заявку
					await this.submissionService.updateSubmission(
						submission.id,
						{
							formData: {
								...submission.formData,
								...safeUpdates,
							},
						},
						userId
					)

					console.log(
						`[PERIOD_SERVICE] Заявка ${submission.submissionNumber} обновлена`
					)
				} catch (error) {
					console.error(
						`[PERIOD_SERVICE] Ошибка обновления заявки ${submission.id}:`,
						error
					)
				}
			}
		}

		console.log(
			`[PERIOD_SERVICE] ✅ Группа периода ${periodGroupId} успешно обновлена`
		)
	}
}

// Синглтон сервиса
let periodSubmissionService: PeriodSubmissionService | null = null

export const getPeriodSubmissionService = (): PeriodSubmissionService => {
	if (!periodSubmissionService) {
		periodSubmissionService = new PeriodSubmissionService()
	}
	return periodSubmissionService
}
