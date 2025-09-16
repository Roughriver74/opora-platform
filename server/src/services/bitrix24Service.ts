import axios from 'axios'
import config from '../config/config'
import { bitrixCache } from './cacheService'
import { logger } from '../utils/logger'

const MAX_RETRIES = 3
const RETRY_DELAY = 1000

const retryRequest = async <T>(
	requestFn: () => Promise<T>,
	maxRetries: number = MAX_RETRIES,
	delay: number = RETRY_DELAY
): Promise<T> => {
	let lastError: any
	for (let attempt = 1; attempt <= maxRetries; attempt++) {
		try {
			return await requestFn()
		} catch (error: any) {
			lastError = error
			const transient =
				error.code?.includes?.('ECONNABORTED') ||
				error.code?.includes?.('ENOTFOUND') ||
				error.code?.includes?.('ECONNRESET') ||
				[500, 502, 503, 504].includes(error.response?.status)
			if (attempt === maxRetries || !transient) throw error
			await new Promise(resolve => setTimeout(resolve, delay * attempt))
		}
	}
	throw lastError
}

class Bitrix24Service {
	private webhookUrl: string

	constructor() {
		this.webhookUrl = config.bitrix24WebhookUrl
		this.validateConfiguration()
	}

	private validateConfiguration() {
		if (!this.webhookUrl) {
			throw new Error('BITRIX24_WEBHOOK_URL не настроен в переменных окружения')
		}
		try {
			const url = new URL(this.webhookUrl)
			if (!url.protocol.startsWith('http')) {
				throw new Error(
					'Bitrix24 webhook URL должен начинаться с http:// или https://'
				)
			}
		} catch (error: any) {
			throw new Error(`Неверный формат Bitrix24 webhook URL: ${error.message}`)
		}
	}

	// Deals: fields and creation
	async getDealFields() {
		const response = await retryRequest(() =>
			axios.post(`${this.webhookUrl}crm.deal.fields`, {}, { timeout: 15000 })
		)
		return response.data
	}

	async createDeal(dealData: any) {
		const response = await axios.post(`${this.webhookUrl}crm.deal.add`, {
			fields: dealData,
			params: { REGISTER_SONET_EVENT: 'Y' },
		})
		return response.data
	}

	async updateDeal(dealId: string, dealData: any) {
		const response = await axios.post(`${this.webhookUrl}crm.deal.update`, {
			id: dealId,
			fields: dealData,
		})
		return response.data
	}

	async updateDealStatus(
		dealId: string,
		newStatus: string,
		_categoryId?: string
	) {
		const response = await axios.post(`${this.webhookUrl}crm.deal.update`, {
			id: dealId,
			fields: { STAGE_ID: newStatus },
		})
		return response.data
	}

	async getDeal(dealId: string) {
		const response = await axios.post(`${this.webhookUrl}crm.deal.get`, {
			id: dealId,
		})
		return response.data
	}

