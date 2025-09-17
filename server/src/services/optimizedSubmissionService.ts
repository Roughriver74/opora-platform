import { AppDataSource } from '../database/config/database.config'
import { Submission } from '../database/entities/Submission.entity'
import { User } from '../database/entities/User.entity'
import { Form } from '../database/entities/Form.entity'
import { SelectQueryBuilder } from 'typeorm'

export interface SubmissionFilters {
	status?: string | string[]
	priority?: string | string[]
	assignedTo?: string
	userId?: string
	dateFrom?: string
	dateTo?: string
	search?: string
	tags?: string[]
	formId?: string
	bitrixSyncStatus?: string
}

export interface PaginationOptions {
	page: number
	limit: number
	sortBy?: string
	sortOrder?: 'asc' | 'desc'
}

/**
 * Оптимизированный сервис для работы с заявками
 * Использует денормализованные данные вместо joins для лучшей производительности
 */
export class OptimizedSubmissionService {
	private submissionRepository = AppDataSource.getRepository(Submission)

	/**
	 * Получение заявок с оптимизированными запросами
	 */
	async getSubmissions(
		filters: SubmissionFilters = {},
		pagination: PaginationOptions
	) {
		const queryBuilder =
			this.submissionRepository.createQueryBuilder('submission')

		// Построение фильтров с использованием индексов
		if (filters.status) {
			if (Array.isArray(filters.status)) {
				queryBuilder.andWhere('submission.status IN (:...statuses)', {
					statuses: filters.status,
				})
			} else {
				queryBuilder.andWhere('submission.status = :status', {
					status: filters.status,
				})
			}
		}

		if (filters.priority) {
			if (Array.isArray(filters.priority)) {
				queryBuilder.andWhere('submission.priority IN (:...priorities)', {
					priorities: filters.priority,
				})
			} else {
				queryBuilder.andWhere('submission.priority = :priority', {
					priority: filters.priority,
				})
			}
		}

		if (filters.assignedTo) {
			queryBuilder.andWhere('submission.assignedToId = :assignedTo', {
				assignedTo: filters.assignedTo,
			})
		}

		if (filters.userId) {
			queryBuilder.andWhere('submission.userId = :userId', {
				userId: filters.userId,
			})
		}

		if (filters.formId) {
			queryBuilder.andWhere('submission.formId = :formId', {
				formId: filters.formId,
			})
		}

		if (filters.bitrixSyncStatus) {
			queryBuilder.andWhere('submission.bitrixSyncStatus = :bitrixSyncStatus', {
				bitrixSyncStatus: filters.bitrixSyncStatus,
			})
		}

		if (filters.tags && filters.tags.length > 0) {
			queryBuilder.andWhere('submission.tags && ARRAY[:...tags]', {
				tags: filters.tags,
			})
		}

		// Фильтр по дате (использует индекс createdAt)
		if (filters.dateFrom) {
			queryBuilder.andWhere('submission.createdAt >= :dateFrom', {
				dateFrom: new Date(filters.dateFrom),
			})
		}
		if (filters.dateTo) {
			queryBuilder.andWhere('submission.createdAt <= :dateTo', {
				dateTo: new Date(filters.dateTo),
			})
		}

		// Поиск по тексту в денормализованных полях (используем PostgreSQL full-text search)
		if (filters.search) {
			queryBuilder.andWhere(
				`(
				submission.title ILIKE :search OR 
				submission.submissionNumber ILIKE :search OR
				submission.userEmail ILIKE :search OR
				submission.userName ILIKE :search OR
				submission.formName ILIKE :search OR
				submission.formTitle ILIKE :search OR
				submission.assignedToName ILIKE :search OR
				submission.notes ILIKE :search
			)`,
				{ search: `%${filters.search}%` }
			)
		}

		// Подсчет общего количества
		const total = await queryBuilder.getCount()

		// Построение запроса с пагинацией
		const { page, limit, sortBy = 'createdAt', sortOrder = 'desc' } = pagination
		const skip = (page - 1) * limit

		// Применяем сортировку
		queryBuilder.orderBy(
			`submission.${sortBy}`,
			sortOrder.toUpperCase() as 'ASC' | 'DESC'
		)

		// Применяем пагинацию
		queryBuilder.skip(skip).take(limit)

		// Выбираем только нужные поля для уменьшения объема данных
		queryBuilder.select([
			'submission.id',
			'submission.submissionNumber',
			'submission.title',
			'submission.status',
			'submission.priority',
			'submission.bitrixDealId',
			'submission.bitrixSyncStatus',
			'submission.createdAt',
			'submission.updatedAt',
			'submission.notes',
			'submission.tags',
			// Денормализованные поля (без joins!)
			'submission.formName',
			'submission.formTitle',
			'submission.userEmail',
			'submission.userName',
			'submission.assignedToName',
			// Предвычисленные поля
			'submission.processingTimeMinutes',
			'submission.dayOfWeek',
			'submission.monthOfYear',
			// Данные формы
			'submission.formData',
		])

		// Выполнение оптимизированного запроса
		const submissions = await queryBuilder.getMany()

		return {
			data: submissions,
			pagination: {
				page,
				limit,
				total,
				pages: Math.ceil(total / limit),
				hasNext: page < Math.ceil(total / limit),
				hasPrev: page > 1,
			},
			performance: {
				denormalized: true, // Подтверждаем использование денормализованных данных
				optimizedQueries: true,
				usesFTS: !!filters.search, // Full-text search
			},
		}
	}

