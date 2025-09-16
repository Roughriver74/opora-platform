import { elasticsearchService } from '../services/elasticsearchService'
import { searchSyncService } from '../services/searchSyncService'
import { logger } from '../utils/logger'

/**
 * Скрипт для тестирования Elasticsearch
 */
async function testElasticsearch() {
	try {
		console.log('🧪 Testing Elasticsearch integration...')

		// 1. Инициализация
		console.log('\n1. Initializing Elasticsearch...')
		await searchSyncService.initialize()
		console.log('✅ Elasticsearch initialized')

		// 2. Проверка здоровья
		console.log('\n2. Health check...')
		const isHealthy = await elasticsearchService.healthCheck()
		console.log(`✅ Elasticsearch is ${isHealthy ? 'healthy' : 'unhealthy'}`)

		// 3. Получение статистики
		console.log('\n3. Getting index stats...')
		const stats = await elasticsearchService.getIndexStats()
		if (stats) {
			const docCount = stats.total?.docs?.count || 0
			console.log(`📊 Index contains ${docCount} documents`)
		}

		// 4. Тестовый поиск
		console.log('\n4. Testing search...')
		const searchResults = await elasticsearchService.search({
			query: 'тест',
			limit: 5,
		})
		console.log(`🔍 Found ${searchResults.length} results`)

		// 5. Тестовое автодополнение
		console.log('\n5. Testing suggestions...')
		const suggestions = await elasticsearchService.suggest('тест')
		console.log(`💡 Got ${suggestions.length} suggestions:`, suggestions)

		// 6. Агрегации
		console.log('\n6. Testing aggregations...')
		const aggregations = await elasticsearchService.getTypeAggregations()
		console.log('📈 Type aggregations:', aggregations)

		console.log('\n✅ All tests completed successfully!')
	} catch (error) {
		console.error('❌ Test failed:', error)
		process.exit(1)
	}
}

// Запуск тестов
if (require.main === module) {
	testElasticsearch()
		.then(() => process.exit(0))
		.catch(error => {
			console.error('Test failed:', error)
			process.exit(1)
		})
}

export { testElasticsearch }
