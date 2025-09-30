#!/usr/bin/env ts-node

/**
 * Скрипт для переиндексации данных с улучшенными настройками поиска
 * Улучшает скоринг для точных совпадений марок бетона
 */

import { ElasticsearchService } from '../services/elasticsearchService'
import { logger } from '../utils/logger'

async function reindexWithImprovedScoring() {
	try {
		logger.info(
			'🚀 Начинаем переиндексацию с улучшенными настройками поиска...'
		)

		const elasticsearchService = new ElasticsearchService()

		// 1. Удаляем старый индекс
		logger.info('🗑️ Удаляем старый индекс...')
		try {
			await elasticsearchService.deleteIndex()
			logger.info('✅ Старый индекс удален')
		} catch (error) {
			logger.warn('⚠️ Индекс не существовал или уже удален')
		}

		// 2. Создаем новый индекс с улучшенными настройками
		logger.info('🏗️ Создаем новый индекс с улучшенными настройками...')
		await elasticsearchService.initializeIndex()
		logger.info('✅ Новый индекс создан')

		// 3. Синхронизируем все данные
		logger.info('🔄 Синхронизируем все данные...')
		await elasticsearchService.syncAllData()
		logger.info('✅ Данные синхронизированы')

		// 4. Проверяем здоровье индекса
		logger.info('🏥 Проверяем здоровье индекса...')
		const health = await elasticsearchService.getHealth()
		logger.info('📊 Здоровье индекса:', health)

		// 5. Тестируем поиск по маркам бетона
		logger.info('🧪 Тестируем поиск по маркам бетона...')

		const testQueries = ['В25', 'В30', 'М300', 'М400', 'марка В25']

		for (const query of testQueries) {
			logger.info(`🔍 Тестируем запрос: "${query}"`)
			const results = await elasticsearchService.search({
				query,
				type: 'product',
				limit: 5,
				includeHighlights: true,
			})

			logger.info(`📋 Результаты для "${query}":`, {
				count: results.length,
				topResults: results.slice(0, 3).map(r => ({
					name: r.name,
					score: r.score,
					type: r.type,
				})),
			})
		}

		logger.info('🎉 Переиндексация завершена успешно!')
		logger.info('📈 Улучшения:')
		logger.info('  - Увеличен boost для точных совпадений марок бетона')
		logger.info('  - Добавлены специальные синонимы для марок')
		logger.info('  - Исключены растворы из синонимов бетона')
		logger.info('  - Добавлена специальная логика для марок бетона')
		logger.info('  - Улучшен function_score для релевантности')
	} catch (error) {
		logger.error('❌ Ошибка при переиндексации:', error)
		process.exit(1)
	}
}

// Запускаем скрипт
if (require.main === module) {
	reindexWithImprovedScoring()
		.then(() => {
			logger.info('✅ Скрипт завершен успешно')
			process.exit(0)
		})
		.catch(error => {
			logger.error('❌ Скрипт завершен с ошибкой:', error)
			process.exit(1)
		})
}

export { reindexWithImprovedScoring }