	/**
	 * Получение заявок пользователя (оптимизированная версия)
	 */
	async getUserSubmissions(
		userId: string,
		filters: SubmissionFilters = {},
		pagination: PaginationOptions
	) {
		// Добавляем фильтр по пользователю
		const userFilters = { ...filters, userId }
		return this.getSubmissions(userFilters, pagination)
	}

	/**
	 * Статистика по заявкам (используя денормализованные поля)
	 */
	async getSubmissionStats(filters: SubmissionFilters = {}) {
		const baseQuery = this.submissionRepository.createQueryBuilder('submission')

		// Применяем те же фильтры что и в getSubmissions
		this.applyFilters(baseQuery, filters)

		const [
			totalCount,
			statusStats,
			priorityStats,
			monthlyStats,
			formStats,
			managerStats,
			userStats,
			dayOfWeekStats,
		] = await Promise.all([
			baseQuery.getCount(),

			// Статистика по статусам
			baseQuery
				.clone()
				.select('submission.status', 'status')
				.addSelect('COUNT(*)', 'count')
				.groupBy('submission.status')
				.getRawMany(),

			// Статистика по приоритетам
			baseQuery
				.clone()
				.select('submission.priority', 'priority')
				.addSelect('COUNT(*)', 'count')
				.groupBy('submission.priority')
				.getRawMany(),

			// Статистика по месяцам (используя предвычисленное поле)
			baseQuery
				.clone()
				.select('submission.monthOfYear', 'month')
				.addSelect('COUNT(*)', 'count')
				.groupBy('submission.monthOfYear')
				.orderBy('submission.monthOfYear', 'ASC')
				.getRawMany(),

			// Статистика по формам
			baseQuery
				.clone()
				.select('submission.formName', 'name')
				.addSelect('submission.formId', 'id')
				.addSelect('COUNT(*)', 'count')
				.where('submission.formName IS NOT NULL')
				.groupBy('submission.formId, submission.formName')
				.orderBy('COUNT(*)', 'DESC')
				.getRawMany(),

			// Статистика по менеджерам
			baseQuery
				.clone()
				.select('submission.assignedToName', 'name')
				.addSelect('submission.assignedToId', 'id')
				.addSelect('COUNT(*)', 'count')
				.where('submission.assignedToName IS NOT NULL')
				.groupBy('submission.assignedToId, submission.assignedToName')
				.orderBy('COUNT(*)', 'DESC')
				.getRawMany(),

			// Статистика по пользователям
			baseQuery
				.clone()
				.select('submission.userName', 'name')
				.addSelect('submission.userId', 'id')
				.addSelect('COUNT(*)', 'count')
				.where('submission.userName IS NOT NULL')
				.groupBy('submission.userId, submission.userName')
				.orderBy('COUNT(*)', 'DESC')
				.getRawMany(),

			// Статистика по дням недели
			baseQuery
				.clone()
				.select('submission.dayOfWeek', 'day')
				.addSelect('COUNT(*)', 'count')
				.groupBy('submission.dayOfWeek')
				.orderBy('submission.dayOfWeek', 'ASC')
				.getRawMany(),
		])

		// Получаем данные о товарах, клиентах и пользователях из formData
		const [
			productStats,
			clientStats,
			userStatsFromFormData,
			avgProcessingTime,
		] = await Promise.all([
			this.getProductStats(filters),
			this.getClientStats(filters),
			this.getUserStats(filters),
			this.calculateAverageProcessingTime(filters),
		])

		return {
			total: totalCount,
			byStatus: statusStats,
			byPriority: priorityStats,
			byMonth: monthlyStats,
			byForm: formStats,
			byAssignedTo: managerStats,
			byUser: userStatsFromFormData, // Используем данные из formData
			byDayOfWeek: dayOfWeekStats,
			byProducts: productStats,
			byClients: clientStats,
			averageProcessingTime: avgProcessingTime,
			performance: {
				denormalized: true,
				precomputedFields: true,
			},
		}
	}

