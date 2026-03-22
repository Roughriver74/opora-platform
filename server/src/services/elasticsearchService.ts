import { Client, errors } from '@elastic/elasticsearch'
import { logger } from '../utils/logger'

const isNotFoundError = (error: unknown): boolean =>
	error instanceof errors.ResponseError && error.meta?.statusCode === 404

const isClusterBlockedError = (error: unknown): boolean => {
	if (!(error instanceof errors.ResponseError)) {
		return false
	}

	const body = error.meta?.body
	if (typeof body !== 'object' || body === null) {
		return false
	}

	const typedBody = body as ElasticsearchErrorBody
	return typedBody.error?.type === 'cluster_block_exception'
}

interface ErrorInfo {
	message: string
	stack?: string
	status?: number
}

type ElasticsearchErrorBody = {
	error?: {
		type?: string
	}
}

const extractGenericStatus = (error: unknown): number | undefined => {
	if (
		typeof error === 'object' &&
		error !== null &&
		'status' in error &&
		typeof (error as { status?: unknown }).status === 'number'
	) {
		return (error as { status: number }).status
	}
	return undefined
}

const getErrorInfo = (error: unknown): ErrorInfo => {
	if (error instanceof errors.ResponseError) {
		return {
			message: error.message,
			stack: error.stack,
			status: error.meta?.statusCode,
		}
	}

	if (error instanceof Error) {
		return {
			message: error.message,
			stack: error.stack,
			status: extractGenericStatus(error),
		}
	}

	return {
		message: 'Unknown error',
	}
}

const shouldRetryElasticsearchRequest = (status?: number): boolean =>
	status === 429 || status === 503 || status === 504

export interface SearchDocument {
	id: string
	name: string
	description?: string
	type: 'product' | 'company' | 'contact' | 'submission'
	// Поля общие
	localId?: string // UUID из PostgreSQL (primary source of truth)
	bitrixId?: string // Bitrix ID для связи с внешней системой
	createdAt: string
	updatedAt: string
	searchableText: string
	tags?: string[]
	attributes?: Record<string, any> // Дополнительные атрибуты
	// Поля для продуктов (Nomenclature)
	sku?: string // Артикул
	price?: number
	currency?: string
	categoryId?: string
	categoryName?: string
	unitCode?: string // Код единицы измерения (m3, t, pcs)
	unitName?: string // Название единицы (м³, т, шт)
	// Поля для компаний (Company)
	shortName?: string // Краткое название
	companyType?: string // customer, supplier, partner, contractor, other
	industry?: string
	phone?: string
	additionalPhones?: string[]
	email?: string
	website?: string
	address?: string
	legalAddress?: string
	postalAddress?: string
	inn?: string // ИНН
	kpp?: string // КПП
	ogrn?: string // ОГРН
	bankName?: string
	bankBik?: string
	bankAccount?: string
	// Поля для контактов (Contact)
	firstName?: string
	lastName?: string
	middleName?: string
	contactType?: string // decision_maker, manager, accountant, director, dispatcher, other
	position?: string // Должность
	department?: string // Отдел
	companyId?: string // UUID компании
	companyName?: string // Название компании (для поиска)
	companyInn?: string // ИНН компании (для связи)
	isPrimary?: boolean // Основной контакт компании
	assignedById?: string // ID ответственного пользователя
	// Поля для submissions
	submissionNumber?: string
	userName?: string
	userEmail?: string
	formName?: string
	formTitle?: string
	status?: string
	priority?: string
	notes?: string
	formData?: Record<string, any>
}

export interface SearchResult {
	id: string
	name: string
	description?: string
	type: 'product' | 'company' | 'contact' | 'submission'
	score: number
	highlight?: {
		name?: string[]
		description?: string[]
		searchableText?: string[]
		sku?: string[]
		inn?: string[]
		phone?: string[]
		email?: string[]
		submissionNumber?: string[]
		userName?: string[]
		formName?: string[]
		notes?: string[]
	}
	// Поля общие
	localId?: string
	bitrixId?: string
	tags?: string[]
	attributes?: Record<string, any>
	// Поля для продуктов
	sku?: string
	price?: number
	currency?: string
	categoryId?: string
	categoryName?: string
	unitCode?: string
	unitName?: string
	// Поля для компаний
	shortName?: string
	companyType?: string
	industry?: string
	phone?: string
	additionalPhones?: string[]
	email?: string
	website?: string
	address?: string
	legalAddress?: string
	postalAddress?: string
	inn?: string
	kpp?: string
	ogrn?: string
	bankName?: string
	bankBik?: string
	bankAccount?: string
	// Поля для контактов
	firstName?: string
	lastName?: string
	middleName?: string
	contactType?: string
	position?: string
	department?: string
	companyId?: string
	companyName?: string
	companyInn?: string
	isPrimary?: boolean
	assignedById?: string
	// Поля для submissions
	submissionNumber?: string
	userName?: string
	userEmail?: string
	formName?: string
	formTitle?: string
	status?: string
	priority?: string
	notes?: string
	formData?: Record<string, any>
}

export interface SearchOptions {
	query: string
	type?: 'product' | 'company' | 'contact' | 'submission'
	limit?: number
	offset?: number
	includeHighlights?: boolean
	fuzzy?: boolean
	assignedById?: string // Фильтр по ответственному пользователю
	userId?: string // Фильтр по пользователю (для submissions)
}

class ElasticsearchService {
	private client: Client
	private readonly indexName = 'opora_search'
	private readonly aliasName = 'opora_search_alias'

	// Кэш для результатов поиска
	private searchCache = new Map<
		string,
		{ data: SearchResult[]; timestamp: number }
	>()
	private readonly CACHE_TTL = 2 * 60 * 1000 // 2 минуты для поиска
	private readonly MAX_CACHE_SIZE = 500

