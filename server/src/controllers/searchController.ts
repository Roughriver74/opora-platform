import { Request, Response } from 'express'
import { elasticsearchService } from '../services/elasticsearchService'
import { searchSyncService } from '../services/searchSyncService'
import bitrix24Service from '../services/bitrix24Service'
import { logger } from '../utils/logger'

// Простое кэширование в памяти
const searchCache = new Map<string, { data: any; timestamp: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5 минут

function getCacheKey(
	query: string,
	type?: string,
	limit?: number,
	offset?: number
): string {
	return `${query}_${type || 'all'}_${limit || 20}_${offset || 0}`
}

function getCachedResult(key: string): any | null {
	const cached = searchCache.get(key)
	if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
		return cached.data
	}
	searchCache.delete(key)
	return null
}

function setCachedResult(key: string, data: any): void {
	searchCache.set(key, { data, timestamp: Date.now() })

	// Очищаем старые записи (простая очистка)
	if (searchCache.size > 1000) {
		const now = Date.now()
		for (const [k, v] of searchCache.entries()) {
			if (now - v.timestamp > CACHE_TTL) {
				searchCache.delete(k)
			}
		}
	}
}

/**
 * Универсальный поиск через Elasticsearch
 */
export const search = async (req: Request, res: Response): Promise<void> => {
	try {
		const {
			query = '',
			type,
			limit = 20,
			offset = 0,
			includeHighlights = true,
			fuzzy = true,
		} = req.body

		const results = await elasticsearchService.search({
			query,
			type,
			limit: Math.min(limit, 100), // Максимум 100 результатов
			offset,
			includeHighlights,
			fuzzy,
		})

		res.status(200).json({
			success: true,
			data: results,
			total: results.length,
			query,
			type,
		})
	} catch (error: any) {
		logger.error('Search failed:', error)
		res.status(500).json({
			success: false,
			message: 'Ошибка поиска',
			error: error.message,
		})
	}
}

/**
 * Автодополнение
 */
export const suggest = async (req: Request, res: Response): Promise<void> => {
	try {
		const { query = '', type } = req.body

		if (!query.trim()) {
			res.status(200).json({
				success: true,
				data: [],
				query,
			})
			return
		}

		const suggestions = await elasticsearchService.suggest(query.trim(), type)

		res.status(200).json({
			success: true,
			data: suggestions,
			query,
		})
	} catch (error: any) {
		logger.error('Suggest failed:', error)
		res.status(500).json({
			success: false,
			message: 'Ошибка автодополнения',
			error: error.message,
		})
	}
}

/**
 * Поиск продуктов через Elasticsearch с fallback на Bitrix24 API
 */
export const searchProducts = async (
	req: Request,
	res: Response
): Promise<void> => {
	try {
		const { query = '', limit = 20, offset = 0 } = req.body

		// Проверяем кэш
		const cacheKey = getCacheKey(query, 'product', limit, offset)
		const cachedResult = getCachedResult(cacheKey)
		if (cachedResult) {
			res.status(200).json(cachedResult)
			return
		}

		// Сначала пробуем поиск через Elasticsearch
		let elasticResults: any[] = []
		try {
			elasticResults = await elasticsearchService.search({
				query,
				type: 'product',
				limit: Math.min(limit, 100),
				offset,
				includeHighlights: true,
				fuzzy: true,
			})
		} catch (error) {
			logger.error(`Ошибка Elasticsearch поиска продуктов "${query}":`, error)
			// Продолжаем с fallback
		}

		let result: any

		// Если есть результаты в Elasticsearch, возвращаем их
		if (elasticResults.length > 0) {
			const formattedResults = elasticResults.map(result => ({
				ID: result.bitrixId || result.id.replace('product_', ''),
				NAME: result.name,
				DESCRIPTION: result.description,
				PRICE: result.price?.toString() || '',
				CURRENCY_ID: result.currency || 'RUB',
				_score: result.score,
				highlight: result.highlight,
			}))

			result = {
				result: formattedResults,
				total: formattedResults.length,
				query,
				searchEngine: 'elasticsearch',
			}
		} else {
			// Fallback: если нет результатов в Elasticsearch, ищем через Bitrix24 API
			const bitrixResults = await bitrix24Service.searchProducts(query, limit)

			// Преобразуем результаты Bitrix24 в нужный формат
			const formattedBitrixResults = bitrixResults.map((product: any) => ({
				ID: product.ID,
				NAME: product.NAME,
				DESCRIPTION: product.DESCRIPTION || '',
				PRICE: product.PRICE || '0',
				CURRENCY_ID: product.CURRENCY_ID || 'RUB',
				_score: 1.0,
				highlight: {
					name: [product.NAME],
					description: [product.DESCRIPTION || ''],
				},
			}))

			result = {
				result: formattedBitrixResults,
				total: formattedBitrixResults.length,
				query,
				searchEngine: 'bitrix24_fallback',
			}
		}

		// Кэшируем результат
		setCachedResult(cacheKey, result)
		res.status(200).json(result)
	} catch (error: any) {
		logger.error('Product search failed:', error)
		res.status(500).json({
			success: false,
			message: 'Ошибка поиска продуктов',
			error: error.message,
		})
	}
}

