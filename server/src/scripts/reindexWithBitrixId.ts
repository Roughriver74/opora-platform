#!/usr/bin/env ts-node

import { elasticsearchService } from '../services/elasticsearchService'
import { searchSyncService } from '../services/searchSyncService'
import { logger } from '../utils/logger'

/**
 * Скрипт для переиндексации данных с исправленными полями bitrixId и inn
 */
async function reindexWithBitrixId() {
	try {
		logger.info('🚀 Начинаем переиндексацию с исправленными полями...')

		// Инициализируем сервисы
		await searchSyncService.initialize()

		// Очищаем существующий индекс
		logger.info('🧹 Очищаем существующий индекс...')
		await elasticsearchService.clearIndex()

		// Переиндексируем все данные
		logger.info('📊 Переиндексируем данные...')
		const stats = await searchSyncService.syncAllData()

		logger.info('✅ Переиндексация завершена:', {
			totalProcessed: stats.totalProcessed,
			successful: stats.successful,
			failed: stats.failed,
			errors: stats.errors,
		})

		// Проверяем статистику индекса
		const indexStats = await elasticsearchService.getIndexStats()
		if (indexStats) {
			logger.info('📈 Статистика индекса:', {
				documents: indexStats.total?.docs?.count || 0,
				size: indexStats.total?.store?.size_in_bytes || 0,
			})
		}

		// Тестируем поиск
		logger.info('🔍 Тестируем поиск...')
		const testResults = await elasticsearchService.search({
			query: 'бетон',
			type: 'product',
			limit: 5,
		})

		logger.info(
			`✅ Найдено ${testResults.length} результатов для тестового запроса`
		)

		process.exit(0)
	} catch (error) {
		logger.error('❌ Ошибка при переиндексации:', error)
		process.exit(1)
	}
}

// Запускаем скрипт
if (require.main === module) {
	reindexWithBitrixId()
}

export { reindexWithBitrixId }
