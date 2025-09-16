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
	bitrixId?: string // Bitrix ID для прямого поиска
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
	bitrixId?: string // Bitrix ID для прямого поиска
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
}

class ElasticsearchService {
	private client: Client
	private readonly indexName = 'beton_crm_search'

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
									analyzer: 'russian',
									fields: {
										keyword: { type: 'keyword' },
										suggest: {
											type: 'completion',
											analyzer: 'simple',
										},
									},
								},
								description: {
									type: 'text',
									analyzer: 'russian',
								},
								type: { type: 'keyword' },
								price: { type: 'float' },
								currency: { type: 'keyword' },
								industry: {
									type: 'text',
									analyzer: 'russian',
									fields: {
										keyword: { type: 'keyword' },
									},
								},
								phone: { type: 'keyword' },
								email: { type: 'keyword' },
								address: {
									type: 'text',
									analyzer: 'russian',
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
								createdAt: { type: 'date' },
								updatedAt: { type: 'date' },
								searchableText: {
									type: 'text',
									analyzer: 'russian',
								},
								tags: { type: 'keyword' },
								// Поля для submissions
								submissionNumber: {
									type: 'text',
									analyzer: 'russian',
									fields: {
										keyword: { type: 'keyword' },
									},
								},
								userName: {
									type: 'text',
									analyzer: 'russian',
									fields: {
										keyword: { type: 'keyword' },
									},
								},
								userEmail: { type: 'keyword' },
								formName: {
									type: 'text',
									analyzer: 'russian',
									fields: {
										keyword: { type: 'keyword' },
									},
								},
								formTitle: {
									type: 'text',
									analyzer: 'russian',
								},
								status: { type: 'keyword' },
								priority: { type: 'keyword' },
								notes: {
									type: 'text',
									analyzer: 'russian',
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
				formData: submission.formData,
			}

			await this.indexDocument(document)
		} catch (error) {
			logger.error('Failed to index submission:', error)
			throw error
		}
	}

	/**
	 * Массовая индексация документов
	 */
	async bulkIndex(documents: SearchDocument[]): Promise<void> {
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
	 * Поиск документов
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
			} = options

			console.log('Elasticsearch search called with:', {
				query,
				type,
				limit,
				offset,
			})

			const searchBody: any = {
				query: {
					bool: {
						must: [],
					},
				},
				size: limit,
				from: offset,
				sort: [{ _score: { order: 'desc' } }, { updatedAt: { order: 'desc' } }],
			}

			// Фильтр по типу
			if (type) {
				searchBody.query.bool.filter = [{ term: { type } }]
			}

			// Поисковый запрос
			if (query.trim()) {
				const trimmedQuery = query.trim()

				// Проверяем, является ли запрос числовым Bitrix ID
				const isNumericBitrixId = /^\d+$/.test(trimmedQuery)

				if (isNumericBitrixId) {
					// Для числовых ID ищем точное совпадение в поле bitrixId
					console.log(`🔍 Elasticsearch: Поиск по Bitrix ID "${trimmedQuery}"`)
					searchBody.query.bool.must.push({
						term: {
							bitrixId: trimmedQuery,
						},
					})
				} else {
					// Основной поиск с multi_match для текстовых запросов
					const mainSearchQuery = {
						multi_match: {
							query: trimmedQuery,
							fields: [
								'name^3', // Название имеет больший вес
								'description^2', // Описание имеет средний вес
								'searchableText^1', // Общий текст имеет базовый вес
								'industry^1.5', // Отрасль имеет повышенный вес
								'address^1',
								// Поля для submissions
								'submissionNumber^3', // Номер заявки имеет больший вес
								'userName^2.5', // Имя пользователя имеет повышенный вес
								'formName^2', // Название формы имеет средний вес
								'formTitle^2', // Заголовок формы имеет средний вес
								'notes^1.5', // Заметки имеют повышенный вес
							],
							type: 'best_fields',
							fuzziness: fuzzy ? 'AUTO' : 0,
							prefix_length: 2,
						},
					}

					// Дополнительный поиск по частичным словам с regexp
					const regexpQuery = {
						bool: {
							should: [
								{
									regexp: { name: { value: `.*${trimmedQuery}.*`, boost: 2 } },
								},
								{
									regexp: {
										description: { value: `.*${trimmedQuery}.*`, boost: 1.5 },
									},
								},
								{
									regexp: {
										searchableText: { value: `.*${trimmedQuery}.*`, boost: 1 },
									},
								},
								{
									regexp: {
										industry: { value: `.*${trimmedQuery}.*`, boost: 1.5 },
									},
								},
								{
									regexp: {
										address: { value: `.*${trimmedQuery}.*`, boost: 1 },
									},
								},
								// Поля для submissions
								{
									regexp: {
										submissionNumber: {
											value: `.*${trimmedQuery}.*`,
											boost: 2,
										},
									},
								},
								{
									regexp: {
										userName: { value: `.*${trimmedQuery}.*`, boost: 2 },
									},
								},
								{
									regexp: {
										formName: { value: `.*${trimmedQuery}.*`, boost: 1.5 },
									},
								},
								{
									regexp: {
										formTitle: { value: `.*${trimmedQuery}.*`, boost: 1.5 },
									},
								},
								{
									regexp: {
										notes: { value: `.*${trimmedQuery}.*`, boost: 1.5 },
									},
								},
							],
							minimum_should_match: 1,
						},
					}

					// Объединяем основной поиск и regexp поиск
					searchBody.query.bool.must.push({
						bool: {
							should: [mainSearchQuery, regexpQuery],
							minimum_should_match: 1,
						},
					})
				}
			} else {
				// Если запрос пустой, возвращаем все документы
				searchBody.query.bool.must.push({ match_all: {} })
			}

			// Подсветка результатов
			if (includeHighlights) {
				searchBody.highlight = {
					fields: {
						name: { fragment_size: 150 },
						description: { fragment_size: 150 },
						searchableText: { fragment_size: 150 },
						// Поля для submissions
						submissionNumber: { fragment_size: 150 },
						userName: { fragment_size: 150 },
						formName: { fragment_size: 150 },
						notes: { fragment_size: 150 },
					},
					pre_tags: ['<mark>'],
					post_tags: ['</mark>'],
				}
			}

			const response = await this.client.search({
				index: this.indexName,
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
				bitrixId: hit._source.bitrixId, // Добавляем Bitrix ID в результаты
				score: hit._score,
				highlight: hit.highlight,
				// Поля для submissions
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
			logger.error('Search failed:', error)
			throw error
		}
	}

	/**
	 * Автодополнение
	 */
	async suggest(query: string, type?: string): Promise<string[]> {
		try {
			const suggestBody: any = {
				suggest: {
					name_suggest: {
						prefix: query,
						completion: {
							field: 'name.suggest',
							size: 10,
						},
					},
				},
			}

			if (type) {
				suggestBody.suggest.name_suggest.completion.contexts = {
					type: [type],
				}
			}

			const response = await this.client.search({
				index: this.indexName,
				body: suggestBody,
			})

			const suggestions = response.suggest.name_suggest[0] as any
			return suggestions.options.map((option: any) => option.text)
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
			return response.status === 'green' || response.status === 'yellow'
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
				index: this.indexName,
			})
			return response.indices[this.indexName]
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
}

export { ElasticsearchService }
export const elasticsearchService = new ElasticsearchService()