/**
 * Поиск компаний через Elasticsearch
 */
export const searchCompanies = async (
	req: Request,
	res: Response
): Promise<void> => {
	try {
		const { query = '', limit = 20, offset = 0 } = req.body
		const user = req.user

		// Определяем параметры фильтрации (как в оригинальном коде)
		let assignedFilter = null
		const isAdmin = req.isAdmin || false
		if (user && user.bitrixUserId && !isAdmin) {
			assignedFilter = user.bitrixUserId
		}

		// Сначала пробуем поиск через Elasticsearch
		const elasticResults = await elasticsearchService.search({
			query,
			type: 'company',
			limit: Math.min(limit, 100),
			offset,
			includeHighlights: true,
			fuzzy: true,
			assignedById: assignedFilter, // Передаем фильтр по ответственному пользователю
		})

		// Если есть результаты в Elasticsearch, возвращаем их
		if (elasticResults.length > 0) {
			const formattedResults = elasticResults.map(result => {
				console.log('🔍 Elasticsearch result:', {
					id: result.id,
					name: result.name,
					inn: result.inn,
					innType: typeof result.inn,
					innValue: JSON.stringify(result.inn),
				})

				return {
					ID: result.bitrixId || result.id.replace('company_', ''), // Используем Bitrix ID если есть
					TITLE: result.name,
					COMMENTS: result.description,
					INDUSTRY: result.industry,
					PHONE: result.phone ? [{ VALUE: result.phone }] : [],
					EMAIL: result.email ? [{ VALUE: result.email }] : [],
					ADDRESS: result.address,
					RQ_INN: result.inn, // Добавляем ИНН
					_score: result.score,
					highlight: result.highlight,
					bitrixId: result.bitrixId, // Добавляем Bitrix ID в результат
				}
			})

			logger.info('Companies Elasticsearch search params:', {
				query,
				userId: user?.id,
				bitrixId: user?.bitrixUserId,
				isAdmin,
				assignedFilter,
				resultsCount: formattedResults.length,
			})

			res.status(200).json({
				result: formattedResults,
				total: formattedResults.length,
				query,
				searchEngine: 'elasticsearch',
			})
			return
		}

		// Fallback: если нет результатов в Elasticsearch, ищем через Bitrix24 API
		logger.info(`Fallback: поиск компаний "${query}" через Bitrix24 API`)

		const bitrixResults = await bitrix24Service.searchCompanies(
			query,
			limit,
			assignedFilter
		)

		// Преобразуем результаты Bitrix24 в нужный формат
		const formattedBitrixResults = bitrixResults.map((company: any) => ({
			ID: company.ID,
			TITLE: company.TITLE,
			COMMENTS: company.COMMENTS || '',
			INDUSTRY: company.INDUSTRY || '',
			PHONE: company.PHONE || [],
			EMAIL: company.EMAIL || [],
			ADDRESS: company.ADDRESS || '',
			_score: 1.0, // Низкий score для результатов из Bitrix24
			highlight: {
				title: [company.TITLE],
				comments: [company.COMMENTS || ''],
			},
		}))

		logger.info('Companies Bitrix24 fallback search params:', {
			query,
			userId: user?.id,
			bitrixId: user?.bitrixUserId,
			isAdmin,
			assignedFilter,
			resultsCount: formattedBitrixResults.length,
		})

		res.status(200).json({
			result: formattedBitrixResults,
			total: formattedBitrixResults.length,
			query,
			searchEngine: 'bitrix24_fallback',
		})
	} catch (error: any) {
		logger.error('Company search failed:', error)
		res.status(500).json({
			success: false,
			message: 'Ошибка поиска компаний',
			error: error.message,
		})
	}
}

/**
 * Поиск контактов через Elasticsearch с fallback на Bitrix24 API
 */