	// Catalog: products, companies, contacts
	async getProducts(query = '', limit = 50) {
		const filterStr = query || 'all'
		const cached = await bitrixCache.getDynamicOptions('products', filterStr)
		if (cached) return { result: cached, total: cached.length }

		let results: any[] = []
		const trimmedQuery = query.trim()

		if (trimmedQuery) {
			// Стратегия 1: Поиск по ID (если запрос - число)
			const isNumericId = /^\d+$/.test(trimmedQuery)
			if (isNumericId) {
				const response = await axios.post(
					`${this.webhookUrl}crm.product.list`,
					{
						filter: { ID: trimmedQuery, ACTIVE: 'Y' },
						select: ['ID', 'NAME', 'PRICE', 'CURRENCY_ID', 'DESCRIPTION'],
						start: 0,
						limit: parseInt(limit.toString()),
						order: { NAME: 'ASC' },
					}
				)
				if (response.data?.result?.length > 0) {
					results = response.data.result
				}
			}

			// Стратегия 2: Точный поиск по названию (если не нашли по ID)
			if (results.length === 0) {
				const exactResponse = await axios.post(
					`${this.webhookUrl}crm.product.list`,
					{
						filter: { NAME: trimmedQuery, ACTIVE: 'Y' },
						select: ['ID', 'NAME', 'PRICE', 'CURRENCY_ID', 'DESCRIPTION'],
						start: 0,
						limit: parseInt(limit.toString()),
						order: { NAME: 'ASC' },
					}
				)
				if (exactResponse.data?.result?.length > 0) {
					results = exactResponse.data.result
				}
			}

			// Стратегия 3: Поиск по частичному совпадению в названии
			if (results.length === 0) {
				const partialResponse = await axios.post(
					`${this.webhookUrl}crm.product.list`,
					{
						filter: { NAME: `%${trimmedQuery}%`, ACTIVE: 'Y' },
						select: ['ID', 'NAME', 'PRICE', 'CURRENCY_ID', 'DESCRIPTION'],
						start: 0,
						limit: parseInt(limit.toString()),
						order: { NAME: 'ASC' },
					}
				)
				if (partialResponse.data?.result?.length > 0) {
					results = partialResponse.data.result
				}
			}

			// Стратегия 4: Поиск по описанию (если не нашли по названию)
			if (results.length === 0) {
				const descResponse = await axios.post(
					`${this.webhookUrl}crm.product.list`,
					{
						filter: { DESCRIPTION: `%${trimmedQuery}%`, ACTIVE: 'Y' },
						select: ['ID', 'NAME', 'PRICE', 'CURRENCY_ID', 'DESCRIPTION'],
						start: 0,
						limit: parseInt(limit.toString()),
						order: { NAME: 'ASC' },
					}
				)
				if (descResponse.data?.result?.length > 0) {
					results = descResponse.data.result
				}
			}

			// Стратегия 5: Нечеткий поиск - поиск по словам из запроса
			if (results.length === 0) {
				const words = trimmedQuery
					.toLowerCase()
					.split(/\s+/)
					.filter(word => word.length > 2)
				if (words.length > 0) {
					// Получаем все активные товары и фильтруем на клиенте
					const allResponse = await axios.post(
						`${this.webhookUrl}crm.product.list`,
						{
							filter: { ACTIVE: 'Y' },
							select: ['ID', 'NAME', 'PRICE', 'CURRENCY_ID', 'DESCRIPTION'],
							start: 0,
							limit: 200, // Больше лимит для нечеткого поиска
							order: { NAME: 'ASC' },
						}
					)

					if (allResponse.data?.result?.length > 0) {
						const fuzzyResults = allResponse.data.result.filter(
							(product: any) => {
								const searchText = `${product.NAME || ''} ${
									product.DESCRIPTION || ''
								}`.toLowerCase()
								return words.some(word => searchText.includes(word))
							}
						)
						results = fuzzyResults.slice(0, parseInt(limit.toString()))
					}
				}
			}
		} else {
			// Если запрос пустой, возвращаем все активные товары
			const response = await axios.post(`${this.webhookUrl}crm.product.list`, {
				filter: { ACTIVE: 'Y' },
				select: ['ID', 'NAME', 'PRICE', 'CURRENCY_ID', 'DESCRIPTION'],
				start: 0,
				limit: parseInt(limit.toString()),
				order: { NAME: 'ASC' },
			})
			results = response.data?.result || []
		}

		const responseData = { result: results, total: results.length }

		if (results.length > 0) {
			await bitrixCache.setDynamicOptions('products', results, filterStr)
		}

		return responseData
	}

	async getProduct(productId: string) {
		const response = await axios.post(`${this.webhookUrl}crm.product.get`, {
			id: productId,
		})
		return response.data
	}