	constructor() {
		const host = process.env.ELASTICSEARCH_HOST || 'localhost'
		const port = process.env.ELASTICSEARCH_PORT || '9200'

		this.client = new Client({
			node: `http://${host}:${port}`,
			requestTimeout: 1300000,
			maxRetries: 3,
		})
	}

	/**
	 * Инициализация индекса с маппингом полей
	 */
	async initializeIndex(): Promise<void> {
		try {
			const exists = await this.client.indices.exists({
				index: this.indexName,
			})

			if (!exists) {
				await this.client.indices.create({
					index: this.indexName,
					body: {
						mappings: {
							properties: {
								id: { type: 'keyword' },
								name: {
									type: 'text',
									analyzer: 'product_search',
									fields: {
										keyword: { type: 'keyword' },
										exact: {
											type: 'text',
											analyzer: 'exact_match',
										},
										autocomplete: {
											type: 'text',
											analyzer: 'autocomplete',
										},
										long_text: {
											type: 'text',
											analyzer: 'long_text_search',
										},
										suggest: {
											type: 'completion',
											analyzer: 'simple',
										},
									},
								},
								description: {
									type: 'text',
									analyzer: 'product_search',
									fields: {
										keyword: { type: 'keyword' },
									},
								},
								type: { type: 'keyword' },
								price: { type: 'float' },
								currency: { type: 'keyword' },
								industry: {
									type: 'text',
									analyzer: 'product_search',
									fields: {
										keyword: { type: 'keyword' },
									},
								},
								phone: { type: 'keyword' },
								email: { type: 'keyword' },
								address: {
									type: 'text',
									analyzer: 'product_search',
									fields: {
										keyword: { type: 'keyword' },
									},
								},
								inn: {
									type: 'keyword',
									fields: {
										text: {
											type: 'text',
											analyzer: 'keyword',
										},
									},
								},
								bitrixId: {
									type: 'keyword',
									fields: {
										text: {
											type: 'text',
											analyzer: 'keyword',
										},
									},
								},
								assignedById: {
									type: 'keyword',
									fields: {
										text: {
											type: 'text',
											analyzer: 'keyword',
										},
									},
								},
								createdAt: { type: 'date' },
								updatedAt: { type: 'date' },
								searchableText: {
									type: 'text',
									analyzer: 'product_search',
									fields: {
										keyword: { type: 'keyword' },
									},
								},
								tags: { type: 'keyword' },
								attributes: { type: 'object', dynamic: true },
								// Поле localId для связи с PostgreSQL (primary source of truth)
								localId: { type: 'keyword' },
								// === Поля для продуктов (Nomenclature) ===
								sku: {
									type: 'text',
									analyzer: 'product_search',
									fields: {
										keyword: { type: 'keyword' },
										exact: { type: 'text', analyzer: 'keyword' },
									},
								},
								categoryId: { type: 'keyword' },
								categoryName: {
									type: 'text',
									analyzer: 'product_search',
									fields: { keyword: { type: 'keyword' } },
								},
								unitCode: { type: 'keyword' },
								unitName: { type: 'keyword' },
								// === Поля для компаний (Company) ===
								shortName: {
									type: 'text',
									analyzer: 'product_search',
									fields: { keyword: { type: 'keyword' } },
								},
								companyType: { type: 'keyword' },
								additionalPhones: { type: 'keyword' },
								website: { type: 'keyword' },
								legalAddress: {
									type: 'text',
									analyzer: 'product_search',
									fields: { keyword: { type: 'keyword' } },
								},
								postalAddress: {
									type: 'text',
									analyzer: 'product_search',
									fields: { keyword: { type: 'keyword' } },
								},
								kpp: {
									type: 'keyword',
									fields: { text: { type: 'text', analyzer: 'keyword' } },
								},
								ogrn: {
									type: 'keyword',
									fields: { text: { type: 'text', analyzer: 'keyword' } },
								},
								bankName: { type: 'keyword' },
								bankBik: { type: 'keyword' },
								bankAccount: { type: 'keyword' },
								// === Поля для контактов (Contact) ===
								firstName: {
									type: 'text',
									analyzer: 'product_search',
									fields: { keyword: { type: 'keyword' } },
								},
								lastName: {
									type: 'text',
									analyzer: 'product_search',
									fields: { keyword: { type: 'keyword' } },
								},
								middleName: {
									type: 'text',
									analyzer: 'product_search',
									fields: { keyword: { type: 'keyword' } },
								},
								contactType: { type: 'keyword' },
								position: {
									type: 'text',
									analyzer: 'product_search',
									fields: { keyword: { type: 'keyword' } },
								},
								department: {
									type: 'text',
									analyzer: 'product_search',
									fields: { keyword: { type: 'keyword' } },
								},
								companyId: { type: 'keyword' },
								companyName: {
									type: 'text',
									analyzer: 'product_search',
									fields: { keyword: { type: 'keyword' } },
								},
								companyInn: { type: 'keyword' },
								isPrimary: { type: 'boolean' },
								// === Поля для submissions ===
								submissionNumber: {
									type: 'text',
									analyzer: 'product_search',
									fields: {
										keyword: { type: 'keyword' },
									},
								},
								userName: {
									type: 'text',
									analyzer: 'product_search',
									fields: {
										keyword: { type: 'keyword' },
									},
								},
								userEmail: { type: 'keyword' },
								formName: {
									type: 'text',
									analyzer: 'product_search',
									fields: {
										keyword: { type: 'keyword' },
									},
								},
								formTitle: {
									type: 'text',
									analyzer: 'product_search',
									fields: {
										keyword: { type: 'keyword' },
									},
								},
								status: { type: 'keyword' },
								priority: { type: 'keyword' },
								notes: {
									type: 'text',
									analyzer: 'product_search',
									fields: {
										keyword: { type: 'keyword' },
									},
								},
								formData: {
								type: 'object',
								dynamic: true,
								properties: {
									_periodMetadata: {
										type: 'object',
										enabled: true,
									},
								},
							},
						},
						dynamic_templates: [
							{
								// _periodMetadata как объект (должен идти первым!)
								periodmetadata_as_object: {
									path_match: 'formData._periodMetadata',
									mapping: {
										type: 'object',
										enabled: true,
									},
								},
							},
							{
								// Все остальные поля formData как text (избегаем float parsing)
								formdata_fields_as_text: {
									path_match: 'formData.*',
									mapping: {
										type: 'text',
									},
								},
							},
						],
					},
					settings: {
						// Оптимизация для производительности
							number_of_shards: 1,
							number_of_replicas: 0, // Отключаем реплики для single-node кластера
							refresh_interval: '30s', // Увеличиваем интервал обновления для лучшей производительности
							max_result_window: 100000, // Увеличиваем лимит результатов
							analysis: {
								analyzer: {
									russian: {
										type: 'custom',
										tokenizer: 'standard',
										filter: ['lowercase', 'russian_stop', 'russian_stemmer'],
									},
									// Улучшенный анализатор для поиска товаров
									product_search: {
										type: 'custom',
										tokenizer: 'standard',
										filter: [
											'lowercase',
											'russian_stop',
											'russian_stemmer',
											'product_synonyms',
											'product_edge_ngram',
										],
									},
									// Анализатор для автокомплита
									autocomplete: {
										type: 'custom',
										tokenizer: 'keyword',
										filter: ['lowercase', 'autocomplete_edge_ngram'],
									},
									// Анализатор для точного поиска
									exact_match: {
										type: 'custom',
										tokenizer: 'keyword',
										filter: ['lowercase'],
									},
									// Новый анализатор для длинных названий
									long_text_search: {
										type: 'custom',
										tokenizer: 'standard',
										filter: [
											'lowercase',
											'russian_stop',
											'russian_stemmer',
											'product_synonyms',
										],
									},
								},
								filter: {
									russian_stop: {
										type: 'stop',
										stopwords: '_russian_',
									},
									russian_stemmer: {
										type: 'stemmer',
										language: 'russian',
									},
									// Синонимы для товаров (только однословные термины)
									product_synonyms: {
										type: 'synonym',
										synonyms: [
											'доставка,транспорт,перевозка,логистика',
										],
									},
									// Edge n-gram для поиска товаров
									product_edge_ngram: {
										type: 'edge_ngram',
										min_gram: 2,
										max_gram: 20,
									},
									// Edge n-gram для автокомплита
									autocomplete_edge_ngram: {
										type: 'edge_ngram',
										min_gram: 1,
										max_gram: 15,
									},
								},
							},
						},
					},
				})

				logger.info('Elasticsearch index created successfully')
			}
		} catch (error) {
			logger.error('Failed to initialize Elasticsearch index:', error)
			throw error
		}
	}