	/**
	 * Получение статистики по товарам из formData с использованием Elasticsearch
	 */
	private async getProductStats(filters: SubmissionFilters = {}) {
		const baseQuery = this.submissionRepository.createQueryBuilder('submission')
		this.applyFilters(baseQuery, filters)

		// Получаем все заявки с formData
		const submissions = await baseQuery
			.select(['submission.formData'])
			.getMany()

		const productCounts = new Map<string, number>()

		// Получаем список полей с товарами из form_fields
		const productFields = await this.getProductFieldsFromDatabase()

		// Анализируем formData для поиска товаров
		for (const submission of submissions) {
			if (submission.formData) {
				// Ищем только поля, которые точно содержат товары
				for (const [key, value] of Object.entries(submission.formData)) {
					if (value && typeof value === 'string' && productFields.has(key)) {
						const productId = value.trim()
						if (productId) {
							// Получаем название товара из Elasticsearch
							const productName = await this.getProductNameFromElasticsearch(
								productId
							)
							const displayName = productName || productId

							productCounts.set(
								displayName,
								(productCounts.get(displayName) || 0) + 1
							)
						}
					}
				}
			}
		}

		// Преобразуем в массив и сортируем
		return Array.from(productCounts.entries())
			.map(([name, count]) => ({ name, count: count.toString() }))
			.sort((a, b) => parseInt(b.count) - parseInt(a.count))
			.slice(0, 10) // Топ 10 товаров
	}

	/**
	 * Получение статистики по пользователям (авторам заявок)
	 */
	private async getUserStats(filters: SubmissionFilters = {}) {
		const baseQuery = this.submissionRepository.createQueryBuilder('submission')
		this.applyFilters(baseQuery, filters)

		// Получаем статистику по авторам заявок из денормализованных полей и связей
		const userStats = await baseQuery
			.leftJoin('submission.user', 'user')
			.select([
				"COALESCE(submission.user_name, user.first_name || ' ' || user.last_name, user.email, 'Неизвестный пользователь') as \"userName\"",
				'COUNT(*) as count',
			])
			.groupBy('"userName"')
			.orderBy('count', 'DESC')
			.limit(10)
			.getRawMany()

		// Преобразуем результат в нужный формат
		return userStats.map(item => ({
			name: item.userName || 'Неизвестный пользователь',
			count: item.count.toString(),
		}))
	}

	/**
	 * Получение статистики по клиентам из поля field_1750266840204 с использованием Elasticsearch
	 */
	private async getClientStats(filters: SubmissionFilters = {}) {
		const baseQuery = this.submissionRepository.createQueryBuilder('submission')
		this.applyFilters(baseQuery, filters)

		// Получаем все заявки с formData
		const submissions = await baseQuery
			.select(['submission.formData'])
			.getMany()

		const clientCounts = new Map<string, number>()

		// Анализируем formData для поиска клиентов
		for (const submission of submissions) {
			if (submission.formData) {
				// Ищем поле field_1750266840204
				const clientValue = submission.formData['field_1750266840204']
				if (clientValue && typeof clientValue === 'string') {
					const clientId = clientValue.trim()
					if (clientId) {
						// Получаем название клиента из Elasticsearch
						const clientName = await this.getClientNameFromElasticsearch(
							clientId
						)
						const displayName = clientName || clientId

						clientCounts.set(
							displayName,
							(clientCounts.get(displayName) || 0) + 1
						)
					}
				}
			}
		}

		// Преобразуем в массив и сортируем
		return Array.from(clientCounts.entries())
			.map(([name, count]) => ({ name, count: count.toString() }))
			.sort((a, b) => parseInt(b.count) - parseInt(a.count))
			.slice(0, 10) // Топ 10 клиентов
	}

