import { elasticsearchService } from '../services/elasticsearchService'
import { logger } from '../utils/logger'

/**
 * Тест производительности поиска
 */
describe('Search Performance Tests', () => {
	beforeAll(async () => {
		// Инициализируем индекс перед тестами
		await elasticsearchService.initializeIndex()
	})

	afterAll(async () => {
		// Очищаем кэш после тестов
		elasticsearchService.clearSearchCache()
	})

	describe('Long Query Performance', () => {
		test('should handle long product names efficiently', async () => {
			const longQuery =
				'Бетон тяжелый класса В25 марки М350 на гранитном щебне фракции 5-20 мм с пластификатором'

			const startTime = Date.now()
			const results = await elasticsearchService.search({
				query: longQuery,
				type: 'product',
				limit: 20,
				fuzzy: true,
			})
			const endTime = Date.now()

			const executionTime = endTime - startTime

			logger.info(`Long query execution time: ${executionTime}ms`)
			logger.info(`Results count: ${results.length}`)

			// Проверяем, что поиск выполнился быстро (менее 2 секунд)
			expect(executionTime).toBeLessThan(2000)

			// Проверяем, что результаты релевантны
			if (results.length > 0) {
				expect(results[0].score).toBeGreaterThan(0.1)
			}
		}, 10000)

		test('should handle very long company names', async () => {
			const veryLongQuery =
				'Общество с ограниченной ответственностью "Строительная компания Бетон-Сервис" специализирующаяся на производстве и доставке бетонных смесей'

			const startTime = Date.now()
			const results = await elasticsearchService.search({
				query: veryLongQuery,
				type: 'company',
				limit: 20,
				fuzzy: true,
			})
			const endTime = Date.now()

			const executionTime = endTime - startTime

			logger.info(`Very long query execution time: ${executionTime}ms`)
			logger.info(`Results count: ${results.length}`)

			// Проверяем, что поиск выполнился быстро
			expect(executionTime).toBeLessThan(3000)
		}, 10000)
	})

	describe('Short Query Performance', () => {
		test('should handle short queries efficiently', async () => {
			const shortQuery = 'М300'

			const startTime = Date.now()
			const results = await elasticsearchService.search({
				query: shortQuery,
				type: 'product',
				limit: 20,
				fuzzy: true,
			})
			const endTime = Date.now()

			const executionTime = endTime - startTime

			logger.info(`Short query execution time: ${executionTime}ms`)
			logger.info(`Results count: ${results.length}`)

			// Короткие запросы должны выполняться очень быстро
			expect(executionTime).toBeLessThan(1000)
		}, 10000)
	})

	describe('Cache Performance', () => {
		test('should use cache for repeated queries', async () => {
			const query = 'Бетон М400'

			// Первый запрос (без кэша)
			const startTime1 = Date.now()
			const results1 = await elasticsearchService.search({
				query,
				type: 'product',
				limit: 20,
			})
			const endTime1 = Date.now()
			const executionTime1 = endTime1 - startTime1

			// Второй запрос (с кэшем)
			const startTime2 = Date.now()
			const results2 = await elasticsearchService.search({
				query,
				type: 'product',
				limit: 20,
			})
			const endTime2 = Date.now()
			const executionTime2 = endTime2 - startTime2

			logger.info(`First query execution time: ${executionTime1}ms`)
			logger.info(`Second query execution time: ${executionTime2}ms`)

			// Второй запрос должен быть значительно быстрее
			expect(executionTime2).toBeLessThan(executionTime1)
			expect(results1).toEqual(results2)
		}, 10000)
	})

	describe('Relevance Scoring', () => {
		test('should return relevant results with good scores', async () => {
			const query = 'бетон м300'

			const results = await elasticsearchService.search({
				query,
				type: 'product',
				limit: 10,
				fuzzy: true,
			})

			logger.info(`Query: ${query}`)
			logger.info(`Results count: ${results.length}`)

			if (results.length > 0) {
				// Проверяем, что результаты отсортированы по релевантности
				for (let i = 0; i < results.length - 1; i++) {
					expect(results[i].score).toBeGreaterThanOrEqual(results[i + 1].score)
				}

				// Проверяем, что лучший результат имеет высокий score
				expect(results[0].score).toBeGreaterThan(0.5)

				// Логируем топ-3 результата для анализа
				results.slice(0, 3).forEach((result, index) => {
					logger.info(
						`Result ${index + 1}: ${result.name} (score: ${result.score})`
					)
				})
			}
		}, 10000)
	})

	describe('Edge Cases', () => {
		test('should handle empty query', async () => {
			const results = await elasticsearchService.search({
				query: '',
				type: 'product',
				limit: 10,
			})

			// Пустой запрос должен возвращать все документы
			expect(Array.isArray(results)).toBe(true)
		}, 10000)

		test('should handle numeric queries', async () => {
			const numericQuery = '12345'

			const results = await elasticsearchService.search({
				query: numericQuery,
				type: 'company',
				limit: 10,
			})

			// Числовые запросы должны искать по bitrixId и inn
			expect(Array.isArray(results)).toBe(true)
		}, 10000)

		test('should handle special characters', async () => {
			const specialQuery = 'ООО "Бетон-Сервис" (Москва)'

			const results = await elasticsearchService.search({
				query: specialQuery,
				type: 'company',
				limit: 10,
			})

			expect(Array.isArray(results)).toBe(true)
		}, 10000)
	})
})