	async getAllProducts(): Promise<any[]> {
		const allProducts: any[] = []
		let start = 0
		const limit = 50
		let hasMore = true

		while (hasMore) {
			const response = await axios.post(`${this.webhookUrl}crm.product.list`, {
				filter: { ACTIVE: 'Y' },
				select: ['ID', 'NAME', 'PRICE', 'CURRENCY_ID', 'DESCRIPTION'],
				start: start,
				limit: limit,
				order: { NAME: 'ASC' },
			})

			if (response.data?.result && response.data.result.length > 0) {
				allProducts.push(...response.data.result)
				logger.info(`Загружено товаров: ${allProducts.length}`)

				if (response.data.result.length < limit) {
					hasMore = false
				} else {
					start += limit
					// Небольшая задержка между запросами
					await new Promise(resolve => setTimeout(resolve, 100))
				}
			} else {
				hasMore = false
			}
		}

		return allProducts
	}

	async getCompanies(
		query = '',
		limit = 50,
		assignedToUserId: string | null = null,
		includeRequisites = false
	) {
		const filterKey = `${query || 'all'}_${
			assignedToUserId || 'nouser'
		}_${limit}_${includeRequisites ? 'withReq' : 'noReq'}`
		const cached = await bitrixCache.getDynamicOptions('companies', filterKey)
		if (cached) return { result: cached, total: cached.length }

		let results: any[] = []
		const trimmedQuery = query.trim()

		if (trimmedQuery) {
			// Стратегия 1: Поиск по ID (если запрос - число)
			const isNumericId = /^\d+$/.test(trimmedQuery)
			if (isNumericId) {
				const filter: any = { ID: trimmedQuery }
				if (assignedToUserId) filter.ASSIGNED_BY_ID = assignedToUserId

				const response = await axios.post(
					`${this.webhookUrl}crm.company.list`,
					{
						filter,
						select: [
							'ID',
							'TITLE',
							'COMPANY_TYPE',
							'INDUSTRY',
							'REVENUE',
							'PHONE',
							'EMAIL',
							'RQ_INN',
						],
						start: 0,
						limit: parseInt(limit.toString()),
						order: { TITLE: 'ASC' },
					}
				)
				if (response.data?.result?.length > 0) {
					results = response.data.result
				}
			}

			// Стратегия 2: Точный поиск по названию
			if (results.length === 0) {
				const filter: any = { TITLE: trimmedQuery }
				if (assignedToUserId) filter.ASSIGNED_BY_ID = assignedToUserId

				const exactResponse = await axios.post(
					`${this.webhookUrl}crm.company.list`,
					{
						filter,
						select: [
							'ID',
							'TITLE',
							'COMPANY_TYPE',
							'INDUSTRY',
							'REVENUE',
							'PHONE',
							'EMAIL',
							'RQ_INN',
						],
						start: 0,
						limit: parseInt(limit.toString()),
						order: { TITLE: 'ASC' },
					}
				)
				if (exactResponse.data?.result?.length > 0) {
					results = exactResponse.data.result
				}
			}

			// Стратегия 3: Поиск по частичному совпадению в названии
			if (results.length === 0) {
				const filter: any = { '?TITLE': trimmedQuery }
				if (assignedToUserId) filter.ASSIGNED_BY_ID = assignedToUserId

				const partialResponse = await axios.post(
					`${this.webhookUrl}crm.company.list`,
					{
						filter,
						select: [
							'ID',
							'TITLE',
							'COMPANY_TYPE',
							'INDUSTRY',
							'REVENUE',
							'PHONE',
							'EMAIL',
							'RQ_INN',
						],
						start: 0,
						limit: parseInt(limit.toString()),
						order: { TITLE: 'ASC' },
					}
				)
				if (partialResponse.data?.result?.length > 0) {
					results = partialResponse.data.result
				}
			}

			// Стратегия 4: Нечеткий поиск - поиск по словам из запроса
			if (results.length === 0) {
				const words = trimmedQuery
					.toLowerCase()
					.split(/\s+/)
					.filter(word => word.length > 2)
				if (words.length > 0) {
					// Получаем все компании и фильтруем на клиенте
					const filter: any = {}
					if (assignedToUserId) filter.ASSIGNED_BY_ID = assignedToUserId

					const allResponse = await axios.post(
						`${this.webhookUrl}crm.company.list`,
						{
							filter,
							select: [
								'ID',
								'TITLE',
								'COMPANY_TYPE',
								'INDUSTRY',
								'REVENUE',
								'PHONE',
								'EMAIL',
								'RQ_INN',
							],
							start: 0,
							limit: 200, // Больше лимит для нечеткого поиска
							order: { TITLE: 'ASC' },
						}
					)

					if (allResponse.data?.result?.length > 0) {
						const fuzzyResults = allResponse.data.result.filter(
							(company: any) => {
								const searchText = `${company.TITLE || ''} ${
									company.INDUSTRY || ''
								}`.toLowerCase()
								return words.some(word => searchText.includes(word))
							}
						)
						results = fuzzyResults.slice(0, parseInt(limit.toString()))
					}
				}
			}
		} else {
			// Если запрос пустой, возвращаем все компании
			const filter: any = {}
			if (assignedToUserId) filter.ASSIGNED_BY_ID = assignedToUserId

			const response = await axios.post(`${this.webhookUrl}crm.company.list`, {
				filter,
				select: [
					'ID',
					'TITLE',
					'COMPANY_TYPE',
					'INDUSTRY',
					'REVENUE',
					'PHONE',
					'EMAIL',
					'RQ_INN',
				],
				start: 0,
				limit: parseInt(limit.toString()),
				order: { TITLE: 'ASC' },
			})
			results = response.data?.result || []
		}

		// Загружаем реквизиты для каждой компании, если требуется
		if (includeRequisites && results.length > 0) {
			const companiesWithRequisites = await Promise.all(
				results.map(async (company: any) => {
					try {
						const requisites = await this.getCompanyRequisites(company.ID)
						// Берем первый набор реквизитов (обычно у компании один)
						const firstRequisite = requisites?.[0]
						return {
							...company,
							REQUISITES: firstRequisite
								? {
										RQ_INN: firstRequisite.RQ_INN || null,
										RQ_KPP: firstRequisite.RQ_KPP || null,
										RQ_COMPANY_FULL_NAME:
											firstRequisite.RQ_COMPANY_FULL_NAME || null,
										RQ_COMPANY_NAME: firstRequisite.RQ_COMPANY_NAME || null,
								  }
								: null,
						}
					} catch (error) {
						console.warn(
							`Ошибка загрузки реквизитов для компании ${company.ID}:`,
							error
						)
						return company
					}
				})
			)
			results = companiesWithRequisites
		}

		const responseData = { result: results, total: results.length }

		if (results.length > 0) {
			await bitrixCache.setDynamicOptions('companies', results, filterKey)
		}
		return responseData
	}

