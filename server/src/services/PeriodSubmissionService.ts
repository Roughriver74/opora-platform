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
import { getSubmissionPeriodGroupRepository } from '../database/repositories/SubmissionPeriodGroupRepository'
import { getSubmissionService } from './SubmissionService'
import { getFormService } from './FormService'
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
	}
	userId?: string
	userName?: string
	userEmail?: string
	priority?: SubmissionPriority
}

/**
 * Результат создания периодических заявок
 */
export interface PeriodSubmissionsResult {
	periodGroupId: string
	submissions: Submission[]
	bitrixDealIds: string[]
	totalCreated: number
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

			console.log(
				`[PERIOD_SERVICE] Создание ${totalDays} заявок на период ${startDate.toLocaleDateString(
					'ru-RU'
				)} - ${endDate.toLocaleDateString('ru-RU')}`
			)

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

			// Массивы для хранения результатов
			const createdSubmissions: Submission[] = []
			const bitrixDealIds: string[] = []
			const failedCreations: Array<{ date: Date; error: string }> = []

			// Создаем заявки для каждой даты
			for (let i = 0; i < dates.length; i++) {
				const date = dates[i]
				const position = i + 1

				try {
					console.log(
						`[PERIOD_SERVICE] Создание заявки ${position}/${totalDays} на дату ${date.toLocaleDateString(
							'ru-RU'
						)}`
					)

					// Клонируем formData и обновляем дату
					const periodFormData = {
						...data.formData,
						[data.periodConfig.dateFieldName]: date.toISOString().split('T')[0],
					}

					// Подготавливаем данные для Bitrix24
					const dealData: Record<string, any> = {}
					let dealTitle = `Заявка ${date.toLocaleDateString('ru-RU')}`

					for (const field of form.fields) {
						if (
							periodFormData[field.name] !== undefined &&
							field.bitrixFieldId
						) {
							const value = periodFormData[field.name]
							dealData[field.bitrixFieldId] = value
							if (field.bitrixFieldId === 'TITLE' && value) {
								dealTitle = value
							}
						}
					}

					dealData.TITLE = dealTitle
					dealData.STAGE_ID = 'C1:NEW'
					dealData.CATEGORY_ID = form.bitrixDealCategory || '1'

					// Создаем сделку в Bitrix24
					const dealResponse = await bitrix24Service.createDeal(dealData)
					const bitrixDealId = dealResponse.result?.toString?.()

					if (!bitrixDealId) {
						throw new Error('Не удалось получить ID сделки из Bitrix24')
					}

					console.log(
						`[PERIOD_SERVICE] Сделка Bitrix24 создана: ${bitrixDealId}`
					)
					bitrixDealIds.push(bitrixDealId)

					// Создаем заявку в БД
					const submission = queryRunner.manager.create(Submission, {
						id: uuidv4(),
						formId: data.formId,
						userId: data.userId,
						title: dealTitle,
						status: 'C1:NEW',
						priority: data.priority || SubmissionPriority.MEDIUM,
						bitrixDealId,
						bitrixSyncStatus: BitrixSyncStatus.SYNCED,
						formData: periodFormData,
						userEmail: data.userEmail,
						userName: data.userName,
						formName: form.name,
						formTitle: form.title,
						// Поля периода
						isPeriodSubmission: true,
						periodGroupId: periodGroup.id,
						periodStartDate: startDate,
						periodEndDate: endDate,
						periodPosition: position,
						totalInPeriod: totalDays,
					})

					// Генерируем submissionNumber вручную для периодических заявок
					await submission.generateSubmissionNumber()

					// Сохраняем с обработкой ошибок дублирования
					try {
						await queryRunner.manager.save(submission)
					} catch (saveError: any) {
						if (
							saveError.code === '23505' &&
							saveError.constraint?.includes('submission_number')
						) {
							// Ошибка дублирования submissionNumber - генерируем новый номер
							console.warn(
								`[PERIOD_SERVICE] Конфликт номера заявки, генерируем новый: ${submission.submissionNumber}`
							)
							await submission.generateSubmissionNumber()
							await queryRunner.manager.save(submission)
						} else {
							throw saveError
						}
					}

					// Обновляем Bitrix24 с ID заявки
					try {
						await bitrix24Service.updateDeal(bitrixDealId, {
							UF_CRM_1750107484181: submission.id,
						})
					} catch (updateError) {
						console.warn(
							`[PERIOD_SERVICE] Не удалось обновить поле UF_CRM_1750107484181 для сделки ${bitrixDealId}`
						)
					}

					createdSubmissions.push(submission)
					console.log(
						`[PERIOD_SERVICE] Заявка ${position}/${totalDays} создана: ${submission.submissionNumber}`
					)
				} catch (error: any) {
					console.error(
						`[PERIOD_SERVICE] Ошибка создания заявки на дату ${date.toLocaleDateString(
							'ru-RU'
						)}:`,
						error.message
					)
					failedCreations.push({
						date,
						error: error.message,
					})

					// Если не удалось создать хотя бы одну заявку - откатываем всю транзакцию
					throw new Error(
						`Ошибка создания заявки на дату ${date.toLocaleDateString(
							'ru-RU'
						)}: ${error.message}`
					)
				}
			}

			// Коммитим транзакцию
			await queryRunner.commitTransaction()

			console.log(
				`[PERIOD_SERVICE] ✅ Успешно создано ${createdSubmissions.length} заявок для периода ${periodGroup.id}`
			)

			return {
				periodGroupId: periodGroup.id,
				submissions: createdSubmissions,
				bitrixDealIds,
				totalCreated: createdSubmissions.length,
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