	/**
	 * Индексация документа
	 */
	async indexDocument(document: SearchDocument): Promise<void> {
		try {
			await this.client.index({
				index: this.indexName,
				id: document.id,
				body: document,
			})
		} catch (error) {
			logger.error('Failed to index document:', error)
			throw error
		}
	}

	/**
	 * Индексация submission для поиска
	 */
	async indexSubmission(submission: any): Promise<void> {
		try {
			const searchableText = [
				submission.submissionNumber,
				submission.bitrixDealId, // Добавлен для поиска по Bitrix ID
				submission.userName,
				submission.userEmail,
				submission.formName,
				submission.formTitle,
				submission.title,
				submission.notes,
				submission.status,
				submission.priority,
				// Добавляем данные формы в поисковый текст
				...(submission.formData
					? Object.values(submission.formData).filter(
							v => typeof v === 'string'
					  )
					: []),
			]
				.filter(Boolean)
				.join(' ')

			// Очищаем formData от пустых значений
			const cleanedFormData = submission.formData
				? Object.fromEntries(
						Object.entries(submission.formData).filter(
							([key, value]) =>
								value !== null && value !== undefined && value !== ''
						)
				  )
				: {}

			const document: SearchDocument = {
				id: `submission_${submission.id}`,
				name: submission.title || submission.submissionNumber,
				description: submission.notes,
				type: 'submission',
				createdAt: submission.createdAt,
				updatedAt: submission.updatedAt,
				searchableText,
				tags: submission.tags || [],
				// Поля для submissions
				submissionNumber: submission.submissionNumber,
				bitrixId: submission.bitrixDealId, // Для точного поиска по Bitrix ID
				userName: submission.userName,
				userEmail: submission.userEmail,
				formName: submission.formName,
				formTitle: submission.formTitle,
				status: submission.status,
				priority: submission.priority,
				notes: submission.notes,
				formData: cleanedFormData,
			}

			await this.indexDocument(document)
		} catch (error) {
			logger.error('Failed to index submission:', error)
			throw error
		}
	}

	/**
	 * Массовая индексация документов (legacy метод)
	 */
	async bulkIndexLegacy(documents: SearchDocument[]): Promise<void> {
		try {
			const body = documents.flatMap(doc => [
				{ index: { _index: this.indexName, _id: doc.id } },
				doc,
			])

			await this.client.bulk({ body })
			logger.info(`Bulk indexed ${documents.length} documents`)
		} catch (error) {
			logger.error('Failed to bulk index documents:', error)
			throw error
		}
	}

