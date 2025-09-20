import { Client } from '@elastic/elasticsearch'
import { logger } from '../utils/logger'

export interface SearchDocument {
	id: string
	name: string
	description?: string
	type: 'product' | 'company' | 'contact' | 'submission'
	price?: number
	currency?: string
	industry?: string
	phone?: string
	email?: string
	address?: string
	inn?: string // ИНН компании
	bitrixId?: string // Bitrix ID для прямого поиска
	assignedById?: string // ID ответственного пользователя
	createdAt: string
	updatedAt: string
	// Дополнительные поля для поиска
	searchableText: string
	tags?: string[]
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
	price?: number
	currency?: string
	industry?: string
	phone?: string
	email?: string
	address?: string
	inn?: string // ИНН компании
	bitrixId?: string // Bitrix ID для прямого поиска
	assignedById?: string // ID ответственного пользователя
	score: number
	highlight?: {
		name?: string[]
		description?: string[]
		searchableText?: string[]
		submissionNumber?: string[]
		userName?: string[]
		formName?: string[]
		notes?: string[]
	}
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
}

class ElasticsearchService {
	private client: Client
	private readonly indexName = 'beton_crm_search'
	private readonly aliasName = 'beton_crm_search_alias'

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
								// Поля для submissions
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
								formData: { type: 'object' },
							},
						},
						settings: {
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
									// Синонимы для товаров
									product_synonyms: {
										type: 'synonym',
										synonyms: [
											'бетон,цемент,раствор',
											'песок,песчаный,песчаная',
											'щебень,гравий,камень',
											'арматура,металл,сталь',
											'доставка,транспорт,перевозка',
											'м300,м-300,марка 300',
											'м400,м-400,марка 400',
											'м500,м-500,марка 500',
											'фундамент,основание,база',
											'строительство,стройка,возведение',
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
				id: submission.id,
				name: submission.title || submission.submissionNumber,
				description: submission.notes,
				type: 'submission',
				createdAt: submission.createdAt,
				updatedAt: submission.updatedAt,
				searchableText,
				tags: submission.tags || [],
				// Поля для submissions
				submissionNumber: submission.submissionNumber,
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
	 * Поиск документов - оптимизированная версия
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
			} = options

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
						],
						score_mode: 'multiply',
						boost_mode: 'multiply',
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
					// Создаем несколько вариантов поиска для лучшего покрытия
					const searchVariants = [
						originalQuery, // Оригинальный запрос
						normalizedQuery, // Нормализованный запрос
						originalQuery.replace(/\s+/g, ''), // Без пробелов
						originalQuery.replace(/\s+/g, ' '), // С одним пробелом
					].filter((variant, index, array) => array.indexOf(variant) === index) // Убираем дубликаты

					const searchQuery = {
						bool: {
							should: [
								// Точное совпадение в названии (высокий приоритет)
								{
									match_phrase: {
										name: {
											query: originalQuery.toLowerCase(), // Приводим к нижнему регистру
											boost: 5,
										},
									},
								},
								// Точное совпадение с использованием exact анализатора
								{
									match: {
										'name.exact': {
											query: originalQuery.toLowerCase(), // Приводим к нижнему регистру
											boost: 4.5,
										},
									},
								},
								// Автокомплит поиск
								{
									match: {
										'name.autocomplete': {
											query: originalQuery.toLowerCase(), // Приводим к нижнему регистру
											boost: 4,
										},
									},
								},
								// Multi-match по всем полям с разными вариантами и улучшенной обработкой опечаток
								...searchVariants.map(variant => ({
									multi_match: {
										query: variant.toLowerCase(), // Приводим к нижнему регистру
										fields: [
											'name^4',
											'name.autocomplete^3.5',
											'description^2.5',
											'searchableText^2',
											'industry^2',
											'address^1.5',
											'inn^3',
											'submissionNumber^3.5',
											'userName^3',
											'formName^2.5',
											'formTitle^2.5',
											'notes^2',
										],
										type: 'best_fields',
										fuzziness: fuzzy ? 2 : 0, // Увеличиваем fuzziness до 2 для лучшего поиска опечаток
										fuzzy_transpositions: true,
										prefix_length: 0, // Убираем prefix_length для лучшего поиска в начале слова
										max_expansions: 100, // Увеличиваем max_expansions
										boost: variant === originalQuery ? 1 : 0.8,
									},
								})),
								// Wildcard поиск для частичных совпадений
								{
									wildcard: {
										name: {
											value: `*${normalizedQuery.toLowerCase()}*`, // Приводим к нижнему регистру
											boost: 1.5,
										},
									},
								},
								{
									wildcard: {
										searchableText: {
											value: `*${normalizedQuery.toLowerCase()}*`, // Приводим к нижнему регистру
											boost: 1,
										},
									},
								},
								// Поиск без пробелов для случаев типа "бств12"
								{
									wildcard: {
										name: {
											value: `*${originalQuery
												.replace(/\s+/g, '')
												.toLowerCase()}*`, // Приводим к нижнему регистру
											boost: 1.2,
										},
									},
								},
								// Дополнительный нечеткий поиск для опечаток в начале слова
								{
									fuzzy: {
										name: {
											value: originalQuery.toLowerCase(),
											fuzziness: 2,
											boost: 0.8,
										},
									},
								},
							],
							minimum_should_match: 1,
						},
					}

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

			return response.hits.hits.map((hit: any) => ({
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
		} catch (error) {
			logger.error('Elasticsearch search error:', {
				query: options.query,
				type: options.type,
				error: error.message,
				stack: error.stack,
			})

			// Если это временная ошибка, пробуем еще раз
			if (
				error.status === 429 ||
				error.status === 503 ||
				error.status === 504
			) {
				logger.warn('Retrying Elasticsearch search due to temporary error...')
				await new Promise(resolve => setTimeout(resolve, 1000)) // Ждем 1 секунду
				return this.search(options) // Рекурсивный вызов
			}

			throw error
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
							formData: { type: 'object' },
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
					},
					settings: {
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

			await this.client.bulk({
				body,
				refresh: false, // Не обновляем индекс сразу для производительности
			})

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
}

export { ElasticsearchService }
export const elasticsearchService = new ElasticsearchService()