	async getCompany(companyId: string) {
		const response = await axios.post(`${this.webhookUrl}crm.company.get`, {
			id: companyId,
		})
		return response.data
	}

	async getContacts(query = '', limit = 50) {
		let filter: any = {}
		if (query) {
			const isNumericId = /^\d+$/.test(query.trim())
			filter = isNumericId
				? { ID: query.trim() }
				: { LOGIC: 'OR', NAME: `%${query}%`, LAST_NAME: `%${query}%` }
		}
		const response = await axios.post(`${this.webhookUrl}crm.contact.list`, {
			filter,
			select: [
				'ID',
				'NAME',
				'LAST_NAME',
				'SECOND_NAME',
				'PHONE',
				'EMAIL',
				'COMPANY_ID',
				'POST',
			],
			start: 0,
			limit: parseInt(limit.toString()),
			order: { LAST_NAME: 'ASC' },
		})
		return response.data
	}

	// Misc reference data
	async getStatusList(entityId: string) {
		const response = await axios.post(`${this.webhookUrl}crm.status.list`, {
			filter: { ENTITY_ID: entityId },
		})
		return response.data
	}

	async getUserFields() {
		const response = await axios.post(
			`${this.webhookUrl}crm.deal.userfield.list`
		)
		return response.data
	}