	/**
	 * Удаление документа
	 */
	async deleteDocument(id: string): Promise<void> {
		try {
			await this.client.delete({
				index: this.indexName,
				id,
			})
		} catch (error) {
			logger.error('Failed to delete document:', error)
			throw error
		}
	}

	/**
	 * Удаление всего индекса
	 */
	async deleteIndex(): Promise<void> {
		try {
			const exists = await this.client.indices.exists({
				index: this.indexName,
			})

			if (exists) {
				await this.client.indices.delete({
					index: this.indexName,
				})
				logger.info(`Index ${this.indexName} deleted successfully`)
			} else {
				logger.info(`Index ${this.indexName} does not exist`)
			}
		} catch (error) {
			logger.error('Failed to delete index:', error)
			throw error
		}
	}

	/**
	 * Нормализация поискового запроса
	 */
	private normalizeQuery(query: string): string {
		return query
			.trim()
			.replace(/\s+/g, ' ') // Заменяем множественные пробелы на один
			.replace(/[^\w\s\u0400-\u04FF]/g, '') // Убираем спецсимволы, оставляем буквы, цифры, пробелы и кириллицу
			.toLowerCase()
	}

	/**
	 * Генерация ключа кэша для поискового запроса
	 */
	private getCacheKey(options: SearchOptions): string {
		const {
			query,
			type,
			limit = 30,
			offset = 0,
			fuzzy = true,
			assignedById,
			userId,
		} = options

		return `${query}_${type || 'all'}_${limit}_${offset}_${fuzzy}_${
			assignedById || ''
		}_${userId || ''}`
	}