	/**
	 * Расчет среднего времени обработки (от создания до стадии отгружено или отменено)
	 */
	private async calculateAverageProcessingTime(
		filters: SubmissionFilters = {}
	) {
		const baseQuery = this.submissionRepository.createQueryBuilder('submission')
		this.applyFilters(baseQuery, filters)

		// Получаем заявки, которые завершены (отгружены) или отменены
		const completedSubmissions = await baseQuery
			.clone()
			.where('submission.status IN (:...statuses)', {
				statuses: ['C1:WON', 'C1:LOSE', 'C1%3LOSE'], // Отгружено, Отменено, Отменено (другой код)
			})
			.select([
				'submission.createdAt',
				'submission.updatedAt',
				'submission.status',
			])
			.getMany()

		if (completedSubmissions.length === 0) {
			return 0
		}

		// Рассчитываем время обработки для каждой заявки
		let totalProcessingTime = 0
		let validSubmissions = 0

		for (const submission of completedSubmissions) {
			const processingTime =
				submission.updatedAt.getTime() - submission.createdAt.getTime()
			const processingTimeMinutes = Math.round(processingTime / (1000 * 60)) // В минутах

			// Исключаем заявки с отрицательным временем (ошибки в данных)
			if (processingTimeMinutes > 0) {
				totalProcessingTime += processingTimeMinutes
				validSubmissions++
			}
		}

		return validSubmissions > 0
			? Math.round(totalProcessingTime / validSubmissions)
			: 0
	}

	/**
	 * Получение списка полей с товарами из form_fields
	 */
	private async getProductFieldsFromDatabase(): Promise<Set<string>> {
		try {
			// Используем прямой SQL запрос для получения полей с товарами
			const result = await AppDataSource.query(`
				SELECT name 
				FROM form_fields 
				WHERE type = 'autocomplete' 
				AND (
					label ILIKE '%бетон%' OR 
					label ILIKE '%цемент%' OR 
					label ILIKE '%раствор%' OR 
					label ILIKE '%цпс%' OR 
					label ILIKE '%пмд%'
				)
			`)

			return new Set(result.map((row: any) => row.name))
		} catch (error) {
			console.error('Ошибка получения полей с товарами:', error)
			return new Set()
		}
	}

	/**
	 * Получение названия товара из Elasticsearch по ID
	 */
	private async getProductNameFromElasticsearch(
		productId: string
	): Promise<string | null> {
		try {
			const { elasticsearchService } = await import(
				'../services/elasticsearchService'
			)

			// Ищем товар по ID
			const searchResult = await elasticsearchService.search({
				query: productId,
				type: 'product',
				limit: 1,
			})

			if (searchResult && searchResult.length > 0) {
				const product = searchResult[0]
				return product.name || null
			}
		} catch (error) {
			console.error('Ошибка поиска товара в Elasticsearch:', error)
		}
		return null
	}

	/**
	 * Получение названия клиента из Elasticsearch по ID
	 */
	private async getClientNameFromElasticsearch(
		clientId: string
	): Promise<string | null> {
		try {
			const { elasticsearchService } = await import(
				'../services/elasticsearchService'
			)

			// Ищем клиента по bitrixId (может быть company или contact)
			const searchResult = await elasticsearchService.search({
				query: clientId,
				type: 'company', // Сначала ищем в компаниях
				limit: 1,
			})

			if (searchResult && searchResult.length > 0) {
				const client = searchResult[0]
				// Проверяем, что это правильный клиент по bitrixId
				if (client.bitrixId === clientId) {
					return client.name || null
				}
			}

			// Если не найден в компаниях, ищем в контактах
			const contactResult = await elasticsearchService.search({
				query: clientId,
				type: 'contact',
				limit: 1,
			})

			if (contactResult && contactResult.length > 0) {
				const client = contactResult[0]
				if (client.bitrixId === clientId) {
					return client.name || null
				}
			}
		} catch (error) {
			console.error('Ошибка поиска клиента в Elasticsearch:', error)
		}
		return null
	}

	/**
	 * Проверяет, является ли поле товаром
	 */
	private isProductField(fieldName: string, value: string): boolean {
		const productKeywords = [
			'товар',
			'product',
			'материал',
			'material',
			'бетон',
			'цемент',
			'раствор',
			'песок',
			'щебень',
			'арматура',
			'кирпич',
			'блок',
		]

		const fieldNameLower = fieldName.toLowerCase()
		const valueLower = value.toLowerCase()

		// Проверяем по названию поля
		for (const keyword of productKeywords) {
			if (fieldNameLower.includes(keyword)) {
				return true
			}
		}

		// Проверяем по значению (если содержит марки бетона, например М300, М400)
		if (
			/м[0-9]+/i.test(value) ||
			/бетон/i.test(value) ||
			/цемент/i.test(value)
		) {
			return true
		}

		return false
	}

