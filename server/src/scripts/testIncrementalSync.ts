#!/usr/bin/env ts-node

import { incrementalSyncService } from '../services/incrementalSyncService'
import { syncMetadataService } from '../services/syncMetadataService'
import { elasticsearchService } from '../services/elasticsearchService'
import { logger } from '../utils/logger'
import { AppDataSource } from '../database/config/database.config'

/**
 * Скрипт для тестирования инкрементальной синхронизации
 */
async function testIncrementalSync() {
	try {
		logger.info('🚀 Начинаем тестирование инкрементальной синхронизации...')

		// Инициализируем базу данных
		await AppDataSource.initialize()
		logger.info('✅ База данных инициализирована')

		// Инициализируем алиас Elasticsearch
		await elasticsearchService.initializeAlias()
		logger.info('✅ Алиас Elasticsearch инициализирован')

		// Тестируем синхронизацию продуктов
		logger.info('📦 Тестируем синхронизацию продуктов...')
		const productsResult = await incrementalSyncService.syncProducts({
			forceFullSync: true,
			batchSize: 50,
		})
		logger.info('✅ Синхронизация продуктов завершена:', productsResult)

		// Тестируем синхронизацию компаний
		logger.info('🏢 Тестируем синхронизацию компаний...')
		const companiesResult = await incrementalSyncService.syncCompanies({
			forceFullSync: true,
			batchSize: 50,
		})
		logger.info('✅ Синхронизация компаний завершена:', companiesResult)

		// Тестируем синхронизацию заявок
		logger.info('📋 Тестируем синхронизацию заявок...')
		const submissionsResult = await incrementalSyncService.syncSubmissions({
			forceFullSync: true,
			batchSize: 50,
		})
		logger.info('✅ Синхронизация заявок завершена:', submissionsResult)

		// Обновляем индекс для поиска
		await elasticsearchService.refreshIndex()
		logger.info('✅ Индекс обновлен для поиска')

		// Получаем статистику индекса
		const indexStats = await elasticsearchService.getIndexStats()
		if (indexStats) {
			logger.info('📈 Статистика индекса:', {
				documents: indexStats.total?.docs?.count || 0,
				size: indexStats.total?.store?.size_in_bytes || 0,
			})
		}

		// Получаем метаданные синхронизации
		const allMetadata = await syncMetadataService.getAllMetadata()
		logger.info('📊 Метаданные синхронизации:', allMetadata)

		// Тестируем поиск
		logger.info('🔍 Тестируем поиск...')
		const testResults = await elasticsearchService.search({
			query: 'тест',
			type: 'product',
			limit: 5,
		})

		logger.info(
			`✅ Найдено ${testResults.length} результатов для тестового запроса`
		)

		logger.info(
			'🎉 Тестирование инкрементальной синхронизации завершено успешно!'
		)

		process.exit(0)
	} catch (error) {
		logger.error(
			'❌ Ошибка при тестировании инкрементальной синхронизации:',
			error
		)
		process.exit(1)
	}
}

// Запускаем скрипт
if (require.main === module) {
	testIncrementalSync()
}