	async getEnumFieldValues(fieldIdentifier: string) {
		const userFieldsResponse = await this.getUserFields()
		if (!userFieldsResponse?.result)
			throw new Error('Не удалось получить пользовательские поля')
		const targetField = userFieldsResponse.result.find(
			(field: any) =>
				field.FIELD_NAME === fieldIdentifier || field.ID === fieldIdentifier
		)
		if (!targetField) throw new Error(`Поле ${fieldIdentifier} не найдено`)
		if (targetField.USER_TYPE_ID !== 'enumeration') {
			throw new Error(
				`Поле ${fieldIdentifier} не является полем типа enumeration (тип: ${targetField.USER_TYPE_ID})`
			)
		}
		const enumValues: any[] = []
		if (targetField.LIST && Array.isArray(targetField.LIST)) {
			targetField.LIST.forEach((item: any) => {
				enumValues.push({
					ID: item.ID,
					VALUE: item.VALUE,
					SORT: item.SORT || '100',
				})
			})
		}
		return { result: enumValues, total: enumValues.length }
	}

	async debugFieldStructure() {
		const userFieldsResponse = await this.getUserFields()
		if (!userFieldsResponse?.result)
			return { result: { error: 'Не удалось получить поля' } }
		const fieldsByType = userFieldsResponse.result.reduce(
			(acc: any, field: any) => {
				const type = field.USER_TYPE_ID
				if (!acc[type]) acc[type] = []
				acc[type].push(field)
				return acc
			},
			{}
		)
		const potentialEnumFields = userFieldsResponse.result.filter(
			(field: any) =>
				field.SETTINGS &&
				(field.SETTINGS.LIST ||
					field.SETTINGS.VALUES ||
					field.SETTINGS.ITEMS ||
					field.USER_TYPE_ID === 'enumeration' ||
					field.USER_TYPE_ID === 'list')
		)
		return {
			result: {
				totalFields: userFieldsResponse.result.length,
				fieldsByType,
				potentialEnumFields,
			},
		}
	}

	async getAllEnumFieldsWithValues() {
		const userFieldsResponse = await this.getUserFields()
		if (!userFieldsResponse.result) return { result: [] }
		const enumFields = userFieldsResponse.result.filter(
			(field: any) => field.USER_TYPE_ID === 'enumeration'
		)
		const fieldsWithValues = enumFields.map((field: any) => {
			const enumValues: any[] = []
			if (field.LIST && Array.isArray(field.LIST)) {
				field.LIST.forEach((item: any) => {
					enumValues.push({
						ID: item.ID,
						VALUE: item.VALUE,
						SORT: item.SORT || '100',
					})
				})
			}
			return { field, values: enumValues }
		})
		return { result: fieldsWithValues }
	}

	// Deal categories and stages
	async getDealCategories() {
		const cached = await bitrixCache.getDealCategories()
		if (cached) return { result: cached, total: cached.length }
		try {
			const response = await axios.post(`${this.webhookUrl}crm.category.list`, {
				entityTypeId: 2,
			})
			if (response.data?.result)
				await bitrixCache.setDealCategories(response.data.result)
			return response.data
		} catch {
			try {
				const fallbackResponse = await axios.post(
					`${this.webhookUrl}crm.dealcategory.list`
				)
				return fallbackResponse.data
			} catch {
				return { result: [] }
			}
		}
	}

	async getDealStages(categoryId: string = '0') {
		const cached = await bitrixCache.getDealStages(categoryId)
		if (cached) return cached
		const response = await axios.post(`${this.webhookUrl}crm.status.list`, {
			filter: { ENTITY_ID: 'DEAL_STAGE', ENTITY_TYPE: categoryId },
			order: { SORT: 'ASC' },
		})
		const stages =
			response.data?.result?.map((stage: any) => ({
				id: stage.STATUS_ID,
				name: stage.NAME,
				sort: parseInt(stage.SORT) || 0,
				color: stage.COLOR,
				semantic: stage.SYSTEM === 'Y' ? stage.SYSTEM : 'P',
			})) || []
		if (stages.length > 0) await bitrixCache.setDealStages(categoryId, stages)
		return stages
	}

