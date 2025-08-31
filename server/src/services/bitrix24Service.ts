import axios from 'axios'
import config from '../config/config'
import { bitrixCache } from './cacheService'

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

		let filter: any = {}
		if (query) {
			const isNumericId = /^\d+$/.test(query.trim())
			filter = isNumericId ? { ID: query.trim() } : { NAME: `%${query}%` }
		}

		const response = await axios.post(`${this.webhookUrl}crm.product.list`, {
			filter,
			select: ['ID', 'NAME', 'PRICE', 'CURRENCY_ID', 'DESCRIPTION'],
			start: 0,
			limit: parseInt(limit.toString()),
			order: { NAME: 'ASC' },
		})

		if (response.data?.result) {
			await bitrixCache.setDynamicOptions(
				'products',
				response.data.result,
				filterStr
			)
		}
		return response.data
	}

	async getProduct(productId: string) {
		const response = await axios.post(`${this.webhookUrl}crm.product.get`, {
			id: productId,
		})
		return response.data
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

		const filter: any = {}
		if (assignedToUserId) filter.ASSIGNED_BY_ID = assignedToUserId
		if (query) {
			const isNumericId = /^\d+$/.test(query.trim())
			if (isNumericId) filter.ID = query.trim()
			else filter['?TITLE'] = query
		}

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
			],
			start: 0,
			limit: parseInt(limit.toString()),
			order: { TITLE: 'ASC' },
		})

		let results = response.data
		// Fallback поиск только если НЕ установлен фильтр по пользователю
		if (
			query &&
			!assignedToUserId &&
			results.result &&
			results.result.length === 0 &&
			!/^\d+$/.test(query.trim())
		) {
			const allCompaniesResponse = await axios.post(
				`${this.webhookUrl}crm.company.list`,
				{
					filter: {},
					select: [
						'ID',
						'TITLE',
						'COMPANY_TYPE',
						'INDUSTRY',
						'REVENUE',
						'PHONE',
						'EMAIL',
					],
					start: 0,
					limit: 50,
					order: { TITLE: 'ASC' },
				}
			)
			if (allCompaniesResponse.data?.result) {
				const filteredCompanies = allCompaniesResponse.data.result.filter(
					(company: any) =>
						company.TITLE &&
						company.TITLE.toLowerCase().includes(query.toLowerCase())
				)
				results = {
					...allCompaniesResponse.data,
					result: filteredCompanies,
					total: filteredCompanies.length,
				}
			}
		}

		// Загружаем реквизиты для каждой компании, если требуется
		if (includeRequisites && results?.result) {
			const companiesWithRequisites = await Promise.all(
				results.result.map(async (company: any) => {
					try {
						const requisites = await this.getCompanyRequisites(company.ID)
						// Берем первый набор реквизитов (обычно у компании один)
						const firstRequisite = requisites?.result?.[0]
						return {
							...company,
							REQUISITES: firstRequisite ? {
								RQ_INN: firstRequisite.RQ_INN || null,
								RQ_KPP: firstRequisite.RQ_KPP || null,
								RQ_COMPANY_FULL_NAME: firstRequisite.RQ_COMPANY_FULL_NAME || null,
								RQ_COMPANY_NAME: firstRequisite.RQ_COMPANY_NAME || null,
							} : null
						}
					} catch (error) {
						console.warn(`Ошибка загрузки реквизитов для компании ${company.ID}:`, error)
						return company
					}
				})
			)
			results = {
				...results,
				result: companiesWithRequisites
			}
		}

		if (results?.result) {
			await bitrixCache.setDynamicOptions(
				'companies',
				results.result,
				filterKey
			)
		}
		return results
	}

	async getCompany(companyId: string) {
		const response = await axios.post(`${this.webhookUrl}crm.company.get`, {
			id: companyId,
		})
		return response.data
	}

	async getCompanyRequisites(companyId: string) {
		try {
			const response = await axios.post(`${this.webhookUrl}crm.requisite.list`, {
				filter: {
					ENTITY_TYPE_ID: 4, // 4 = Company
					ENTITY_ID: companyId,
				},
				select: [
					'ID',
					'RQ_INN',
					'RQ_KPP', 
					'RQ_COMPANY_FULL_NAME',
					'RQ_COMPANY_NAME',
				],
			})
			return response.data
		} catch (error) {
			console.warn(`Не удалось получить реквизиты компании ${companyId}:`, error)
			return { result: [] }
		}
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
					order: 'ASC' 
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
			total: allUsers.length
		}
	}

	async getCurrentUser() {
		const response = await retryRequest(() =>
			axios.post(`${this.webhookUrl}user.current`, {}, { timeout: 15000 })
		)
		return response.data
	}
}

export default new Bitrix24Service()