export const searchContacts = async (
	req: Request,
	res: Response
): Promise<void> => {
	try {
		const { query = '', limit = 20, offset = 0 } = req.body

		// Сначала пробуем поиск через Elasticsearch
		const elasticResults = await elasticsearchService.search({
			query,
			type: 'contact',
			limit: Math.min(limit, 100),
			offset,
			includeHighlights: true,
			fuzzy: true,
		})

		// Если есть результаты в Elasticsearch, возвращаем их
		if (elasticResults.length > 0) {
			const formattedResults = elasticResults.map(result => ({
				ID: result.bitrixId || result.id.replace('contact_', ''), // Используем Bitrix ID если есть
				NAME: result.name.split(' ')[0] || '',
				LAST_NAME: result.name.split(' ').slice(1).join(' ') || '',
				COMMENTS: result.description,
				PHONE: result.phone ? [{ VALUE: result.phone }] : [],
				EMAIL: result.email ? [{ VALUE: result.email }] : [],
				_score: result.score,
				highlight: result.highlight,
			}))

			res.status(200).json({
				result: formattedResults,
				total: formattedResults.length,
				query,
				searchEngine: 'elasticsearch',
			})
			return
		}

		// Fallback: если нет результатов в Elasticsearch, ищем через Bitrix24 API
		logger.info(`Fallback: поиск контактов "${query}" через Bitrix24 API`)

		const bitrixResults = await bitrix24Service.searchContacts(query, limit)

		// Преобразуем результаты Bitrix24 в нужный формат
		const formattedBitrixResults = bitrixResults.map((contact: any) => ({
			ID: contact.ID,
			NAME: contact.NAME || '',
			LAST_NAME: contact.LAST_NAME || '',
			COMMENTS: contact.COMMENTS || '',
			PHONE: contact.PHONE || [],
			EMAIL: contact.EMAIL || [],
			_score: 1.0, // Низкий score для результатов из Bitrix24
			highlight: {
				name: [contact.NAME || ''],
				lastName: [contact.LAST_NAME || ''],
			},
		}))

		res.status(200).json({
			result: formattedBitrixResults,
			total: formattedBitrixResults.length,
			query,
			searchEngine: 'bitrix24_fallback',
		})
	} catch (error: any) {
		logger.error('Contact search failed:', error)
		res.status(500).json({
			success: false,
			message: 'Ошибка поиска контактов',
			error: error.message,
		})
	}
}

/**
 * Синхронизация данных с Elasticsearch
 */
export const syncData = async (req: Request, res: Response): Promise<void> => {
	try {
		logger.info('Starting manual data sync...')

		// Initialize index first
		await searchSyncService.initialize()

		// Sync all data
		const stats = await searchSyncService.syncAllData()

		logger.info('Manual sync completed:', stats)
		res.status(200).json({
			success: true,
			message: 'Синхронизация завершена',
			stats,
		})
	} catch (error: any) {
		logger.error('Data sync failed:', error)
		res.status(500).json({
			success: false,
			message: 'Ошибка синхронизации данных',
			error: error.message,
		})
	}
}

/**
 * Проверка здоровья Elasticsearch
 */
export const healthCheck = async (
	req: Request,
	res: Response
): Promise<void> => {
	try {
		const isHealthy = await searchSyncService.healthCheck()
		const stats = await searchSyncService.getIndexStats()

		res.status(200).json({
			success: true,
			healthy: isHealthy,
			stats: {
				documents: stats?.total?.docs?.count || 0,
				size: stats?.total?.store?.size_in_bytes || 0,
				indexName: 'beton_crm_search',
			},
		})
	} catch (error: any) {
		logger.error('Health check failed:', error)
		res.status(500).json({
			success: false,
			healthy: false,
			message: 'Ошибка проверки здоровья',
			error: error.message,
		})
	}
}

/**
 * Получение агрегаций по типам
 */
export const getAggregations = async (
	req: Request,
	res: Response
): Promise<void> => {
	try {
		const aggregations = await elasticsearchService.getTypeAggregations()

		res.status(200).json({
			success: true,
			data: aggregations,
		})
	} catch (error: any) {
		logger.error('Aggregations failed:', error)
		res.status(500).json({
			success: false,
			message: 'Ошибка получения агрегаций',
			error: error.message,
		})
	}
}

/**
 * Поиск submissions через Elasticsearch
 */
export const searchSubmissions = async (
	req: Request,
	res: Response
): Promise<void> => {
	try {
		const {
			query = '',
			limit = 20,
			offset = 0,
			includeHighlights = true,
			fuzzy = true,
		} = req.body

		console.log('searchSubmissions called with:', { query, limit, offset })

		const results = await elasticsearchService.search({
			query,
			type: 'submission',
			limit: Math.min(limit, 100), // Максимум 100 результатов
			offset,
			includeHighlights,
			fuzzy,
		})

		res.status(200).json({
			success: true,
			data: {
				results,
				total: results.length,
				query,
				limit,
				offset,
			},
		})
	} catch (error) {
		logger.error('Ошибка поиска submissions:', error)
		res.status(500).json({
			success: false,
			message: 'Ошибка поиска заявок',
			error: error.message,
		})
	}
}