	// Users
	async getUsers(start = 0, limit = 200) {
		const response = await retryRequest(() =>
			axios.post(
				`${this.webhookUrl}user.get`,
				{
					start,
					limit,
					filter: { ACTIVE: 'Y' }, // Только активные пользователи
					sort: 'NAME',
					order: 'ASC',
				},
				{ timeout: 30000 }
			)
		)
		return response.data
	}

	// Получить всех активных пользователей с пагинацией
	async getAllActiveUsers() {
		const allUsers: any[] = []
		let start = 0
		const limit = 50
		let hasMore = true

		while (hasMore) {
			try {
				const response = await this.getUsers(start, limit)

				if (response?.result && Array.isArray(response.result)) {
					allUsers.push(...response.result)

					// Проверяем, есть ли еще данные
					hasMore = response.result.length === limit
					start += limit
				} else {
					hasMore = false
				}
			} catch (error) {
				console.error(`Ошибка загрузки пользователей (start: ${start}):`, error)
				hasMore = false
			}
		}

		return {
			result: allUsers,
			total: allUsers.length,
		}
	}

	async getCurrentUser() {
		const response = await retryRequest(() =>
			axios.post(`${this.webhookUrl}user.current`, {}, { timeout: 15000 })
		)
		return response.data
	}

	/**
	 * Поиск продуктов через Bitrix24 API
	 */
	async searchProducts(query: string, limit: number = 20): Promise<any[]> {
		try {
			const response = await retryRequest(() =>
				axios.post(
					`${this.webhookUrl}crm.product.list`,
					{
						filter: {
							'%NAME': query,
							'%DESCRIPTION': query,
						},
						select: ['ID', 'NAME', 'DESCRIPTION', 'PRICE', 'CURRENCY_ID'],
						start: 0,
						limit: Math.min(limit, 50),
					},
					{ timeout: 15000 }
				)
			)
			return response.data.result || []
		} catch (error) {
			console.error('Ошибка поиска продуктов в Bitrix24:', error)
			return []
		}
	}

	/**
	 * Поиск компаний через Bitrix24 API
	 */
	async searchCompanies(
		query: string,
		limit: number = 20,
		assignedFilter?: string
	): Promise<any[]> {
		try {
			const filter: any = {
				'%TITLE': query,
				'%COMMENTS': query,
			}

			// Добавляем фильтр по ответственному, если указан
			if (assignedFilter) {
				filter['ASSIGNED_BY_ID'] = assignedFilter
			}

			const response = await retryRequest(() =>
				axios.post(
					`${this.webhookUrl}crm.company.list`,
					{
						filter,
						select: [
							'ID',
							'TITLE',
							'COMMENTS',
							'INDUSTRY',
							'PHONE',
							'EMAIL',
							'ADDRESS',
						],
						start: 0,
						limit: Math.min(limit, 50),
					},
					{ timeout: 15000 }
				)
			)
			return response.data.result || []
		} catch (error) {
			console.error('Ошибка поиска компаний в Bitrix24:', error)
			return []
		}
	}

	/**
	 * Поиск контактов через Bitrix24 API
	 */
	async searchContacts(query: string, limit: number = 20): Promise<any[]> {
		try {
			const response = await retryRequest(() =>
				axios.post(
					`${this.webhookUrl}crm.contact.list`,
					{
						filter: {
							'%NAME': query,
							'%LAST_NAME': query,
							'%COMMENTS': query,
						},
						select: ['ID', 'NAME', 'LAST_NAME', 'COMMENTS', 'PHONE', 'EMAIL'],
						start: 0,
						limit: Math.min(limit, 50),
					},
					{ timeout: 15000 }
				)
			)
			return response.data.result || []
		} catch (error) {
			console.error('Ошибка поиска контактов в Bitrix24:', error)
			return []
		}
	}

