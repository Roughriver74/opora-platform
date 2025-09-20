#!/usr/bin/env ts-node

/**
 * Новый скрипт синхронизации Bitrix24 с Elasticsearch
 * Использует инкрементальную систему с alias swap pattern
 * Заменяет старый syncBitrixToElasticsearch.ts
 */

import dotenv from 'dotenv'
import { initializeDatabase } from '../database/config/database.config'
import { incrementalSyncService } from '../services/incrementalSyncService'
import { elasticsearchService } from '../services/elasticsearchService'
import { logger } from '../utils/logger'

// Загружаем переменные окружения
dotenv.config()

const syncBitrixToElasticsearchNew = async () => {
	logger.info(
		'🚀 Starting NEW Bitrix24 to Elasticsearch sync with incremental system...'
	)

	try {
		// 1. Инициализируем базу данных
		logger.info('🔧 Initializing database...')
		await initializeDatabase()
		logger.info('✅ Database initialized successfully')

		// 2. Инициализируем алиас Elasticsearch
		logger.info('🔧 Initializing Elasticsearch alias...')
		await elasticsearchService.initializeAlias()
		logger.info('✅ Elasticsearch alias initialized successfully')

		// 3. Выполняем полную инкрементальную синхронизацию
		logger.info('📦 Running full incremental sync...')
		const results = await incrementalSyncService.syncAllData({
			forceFullSync: true, // Полная синхронизация при первом запуске
			batchSize: 200,
			maxAgeHours: 24,
		})

		// 4. Подсчитываем общую статистику
		const totalProcessed = results.reduce((sum, r) => sum + r.totalProcessed, 0)
		const totalSuccessful = results.reduce((sum, r) => sum + r.successful, 0)
		const totalFailed = results.reduce((sum, r) => sum + r.failed, 0)
		const allErrors = results.flatMap(r => r.errors)

		logger.info('✅ NEW Bitrix24 to Elasticsearch sync completed successfully')
		logger.info(
			`📊 Summary: ${totalSuccessful}/${totalProcessed} records processed successfully`
		)

		if (totalFailed > 0) {
			logger.warn(`⚠️ ${totalFailed} records failed to process`)
		}

		if (allErrors.length > 0) {
			logger.warn('⚠️ Errors encountered:', allErrors)
		}

		// 5. Выводим детальную статистику
		console.log('\n📊 Детальная статистика синхронизации:')
		results.forEach(result => {
			console.log(
				`  ${result.entityType}: ${result.successful}/${result.totalProcessed} записей`
			)
			if (result.failed > 0) {
				console.log(`    ⚠️ Ошибок: ${result.failed}`)
			}
			console.log(`    ⏱️ Время: ${result.duration}ms`)
		})

		console.log(`\n🎉 Синхронизация завершена успешно!`)
		console.log(`📈 Всего обработано: ${totalProcessed} записей`)
		console.log(`✅ Успешно: ${totalSuccessful} записей`)
		if (totalFailed > 0) {
			console.log(`❌ Ошибок: ${totalFailed} записей`)
		}
	} catch (error: any) {
		logger.error('❌ NEW Bitrix24 to Elasticsearch sync failed:', error)
		console.error('❌ Критическая ошибка при синхронизации:', error.message)
		process.exit(1)
	}
}

// Запускаем синхронизацию если скрипт вызван напрямую
if (require.main === module) {
	syncBitrixToElasticsearchNew()
		.then(() => {
			logger.info('🎉 Script completed successfully')
			process.exit(0)
		})
		.catch(error => {
			logger.error('❌ Script failed:', error)
			process.exit(1)
		})
}

export { syncBitrixToElasticsearchNew }