	/**
	 * Извлекает название товара из значения поля
	 */
	private extractProductName(value: string): string | null {
		// Очищаем значение от лишних символов
		let productName = value.trim()

		// Если это марка бетона (М300, М400 и т.д.)
		const concreteMatch = productName.match(/м[0-9]+/i)
		if (concreteMatch) {
			return concreteMatch[0].toUpperCase()
		}

		// Если содержит слово "бетон" или "цемент"
		if (/бетон/i.test(productName)) {
			return 'Бетон'
		}
		if (/цемент/i.test(productName)) {
			return 'Цемент'
		}

		// Возвращаем очищенное название
		return productName.length > 0 ? productName : null
	}

	/**
	 * Вспомогательный метод для применения фильтров
	 */
	private applyFilters(
		queryBuilder: SelectQueryBuilder<Submission>,
		filters: SubmissionFilters
	) {
		if (filters.status) {
			if (Array.isArray(filters.status)) {
				queryBuilder.andWhere('submission.status IN (:...statuses)', {
					statuses: filters.status,
				})
			} else {
				queryBuilder.andWhere('submission.status = :status', {
					status: filters.status,
				})
			}
		}

		if (filters.priority) {
			if (Array.isArray(filters.priority)) {
				queryBuilder.andWhere('submission.priority IN (:...priorities)', {
					priorities: filters.priority,
				})
			} else {
				queryBuilder.andWhere('submission.priority = :priority', {
					priority: filters.priority,
				})
			}
		}

		if (filters.userId) {
			queryBuilder.andWhere('submission.userId = :userId', {
				userId: filters.userId,
			})
		}

		if (filters.formId) {
			queryBuilder.andWhere('submission.formId = :formId', {
				formId: filters.formId,
			})
		}

		if (filters.dateFrom) {
			queryBuilder.andWhere('submission.createdAt >= :dateFrom', {
				dateFrom: new Date(filters.dateFrom),
			})
		}

		if (filters.dateTo) {
			queryBuilder.andWhere('submission.createdAt <= :dateTo', {
				dateTo: new Date(filters.dateTo),
			})
		}

		if (filters.search) {
			queryBuilder.andWhere(
				`(
				submission.title ILIKE :search OR 
				submission.submissionNumber ILIKE :search OR
				submission.userEmail ILIKE :search OR
				submission.userName ILIKE :search OR
				submission.formName ILIKE :search OR
				submission.formTitle ILIKE :search OR
				submission.assignedToName ILIKE :search OR
				submission.notes ILIKE :search
			)`,
				{ search: `%${filters.search}%` }
			)
		}
	}

	/**
	 * Обновление денормализованных данных для заявок
	 */
	async updateDenormalizedData(submissionIds?: string[]): Promise<number> {
		const queryBuilder = this.submissionRepository
			.createQueryBuilder('submission')
			.leftJoin('submission.user', 'user')
			.leftJoin('submission.form', 'form')
			.leftJoin('submission.assignedTo', 'assignedTo')

		if (submissionIds && submissionIds.length > 0) {
			queryBuilder.where('submission.id IN (:...ids)', { ids: submissionIds })
		}

		const submissions = await queryBuilder
			.select([
				'submission.id',
				'user.email',
				'user.firstName',
				'user.lastName',
				'form.name',
				'form.title',
				'assignedTo.firstName',
				'assignedTo.lastName',
			])
			.getMany()

		let updatedCount = 0

		for (const submission of submissions) {
			const userName = submission.user
				? `${submission.user.firstName || ''} ${
						submission.user.lastName || ''
				  }`.trim()
				: undefined

			const assignedToName = submission.assignedTo
				? `${submission.assignedTo.firstName || ''} ${
						submission.assignedTo.lastName || ''
				  }`.trim()
				: undefined

			await this.submissionRepository.update(submission.id, {
				userEmail: submission.user?.email,
				userName: userName,
				formName: submission.form?.name,
				formTitle: submission.form?.title,
				assignedToName: assignedToName,
			})
			updatedCount++
		}

		return updatedCount
	}
}

// Экспорт единственного экземпляра для использования
export const optimizedSubmissionService = new OptimizedSubmissionService()