	/**
	 * Получение всех компаний из Bitrix24 (пагинация)
	 */
	async getAllCompanies(): Promise<any[]> {
		const allCompanies: any[] = []
		let start = 0
		const limit = 50 // Размер страницы
		let hasMore = true

		try {
			while (hasMore) {
				const response = await retryRequest(() =>
					axios.post(
						`${this.webhookUrl}crm.company.list`,
						{
							select: [
								'ID',
								'TITLE',
								'COMPANY_TYPE',
								'INDUSTRY',
								'REVENUE',
								'PHONE',
								'EMAIL',
								'ADDRESS',
								'COMMENTS',
								'RQ_INN',
								'ASSIGNED_BY_ID', // Ответственный пользователь
							],
							start,
							limit,
							order: { TITLE: 'ASC' },
						},
						{ timeout: 15000 }
					)
				)

				const companies = response.data?.result || []
				allCompanies.push(...companies)

				// Если получили меньше записей, чем запрашивали, значит это последняя страница
				if (companies.length < limit) {
					hasMore = false
				} else {
					start += limit
				}

				logger.info(`Загружено компаний: ${allCompanies.length}`)
			}

			logger.info(`Всего загружено компаний: ${allCompanies.length}`)
			return allCompanies
		} catch (error) {
			logger.error('Ошибка загрузки всех компаний:', error)
			throw error
		}
	}

	async getCompanyRequisites(companyId: string): Promise<any[]> {
		try {
			const response = await axios.post(
				`${this.webhookUrl}crm.requisite.list`,
				{
					filter: {
						ENTITY_TYPE_ID: 4, // 4 = Company
						ENTITY_ID: companyId,
					},
					select: [
						'ID',
						'ENTITY_TYPE_ID',
						'ENTITY_ID',
						'NAME',
						'RQ_INN',
						'RQ_KPP',
						'RQ_OGRN',
						'RQ_OKPO',
						'RQ_OKVED',
						'ACTIVE',
					],
					start: 0,
					limit: 50,
				}
			)

			return response.data?.result || []
		} catch (error) {
			logger.error(
				`Ошибка получения реквизитов для компании ${companyId}:`,
				error
			)
			return []
		}
	}

	async getAllCompaniesWithRequisites(): Promise<any[]> {
		try {
			// Сначала получаем все компании
			const companies = await this.getAllCompanies()

			// Получаем все реквизиты с пагинацией
			const allRequisites: any[] = []
			let start = 0
			const limit = 50
			let hasMore = true

			while (hasMore) {
				const response = await axios.post(
					`${this.webhookUrl}crm.requisite.list`,
					{
						filter: {
							ENTITY_TYPE_ID: 4, // 4 = Company
						},
						select: [
							'ID',
							'ENTITY_TYPE_ID',
							'ENTITY_ID',
							'NAME',
							'RQ_INN',
							'RQ_KPP',
							'RQ_OGRN',
							'RQ_OKPO',
							'RQ_OKVED',
							'ACTIVE',
						],
						start,
						limit,
					}
				)

				const requisites = response.data?.result || []
				allRequisites.push(...requisites)

				// Если получили меньше записей, чем запрашивали, значит это последняя страница
				if (requisites.length < limit) {
					hasMore = false
				} else {
					start += limit
				}

				logger.info(`Загружено реквизитов: ${allRequisites.length}`)
			}

			logger.info(`Всего загружено реквизитов: ${allRequisites.length}`)

			// Создаем карту реквизитов по ID компании
			const requisitesMap = new Map()
			allRequisites.forEach(req => {
				if (!requisitesMap.has(req.ENTITY_ID)) {
					requisitesMap.set(req.ENTITY_ID, [])
				}
				requisitesMap.get(req.ENTITY_ID).push(req)
			})

			// Добавляем реквизиты к компаниям
			const companiesWithRequisites = companies.map(company => {
				const requisites = requisitesMap.get(company.ID) || []

				return {
					...company,
					requisites: requisites,
					// Берем первый активный реквизит с ИНН
					RQ_INN:
						requisites.find(r => r.ACTIVE === 'Y' && r.RQ_INN)?.RQ_INN || '',
				}
			})

			return companiesWithRequisites
		} catch (error) {
			logger.error('Ошибка загрузки компаний с реквизитами:', error)
			throw error
		}
	}
}

export default new Bitrix24Service()