	/**
	 * Получение результата из кэша
	 */
	private getCachedResult(cacheKey: string): SearchResult[] | null {
		const cached = this.searchCache.get(cacheKey)
		if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
			return cached.data
		}
		this.searchCache.delete(cacheKey)
		return null
	}

	/**
	 * Сохранение результата в кэш
	 */
	private setCachedResult(cacheKey: string, data: SearchResult[]): void {
		// Очищаем старые записи если кэш переполнен
		if (this.searchCache.size >= this.MAX_CACHE_SIZE) {
			const now = Date.now()
			for (const [key, value] of this.searchCache.entries()) {
				if (now - value.timestamp > this.CACHE_TTL) {
					this.searchCache.delete(key)
				}
			}
		}

		this.searchCache.set(cacheKey, { data, timestamp: Date.now() })
	}

	/**
	 * Очистка кэша поиска
	 */
	public clearSearchCache(): void {
		this.searchCache.clear()
		logger.info('Search cache cleared')
	}

	/**
	 * Поиск документов - оптимизированная версия для быстрого поиска
	 */
	async search(options: SearchOptions): Promise<SearchResult[]> {
		try {
			const {
				query,
				type,
				limit = 30,
				offset = 0,
				includeHighlights = true,
				fuzzy = true,
				assignedById,
				userId,
			} = options

			// Проверяем кэш для быстрых результатов
			const cacheKey = this.getCacheKey(options)
			const cachedResult = this.getCachedResult(cacheKey)
			if (cachedResult) {
				logger.debug(`Cache hit for query: ${query}`)
				return cachedResult
			}

			// Определяем стратегию поиска на основе длины запроса
			const queryLength = query.trim().length
			const isLongQuery = queryLength > 20
			const isShortQuery = queryLength < 5

			const searchBody: any = {
				query: {
					function_score: {
						query: {
							bool: {
								must: [],
								filter: [],
								should: [],
							},
						},
						functions: [
							// Бустинг для новых документов
							{
								filter: {
									range: {
										createdAt: {
											gte: 'now-30d',
										},
									},
								},
								weight: 1.2,
							},
							// Бустинг для обновленных документов
							{
								filter: {
									range: {
										updatedAt: {
											gte: 'now-7d',
										},
									},
								},
								weight: 1.1,
							},
							// Бустинг для документов с высоким приоритетом (для submissions)
							{
								filter: {
									term: { priority: 'high' },
								},
								weight: 1.3,
							},
							// Бустинг для активных статусов
							{
								filter: {
									terms: {
										status: ['NEW', 'IN_PROCESS', 'PENDING'],
									},
								},
								weight: 1.15,
							},
						],
						score_mode: 'multiply',
						boost_mode: 'multiply',
						// Добавляем минимальный score для фильтрации нерелевантных результатов
						min_score: 0.5,
					},
				},
				size: limit,
				from: offset,
				sort: [{ _score: { order: 'desc' } }, { updatedAt: { order: 'desc' } }],
			}

			// Фильтр по типу
			if (type) {
				searchBody.query.function_score.query.bool.filter.push({
					term: { type },
				})
			}

			// Фильтр по ответственному пользователю (только для компаний)
			if (assignedById && type === 'company') {
				searchBody.query.function_score.query.bool.filter.push({
					term: { assignedById },
				})
			}

			// Фильтр по пользователю (для submissions)
			if (userId && type === 'submission') {
				searchBody.query.function_score.query.bool.filter.push({
					term: { userId },
				})
			}

			// Поисковый запрос
			if (query.trim()) {
				const originalQuery = query.trim()
				const normalizedQuery = this.normalizeQuery(query)

				// Проверяем, является ли запрос числовым Bitrix ID
				const isNumericBitrixId = /^\d+$/.test(originalQuery)

				if (isNumericBitrixId) {
					// Для числовых ID ищем точное совпадение в поле bitrixId или inn
					searchBody.query.function_score.query.bool.must.push({
						bool: {
							should: [
								{ term: { bitrixId: originalQuery } },
								{ term: { inn: originalQuery } },
							],
							minimum_should_match: 1,
						},
					})
				} else {
					// Оптимизированная стратегия поиска в зависимости от длины запроса
					const searchQuery = this.buildOptimizedSearchQuery(
						originalQuery,
						normalizedQuery,
						isLongQuery,
						isShortQuery,
						fuzzy
					)

					searchBody.query.function_score.query.bool.must.push(searchQuery)
				}
			} else {
				// Если запрос пустой, возвращаем все документы
				searchBody.query.function_score.query.bool.must.push({ match_all: {} })
			}

			// Подсветка результатов
			if (includeHighlights) {
				searchBody.highlight = {
					fields: {
						name: { fragment_size: 150 },
						'name.autocomplete': { fragment_size: 150 },
						description: { fragment_size: 150 },
						searchableText: { fragment_size: 150 },
						industry: { fragment_size: 150 },
						address: { fragment_size: 150 },
						submissionNumber: { fragment_size: 150 },
						userName: { fragment_size: 150 },
						formName: { fragment_size: 150 },
						formTitle: { fragment_size: 150 },
						notes: { fragment_size: 150 },
					},
					pre_tags: ['<mark>'],
					post_tags: ['</mark>'],
					number_of_fragments: 3,
				}
			}

			const response = await this.client.search({
				index: this.aliasName, // Используем алиас для поиска
				body: searchBody,
			})

			const results = response.hits.hits.map((hit: any) => ({
				id: hit._source.id,
				name: hit._source.name,
				description: hit._source.description,
				type: hit._source.type,
				price: hit._source.price,
				currency: hit._source.currency,
				industry: hit._source.industry,
				phone: hit._source.phone,
				email: hit._source.email,
				address: hit._source.address,
				inn: hit._source.inn,
				bitrixId: hit._source.bitrixId,
				assignedById: hit._source.assignedById,
				score: hit._score,
				highlight: hit.highlight,
				submissionNumber: hit._source.submissionNumber,
				userName: hit._source.userName,
				userEmail: hit._source.userEmail,
				formName: hit._source.formName,
				formTitle: hit._source.formTitle,
				status: hit._source.status,
				priority: hit._source.priority,
				notes: hit._source.notes,
				formData: hit._source.formData,
			}))

			// Сохраняем результат в кэш
			this.setCachedResult(cacheKey, results)

			return results
		} catch (error) {
			const { message, stack, status } = getErrorInfo(error)

			logger.error('Elasticsearch search error:', {
				query: options.query,
				type: options.type,
				error: message,
				stack,
			})

			// Если это временная ошибка, пробуем еще раз
			if (shouldRetryElasticsearchRequest(status)) {
				logger.warn('Retrying Elasticsearch search due to temporary error...')
				await new Promise(resolve => setTimeout(resolve, 1000)) // Ждем 1 секунду
				return this.search(options) // Рекурсивный вызов
			}

			throw error
		}
	}

	/**
	 * Построение оптимизированного поискового запроса в зависимости от длины запроса
	 */
	private buildOptimizedSearchQuery(
		originalQuery: string,
		normalizedQuery: string,
		isLongQuery: boolean,
		isShortQuery: boolean,
		fuzzy: boolean
	): any {
		const queryLower = originalQuery.toLowerCase()

		if (isLongQuery) {
			// Для длинных запросов используем оптимизированную стратегию
			return {
				bool: {
					should: [
						// Точное совпадение в названии (самый высокий приоритет)
						{
							match_phrase: {
								name: {
									query: queryLower,
									boost: 20, // Увеличиваем boost для точных совпадений
								},
							},
						},
						// Поиск по длинному тексту (специальный анализатор)
						{
							match: {
								'name.long_text': {
									query: queryLower,
									operator: 'and',
									boost: 10,
								},
							},
						},
						// Поиск по всем словам в названии
						{
							match: {
								name: {
									query: queryLower,
									operator: 'and',
									boost: 8,
								},
							},
						},
						// Multi-match только по основным полям с меньшим fuzziness
						{
							multi_match: {
								query: queryLower,
								fields: [
									'name^5',
									'name.long_text^4',
									'description^2',
									'searchableText^2',
									'submissionNumber^3',
									'userName^2',
									'formName^2',
								],
								type: 'best_fields',
								fuzziness: fuzzy ? 1 : 0,
								boost: 3,
							},
						},
						// Поиск по частичным совпадениям (только для длинных запросов)
						{
							wildcard: {
								name: {
									value: `*${normalizedQuery.toLowerCase()}*`,
									boost: 1.5,
								},
							},
						},
					],
					minimum_should_match: 1,
				},
			}
		} else if (isShortQuery) {
			// Для коротких запросов используем более агрессивный поиск
			return {
				bool: {
					should: [
						// Точное совпадение в названии
						{
							match_phrase: {
								name: {
									query: queryLower,
									boost: 8,
								},
							},
						},
						// Автокомплит поиск
						{
							match: {
								'name.autocomplete': {
									query: queryLower,
									boost: 6,
								},
							},
						},
						// Multi-match с большим fuzziness для коротких запросов
						{
							multi_match: {
								query: queryLower,
								fields: [
									'name^4',
									'name.autocomplete^3',
									'description^2',
									'searchableText^2',
									'inn^3',
									'submissionNumber^3',
									'userName^2',
									'formName^2',
								],
								type: 'best_fields',
								fuzziness: fuzzy ? 2 : 0,
								fuzzy_transpositions: true,
								boost: 2,
							},
						},
						// Нечеткий поиск для опечаток
						{
							fuzzy: {
								name: {
									value: queryLower,
									fuzziness: 2,
									boost: 1,
								},
							},
						},
					],
					minimum_should_match: 1,
				},
			}
		} else {
			// Для средних запросов используем сбалансированную стратегию
			return {
				bool: {
					should: [
						// Точное совпадение в названии
						{
							match_phrase: {
								name: {
									query: queryLower,
									boost: 8,
								},
							},
						},
						// Точное совпадение с использованием exact анализатора
						{
							match: {
								'name.exact': {
									query: queryLower,
									boost: 15, // Увеличиваем boost для точных совпадений
								},
							},
						},
						// Автокомплит поиск
						{
							match: {
								'name.autocomplete': {
									query: queryLower,
									boost: 5,
								},
							},
						},
						// Multi-match по всем полям
						{
							multi_match: {
								query: queryLower,
								fields: [
									'name^4',
									'name.autocomplete^3',
									'description^2.5',
									'searchableText^2',
									'industry^2',
									'address^1.5',
									'inn^3',
									'submissionNumber^3',
									'userName^2.5',
									'formName^2.5',
									'formTitle^2.5',
									'notes^2',
								],
								type: 'best_fields',
								fuzziness: fuzzy ? 1 : 0,
								fuzzy_transpositions: true,
								boost: 2,
							},
						},
						// Wildcard поиск для частичных совпадений
						{
							wildcard: {
								name: {
									value: `*${normalizedQuery.toLowerCase()}*`,
									boost: 1.5,
								},
							},
						},
						// Поиск без пробелов
						{
							wildcard: {
								name: {
									value: `*${originalQuery.replace(/\s+/g, '').toLowerCase()}*`,
									boost: 1.2,
								},
							},
						},
					],
					minimum_should_match: 1,
				},
			}
		}
	}

	/**
	 * Автодополнение - улучшенная версия
	 */
	async suggest(query: string, type?: string): Promise<string[]> {
		try {
			// Используем обычный поиск с автокомплит полем для лучших результатов
			const searchBody: any = {
				query: {
					bool: {
						must: [
							{
								match: {
									'name.autocomplete': {
										query: query,
										boost: 1,
									},
								},
							},
						],
						filter: [],
					},
				},
				size: 10,
				_source: ['name'],
				sort: [{ _score: { order: 'desc' } }],
			}

			if (type) {
				searchBody.query.bool.filter.push({ term: { type } })
			}

			const response = await this.client.search({
				index: this.aliasName, // Используем алиас для поиска
				body: searchBody,
			})

			// Извлекаем уникальные названия
			const suggestions = new Set<string>()
			response.hits.hits.forEach((hit: any) => {
				if (hit._source.name) {
					suggestions.add(hit._source.name)
				}
			})

			return Array.from(suggestions).slice(0, 10)
		} catch (error) {
			logger.error('Suggest failed:', error)
			return []
		}
	}

	/**
	 * Агрегация по типам
	 */
	async getTypeAggregations(): Promise<Record<string, number>> {
		try {
			const response = await this.client.search({
				index: this.indexName,
				body: {
					size: 0,
					aggs: {
						types: {
							terms: {
								field: 'type',
								size: 10,
							},
						},
					},
				},
			})

			const aggregations = response.aggregations.types as any
			const buckets = aggregations.buckets
			return buckets.reduce((acc: Record<string, number>, bucket: any) => {
				acc[bucket.key] = bucket.doc_count
				return acc
			}, {})
		} catch (error) {
			logger.error('Aggregation failed:', error)
			return {}
		}
	}

	/**
	 * Проверка здоровья Elasticsearch
	 */
	async healthCheck(): Promise<boolean> {
		try {
			const response = await this.client.cluster.health()
			// Для single-node кластера принимаем также статус 'red' если есть активные шарды
			return (
				response.status === 'green' ||
				response.status === 'yellow' ||
				(response.status === 'red' && response.active_shards > 0)
			)
		} catch (error) {
			logger.error('Elasticsearch health check failed:', error)
			return false
		}
	}

	/**
	 * Получение статистики индекса
	 */
	async getIndexStats(): Promise<any> {
		try {
			const response = await this.client.indices.stats({
				index: this.aliasName, // Используем алиас для получения статистики
			})
			// Получаем статистику для всех индексов, на которые указывает алиас
			const indexNames = Object.keys(response.indices)
			if (indexNames.length > 0) {
				return response.indices[indexNames[0]]
			}
			return null
		} catch (error) {
			logger.error('Failed to get index stats:', error)
			return null
		}
	}

	/**
	 * Очистка всех документов из индекса
	 */
	async clearIndex(): Promise<void> {
		try {
			logger.info(`🧹 Очищаем индекс ${this.indexName}...`)

			// Удаляем все документы из индекса
			await this.client.deleteByQuery({
				index: this.indexName,
				body: {
					query: {
						match_all: {},
					},
				},
				refresh: true,
			})

			logger.info(`✅ Индекс ${this.indexName} очищен`)
		} catch (error) {
			logger.error('Failed to clear index:', error)
			throw error
		}
	}

	/**
	 * Создание нового индекса с временным именем
	 */
	async createTemporaryIndex(): Promise<string> {
		try {
			const tempIndexName = `${this.indexName}_temp_${Date.now()}`

			await this.client.indices.create({
				index: tempIndexName,
				body: {
					mappings: {
						properties: {
							id: { type: 'keyword' },
							name: {
								type: 'text',
								analyzer: 'product_search',
								fields: {
									keyword: { type: 'keyword' },
									exact: {
										type: 'text',
										analyzer: 'exact_match',
									},
									autocomplete: {
										type: 'text',
										analyzer: 'autocomplete',
									},
									suggest: {
										type: 'completion',
										analyzer: 'simple',
									},
								},
							},
							description: {
								type: 'text',
								analyzer: 'product_search',
								fields: {
									keyword: { type: 'keyword' },
								},
							},
							type: { type: 'keyword' },
							price: { type: 'float' },
							currency: { type: 'keyword' },
							industry: {
								type: 'text',
								analyzer: 'product_search',
								fields: {
									keyword: { type: 'keyword' },
								},
							},
							phone: { type: 'keyword' },
							email: { type: 'keyword' },
							address: {
								type: 'text',
								analyzer: 'product_search',
								fields: {
									keyword: { type: 'keyword' },
								},
							},
							inn: {
								type: 'keyword',
								fields: {
									text: {
										type: 'text',
										analyzer: 'keyword',
									},
								},
							},
							bitrixId: {
								type: 'keyword',
								fields: {
									text: {
										type: 'text',
										analyzer: 'keyword',
									},
								},
							},
							assignedById: {
								type: 'keyword',
								fields: {
									text: {
										type: 'text',
										analyzer: 'keyword',
									},
								},
							},
							status: { type: 'keyword' },
							priority: { type: 'keyword' },
							tags: { type: 'keyword' },
							attributes: { type: 'object', dynamic: true },
							// Поле localId для связи с PostgreSQL
							localId: { type: 'keyword' },
							// Поля для продуктов
							sku: { type: 'text', fields: { keyword: { type: 'keyword' } } },
							categoryId: { type: 'keyword' },
							categoryName: { type: 'text' },
							unitCode: { type: 'keyword' },
							unitName: { type: 'keyword' },
							// Поля для компаний
							shortName: { type: 'text' },
							companyType: { type: 'keyword' },
							additionalPhones: { type: 'keyword' },
							website: { type: 'keyword' },
							legalAddress: { type: 'text' },
							postalAddress: { type: 'text' },
							kpp: { type: 'keyword' },
							ogrn: { type: 'keyword' },
							bankName: { type: 'keyword' },
							bankBik: { type: 'keyword' },
							bankAccount: { type: 'keyword' },
							// Поля для контактов
							firstName: { type: 'text' },
							lastName: { type: 'text' },
							middleName: { type: 'text' },
							contactType: { type: 'keyword' },
							position: { type: 'text' },
							department: { type: 'text' },
							companyId: { type: 'keyword' },
							companyName: { type: 'text' },
							companyInn: { type: 'keyword' },
							isPrimary: { type: 'boolean' },
							formData: {
								type: 'object',
								dynamic: true,
								properties: {
									_periodMetadata: {
										type: 'object',
										enabled: true,
									},
								},
							},
							submissionNumber: { type: 'keyword' },
							userName: { type: 'text' },
							userEmail: { type: 'keyword' },
							formName: { type: 'text' },
							formTitle: { type: 'text' },
							notes: { type: 'text' },
							createdAt: { type: 'date' },
							updatedAt: { type: 'date' },
							searchableText: {
								type: 'text',
								analyzer: 'product_search',
							},
						},
						dynamic_templates: [
							{
								periodmetadata_as_object: {
									path_match: 'formData._periodMetadata',
									mapping: {
										type: 'object',
										enabled: true,
									},
								},
							},
							{
								formdata_fields_as_text: {
									path_match: 'formData.*',
									mapping: {
										type: 'text',
									},
								},
							},
						],
					},
					settings: {
						number_of_replicas: 0, // Отключаем реплики для single-node кластера
						analysis: {
							analyzer: {
								product_search: {
									type: 'custom',
									tokenizer: 'standard',
									filter: ['lowercase', 'russian_stop', 'russian_stemmer'],
								},
								exact_match: {
									type: 'custom',
									tokenizer: 'keyword',
									filter: ['lowercase'],
								},
								autocomplete: {
									type: 'custom',
									tokenizer: 'autocomplete_tokenizer',
									filter: ['lowercase'],
								},
							},
							tokenizer: {
								autocomplete_tokenizer: {
									type: 'edge_ngram',
									min_gram: 1,
									max_gram: 20,
									token_chars: ['letter', 'digit'],
								},
							},
							filter: {
								russian_stop: {
									type: 'stop',
									stopwords: '_russian_',
								},
								russian_stemmer: {
									type: 'stemmer',
									language: 'russian',
								},
							},
						},
					},
				},
			})

			logger.info(`✅ Создан временный индекс: ${tempIndexName}`)
			return tempIndexName
		} catch (error) {
			logger.error('Failed to create temporary index:', error)
			throw error
		}
	}

	/**
	 * Переключение алиаса на новый индекс
	 */
	async switchAlias(newIndexName: string): Promise<void> {
		try {
			logger.info(
				`🔄 Переключаем алиас ${this.aliasName} на индекс ${newIndexName}...`
			)

			// Получаем текущие алиасы
			const currentAliases = await this.client.indices.getAlias({
				name: this.aliasName,
			})

			const actions: any[] = []

			// Удаляем алиас со всех старых индексов
			for (const indexName of Object.keys(currentAliases)) {
				actions.push({
					remove: {
						index: indexName,
						alias: this.aliasName,
					},
				})
			}

			// Добавляем алиас на новый индекс
			actions.push({
				add: {
					index: newIndexName,
					alias: this.aliasName,
				},
			})

			await this.client.indices.updateAliases({
				body: {
					actions,
				},
			})

			logger.info(`✅ Алиас ${this.aliasName} переключен на ${newIndexName}`)
		} catch (error) {
			logger.error('Failed to switch alias:', error)
			throw error
		}
	}

	/**
	 * Удаление старого индекса после переключения алиаса
	 */
	async deleteOldIndex(oldIndexName: string): Promise<void> {
		try {
			logger.info(`🗑️ Удаляем старый индекс: ${oldIndexName}`)

			await this.client.indices.delete({
				index: oldIndexName,
			})

			logger.info(`✅ Старый индекс ${oldIndexName} удален`)
		} catch (error) {
			logger.error(`Failed to delete old index ${oldIndexName}:`, error)
			throw error
		}
	}

	/**
	 * Получение имени текущего индекса через алиас
	 */
	async getCurrentIndexName(): Promise<string> {
		try {
			const aliases = await this.client.indices.getAlias({
				name: this.aliasName,
			})

			const indexNames = Object.keys(aliases)
			if (indexNames.length === 0) {
				throw new Error(`No index found for alias ${this.aliasName}`)
			}

			return indexNames[0]
		} catch (error) {
			logger.error('Failed to get current index name:', error)
			throw error
		}
	}

	/**
	 * Инициализация алиаса (создание если не существует)
	 */
	async initializeAlias(): Promise<void> {
		try {
			// Проверяем, существует ли алиас
			const aliasExists = await this.client.indices.existsAlias({
				name: this.aliasName,
			})

			if (!aliasExists) {
				// Если алиас не существует, создаем его и указываем на основной индекс
				await this.client.indices.putAlias({
					index: this.indexName,
					name: this.aliasName,
				})
				logger.info(
					`✅ Создан алиас ${this.aliasName} для индекса ${this.indexName}`
				)
			} else {
				logger.info(`✅ Алиас ${this.aliasName} уже существует`)
			}
		} catch (error) {
			logger.error('Failed to initialize alias:', error)
			throw error
		}
	}

	/**
	 * Инкрементальное обновление документа
	 */
	async upsertDocument(document: SearchDocument): Promise<void> {
		try {
			await this.client.index({
				index: this.aliasName, // Используем алиас для поиска
				id: document.id,
				body: document,
				refresh: false, // Не обновляем индекс сразу для производительности
			})
		} catch (error) {
			logger.error(`Failed to upsert document ${document.id}:`, error)
			throw error
		}
	}

	/**
	 * Массовое инкрементальное обновление документов
	 */
	async bulkUpsert(documents: SearchDocument[]): Promise<void> {
		try {
			const body = documents.flatMap(doc => [
				{ index: { _index: this.aliasName, _id: doc.id } },
				doc,
			])

			const response = await this.client.bulk({
				body,
				refresh: false, // Не обновляем индекс сразу для производительности
			})

			// Проверяем наличие ошибок в ответе
			if (response.errors) {
				const failedItems = response.items.filter(
					(item: any) => item.index?.error || item.create?.error || item.update?.error
				)
				if (failedItems.length > 0) {
					logger.error(`Bulk upsert had ${failedItems.length} failures:`,
						failedItems.slice(0, 5).map((item: any) => ({
							id: item.index?._id || item.create?._id || item.update?._id,
							error: item.index?.error || item.create?.error || item.update?.error
						}))
					)
				}
			}

			logger.info(`Bulk upserted ${documents.length} documents`)
		} catch (error) {
			logger.error('Failed to bulk upsert documents:', error)
			throw error
		}
	}

	/**
	 * Обновление индекса для поиска
	 */
	async refreshIndex(): Promise<void> {
		try {
			await this.client.indices.refresh({
				index: this.aliasName,
			})
			logger.info('Index refreshed for search')
		} catch (error) {
			logger.error('Failed to refresh index:', error)
			throw error
		}
	}

	/**
	 * Массовая индексация в конкретный индекс (для временных индексов)
	 */
	async bulkIndex(
		documents: SearchDocument[],
		indexName?: string
	): Promise<void> {
		try {
			const targetIndex = indexName || this.aliasName
			const body = documents.flatMap(doc => [
				{ index: { _index: targetIndex, _id: doc.id } },
				doc,
			])

			await this.client.bulk({
				body,
				refresh: false,
			})

			logger.info(
				`Bulk indexed ${documents.length} documents to ${targetIndex}`
			)
		} catch (error) {
			logger.error('Failed to bulk index documents:', error)
			throw error
		}
	}

	/**
	 * Получение документа по ID из Elasticsearch
	 */
	async getDocumentById(documentId: string): Promise<SearchDocument | null> {
		try {
			const response = await this.client.get({
				index: this.aliasName,
				id: documentId,
			})

			if (response.found) {
				return response._source as SearchDocument
			}

			return null
		} catch (error) {
			if (isNotFoundError(error)) {
				return null
			}

			if (isClusterBlockedError(error)) {
				logger.error(
					`Elasticsearch cluster is read-only (disk watermark) while fetching ${documentId}`,
					error
				)
			} else {
				logger.error('Failed to get document by ID:', error)
			}
			throw error
		}
	}

	/**
	 * Получение данных полей формы для заявки из Elasticsearch
	 */
	async getSubmissionFormFields(
		submissionId: string
	): Promise<Record<string, any> | null> {
		try {
			const documentId = `submission_${submissionId}`
			logger.info(`[ELASTICSEARCH] Получение formData для заявки: ${submissionId} (documentId: ${documentId})`)
			const document = await this.getDocumentById(documentId)

			logger.info(`[ELASTICSEARCH] Документ найден: ${!!document}, formData есть: ${!!document?.formData}`)
			if (document?.formData) {
				logger.info(`[ELASTICSEARCH] formData keys: ${Object.keys(document.formData).join(', ')}`)
			}

			if (document && document.formData) {
				return document.formData
			}

			return null
		} catch (error) {
			logger.error('Failed to get submission form fields:', error)
			return null
		}
	}
}

export { ElasticsearchService }
export const elasticsearchService = new ElasticsearchService()
